import { GameState, Player, Vector2, Rarity } from '../../types';
import { fireShot, triggerPlayerAbility } from '../../core/gameEngine';
import { distance, normalize, isInsideCircle, clamp, randomInRange } from '../../utils';
import { computeAimPoint, canFire } from '../weapons';
import {
  BOT_SPEED,
  BOT_AGGRO_RANGE,
  BOT_SHOOT_RANGE,
  BOT_LOOT_RANGE,
  BOT_RELAY_SEEK_RANGE,
  BOT_SUPPLY_SEEK_RANGE,
  BOT_CORE_SEEK_RANGE,
  BOT_STRAFE_SPEED,
  DECOY_BOT_AGGRO_RANGE,
  TICK_RATE_MS,
} from '../../core/balance';

const RARITY_ORDER: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

// Per-bot mutable state (intentionally outside pure game state — AI is ephemeral)
type BotBrain = {
  lastFireTimeMs: number;
  wanderTarget: Vector2 | null;
  wanderTimer: number; // ms until picking a new wander target
  reloadEndMs: number; // timestamp when active weapon reload completes (0 = not reloading)
  strafeDir: 1 | -1;   // current strafe direction during combat (flips periodically)
  strafeSwitchMs: number; // timestamp to flip strafe direction
};

const botBrains = new Map<string, BotBrain>();

function getBrain(botId: string): BotBrain {
  if (!botBrains.has(botId)) {
    botBrains.set(botId, {
      lastFireTimeMs: 0,
      wanderTarget: null,
      wanderTimer: 0,
      reloadEndMs: 0,
      strafeDir: 1,
      strafeSwitchMs: 0,
    });
  }
  return botBrains.get(botId)!;
}

export function clearBotBrains(): void {
  botBrains.clear();
}

// Tick all bots. Returns updated GameState.
export function tickBots(state: GameState, deltaMs: number): GameState {
  const now = Date.now();
  let next = state;

  for (const bot of state.players) {
    if (bot.isHuman || bot.status !== 'alive') {
      continue;
    }
    next = tickSingleBot(next, bot.id, now, deltaMs);
  }

  return next;
}

function tickBotReload(state: GameState, bot: Player, brain: BotBrain, nowMs: number): GameState {
  const weapon = bot.weapons[bot.activeWeaponSlot];
  if (!weapon || weapon.type === 'pickaxe' || !isFinite(weapon.magazineSize)) return state;

  if (brain.reloadEndMs > 0 && nowMs >= brain.reloadEndMs) {
    // Reload complete — refill magazine
    brain.reloadEndMs = 0;
    const weapons = [...bot.weapons] as Player['weapons'];
    weapons[bot.activeWeaponSlot] = { ...weapon, currentAmmo: weapon.magazineSize, isReloading: false, reloadStartMs: 0 };
    return { ...state, players: state.players.map((p) => (p.id === bot.id ? { ...p, weapons } : p)) };
  }

  if (weapon.currentAmmo === 0 && !weapon.isReloading && brain.reloadEndMs === 0) {
    // Start reload
    brain.reloadEndMs = nowMs + Math.round(weapon.reloadTime * bot.reloadMult);
    const weapons = [...bot.weapons] as Player['weapons'];
    weapons[bot.activeWeaponSlot] = { ...weapon, isReloading: true, reloadStartMs: nowMs };
    return { ...state, players: state.players.map((p) => (p.id === bot.id ? { ...p, weapons } : p)) };
  }

  return state;
}

function tickSingleBot(state: GameState, botId: string, nowMs: number, deltaMs: number): GameState {
  const bot = state.players.find((p) => p.id === botId);
  if (!bot || bot.status !== 'alive') {
    return state;
  }

  const brain = getBrain(botId);

  // Advance weapon reload before any other decisions
  const reloadedState = tickBotReload(state, bot, brain, nowMs);
  const reloadedBot = reloadedState.players.find((p) => p.id === botId) ?? bot;

  const nearestEnemy = findNearestEnemy(reloadedBot, reloadedState.players);

  // Priority 1: get inside the shelter zone if outside during bombardment
  if (
    !isInsideCircle(reloadedBot.position, reloadedState.bombardment.shelterCenter, reloadedState.bombardment.shelterRadius)
  ) {
    return moveBot(reloadedState, reloadedBot, reloadedState.bombardment.shelterCenter, deltaMs);
  }

  // Priority 1.5: Vex decoy — bots are fooled by decoys (they're not the owner's)
  const nearDecoy = reloadedState.decoys.find(
    (d) => d.ownerId !== botId && distance(reloadedBot.position, d.position) < DECOY_BOT_AGGRO_RANGE,
  );
  if (nearDecoy) {
    const dist = distance(reloadedBot.position, nearDecoy.position);
    let updatedState = dist < BOT_SHOOT_RANGE
      ? moveBotStrafe(reloadedState, reloadedBot, nearDecoy.position, brain.strafeDir, deltaMs)
      : moveBot(reloadedState, reloadedBot, nearDecoy.position, deltaMs);
    const weapon = reloadedBot.weapons[reloadedBot.activeWeaponSlot];
    if (weapon && dist < BOT_SHOOT_RANGE && canFire(weapon, brain.lastFireTimeMs, nowMs)) {
      brain.lastFireTimeMs = nowMs;
      updatedState = fireShot(updatedState, botId, nearDecoy.position);
    }
    return updatedState;
  }

  // Priority 2: engage enemy if in range
  if (nearestEnemy && distance(reloadedBot.position, nearestEnemy.position) < BOT_AGGRO_RANGE) {
    // Trigger ability when engaging and it's off cooldown
    let workState = reloadedState;
    let workBot = reloadedBot;
    if (reloadedBot.abilityChargeMs === 0) {
      workState = triggerPlayerAbility(reloadedState, botId);
      workBot = workState.players.find((p) => p.id === botId) ?? reloadedBot;
    }

    // Pick the best weapon for the current engagement range
    const dist = distance(workBot.position, nearestEnemy.position);
    const bestSlot = selectBestWeaponSlot(workBot, dist);
    if (bestSlot !== workBot.activeWeaponSlot) {
      workState = setBotWeaponSlot(workState, botId, bestSlot);
      workBot = workState.players.find((p) => p.id === botId) ?? workBot;
    }

    // Strafe perpendicular to the enemy while in shoot range
    let updatedState = workState;
    if (dist < BOT_SHOOT_RANGE) {
      // Flip strafe direction every 1-2 seconds
      if (nowMs >= brain.strafeSwitchMs) {
        brain.strafeDir = brain.strafeDir === 1 ? -1 : 1;
        brain.strafeSwitchMs = nowMs + randomInRange(1000, 2000);
      }
      updatedState = moveBotStrafe(workState, workBot, nearestEnemy.position, brain.strafeDir, deltaMs);
    } else {
      updatedState = moveBot(workState, workBot, nearestEnemy.position, deltaMs);
    }

    const weapon = workBot.weapons[workBot.activeWeaponSlot];
    if (weapon && dist < BOT_SHOOT_RANGE) {
      if (canFire(weapon, brain.lastFireTimeMs, nowMs)) {
        brain.lastFireTimeMs = nowMs;
        const aimPoint = computeAimPoint(workBot.position, nearestEnemy.position, weapon);
        updatedState = fireShot(updatedState, botId, aimPoint);
      }
    }
    return updatedState;
  }

  // Priority 3: pick up nearby loot
  const nearLoot = reloadedState.lootDrops.find(
    (l) => distance(reloadedBot.position, l.position) < BOT_LOOT_RANGE,
  );
  if (nearLoot) {
    return pickUpLootForBot(reloadedState, reloadedBot, nearLoot.id);
  }

  // Priority 4: route toward a landed supply drop within seek range
  const nearSupply = reloadedState.supplyDrops.find(
    (d) => d.isLanded && distance(reloadedBot.position, d.position) < BOT_SUPPLY_SEEK_RANGE,
  );
  if (nearSupply) {
    return moveBot(reloadedState, reloadedBot, nearSupply.position, deltaMs);
  }

  // Priority 5: grab a nearby Fracture Core (only if not already carrying one — corruption stacks badly)
  if (!reloadedBot.heldCoreEffect) {
    const nearCore = reloadedState.fractureCores.find(
      (c) => distance(reloadedBot.position, c.position) < BOT_CORE_SEEK_RANGE,
    );
    if (nearCore) {
      return moveBot(reloadedState, reloadedBot, nearCore.position, deltaMs);
    }
  }

  // Priority 6: capture a nearby uncaptured Helix Relay
  const nearRelay = reloadedState.helixRelays.find(
    (r) => r.captureProgress < 1 && distance(reloadedBot.position, r.position) < BOT_RELAY_SEEK_RANGE,
  );
  if (nearRelay) {
    return moveBot(reloadedState, reloadedBot, nearRelay.position, deltaMs);
  }

  // Priority 7: wander
  brain.wanderTimer -= deltaMs;
  if (!brain.wanderTarget || brain.wanderTimer <= 0) {
    brain.wanderTarget = {
      x: clamp(reloadedBot.position.x + randomInRange(-200, 200), 50, reloadedState.mapWidth - 50),
      y: clamp(reloadedBot.position.y + randomInRange(-200, 200), 50, reloadedState.mapHeight - 50),
    };
    brain.wanderTimer = randomInRange(2000, 6000);
  }

  return moveBot(reloadedState, reloadedBot, brain.wanderTarget, deltaMs);
}

function moveBot(state: GameState, bot: Player, target: Vector2, deltaMs: number): GameState {
  const dir = normalize({
    x: target.x - bot.position.x,
    y: target.y - bot.position.y,
  });
  const speed = BOT_SPEED * bot.speedMult * (deltaMs / TICK_RATE_MS);
  const dist = distance(bot.position, target);

  if (dist < speed) {
    // Already at target — don't overshoot
    return updateBotPosition(state, bot.id, target, 0);
  }

  const newPos: Vector2 = {
    x: clamp(bot.position.x + dir.x * speed, 0, state.mapWidth),
    y: clamp(bot.position.y + dir.y * speed, 0, state.mapHeight),
  };
  const rotation = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
  return updateBotPosition(state, bot.id, newPos, rotation);
}

// Move bot sideways relative to the enemy direction — perpendicular strafe.
function moveBotStrafe(
  state: GameState,
  bot: Player,
  enemyPos: Vector2,
  strafeDir: 1 | -1,
  deltaMs: number,
): GameState {
  const toEnemy = normalize({ x: enemyPos.x - bot.position.x, y: enemyPos.y - bot.position.y });
  // Perpendicular vector: rotate 90° in strafeDir direction
  const perp: Vector2 = { x: -toEnemy.y * strafeDir, y: toEnemy.x * strafeDir };
  const strafeSpeed = BOT_STRAFE_SPEED * bot.speedMult * (deltaMs / TICK_RATE_MS);
  const newPos: Vector2 = {
    x: clamp(bot.position.x + perp.x * strafeSpeed, 0, state.mapWidth),
    y: clamp(bot.position.y + perp.y * strafeSpeed, 0, state.mapHeight),
  };
  const rotation = Math.atan2(toEnemy.y, toEnemy.x) * (180 / Math.PI);
  return updateBotPosition(state, bot.id, newPos, rotation);
}

function updateBotPosition(
  state: GameState,
  botId: string,
  pos: Vector2,
  rotation: number,
): GameState {
  const players = state.players.map((p) =>
    p.id === botId ? { ...p, position: pos, rotation } : p,
  );
  return { ...state, players };
}

// Assign a weapon slot appropriate for the engagement distance.
// Close range prefers shotguns/SMGs; far range prefers snipers; mid defaults to highest DPS.
function selectBestWeaponSlot(bot: Player, distToEnemy: number): 0 | 1 | 2 {
  const CLOSE_TYPES = new Set(['shotgun', 'tactical_shotgun', 'heavy_shotgun', 'drum_shotgun', 'smg', 'compact_smg', 'suppressed_smg', 'pickaxe']);
  const FAR_TYPES   = new Set(['sniper', 'semi_sniper', 'heavy_sniper', 'hunting_rifle', 'marksman_rifle', 'rail_gun', 'thermal_ar']);

  const candidates = bot.weapons
    .map((w, i) => ({ w, i: i as 0 | 1 | 2 }))
    .filter(({ w }) => w !== null && w.type !== 'pickaxe' && !w.isReloading && w.currentAmmo > 0);

  if (candidates.length === 0) return bot.activeWeaponSlot;

  if (distToEnemy < 140) {
    const close = candidates.find(({ w }) => CLOSE_TYPES.has(w!.type));
    if (close) return close.i;
  } else if (distToEnemy > 350) {
    const far = candidates.find(({ w }) => FAR_TYPES.has(w!.type));
    if (far) return far.i;
  }

  // Mid-range or fallback: highest DPS
  return candidates.reduce((best, cur) => {
    const dpsB = best.w!.damage * best.w!.fireRate;
    const dpsC = cur.w!.damage * cur.w!.fireRate;
    return dpsC > dpsB ? cur : best;
  }).i;
}

function setBotWeaponSlot(state: GameState, botId: string, slot: 0 | 1 | 2): GameState {
  const players = state.players.map((p) =>
    p.id === botId ? { ...p, activeWeaponSlot: slot } : p,
  );
  return { ...state, players };
}

function findNearestEnemy(bot: Player, players: Player[]): Player | null {
  let nearest: Player | null = null;
  let minDist = Infinity;

  for (const p of players) {
    if (p.id === bot.id || p.status !== 'alive') {
      continue;
    }
    const d = distance(bot.position, p.position);
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  return nearest;
}

function pickUpLootForBot(state: GameState, bot: Player, lootId: string): GameState {
  const loot = state.lootDrops.find((l) => l.id === lootId);
  if (!loot) {
    return state;
  }

  let updatedBot = { ...bot };

  if (loot.weapon) {
    const emptySlot = updatedBot.weapons.findIndex((w, i) => i > 0 && w === null) as 0 | 1 | 2 | -1;
    if (emptySlot !== -1) {
      const weapons = [...updatedBot.weapons] as Player['weapons'];
      weapons[emptySlot] = loot.weapon;
      updatedBot = { ...updatedBot, weapons };
    }
  }

  if (loot.gear) {
    const { slot } = loot.gear;
    const oldGear = updatedBot.gear[slot];
    // Bots equip gear directly without complex diff logic — just take the upgrade
    if (!oldGear || RARITY_ORDER[loot.gear.rarity] > RARITY_ORDER[oldGear.rarity]) {
      if (oldGear) {
        // Remove old gear delta
        updatedBot = {
          ...updatedBot,
          maxHealth:        updatedBot.maxHealth - oldGear.healthBonus,
          maxShield:        updatedBot.maxShield - oldGear.shieldBonus,
          damageResistance: Math.max(0, updatedBot.damageResistance - oldGear.resistanceBonus),
          speedMult:        Math.max(0.1, updatedBot.speedMult  - oldGear.speedBonus),
          damageMult:       Math.max(0.1, updatedBot.damageMult - oldGear.damageBonus),
          reloadMult:       Math.max(0.1, updatedBot.reloadMult - oldGear.reloadBonus),
        };
      }
      updatedBot = {
        ...updatedBot,
        maxHealth:        updatedBot.maxHealth + loot.gear.healthBonus,
        maxShield:        updatedBot.maxShield + loot.gear.shieldBonus,
        damageResistance: Math.min(0.75, updatedBot.damageResistance + loot.gear.resistanceBonus),
        speedMult:        updatedBot.speedMult  + loot.gear.speedBonus,
        damageMult:       updatedBot.damageMult + loot.gear.damageBonus,
        reloadMult:       Math.max(0.1, updatedBot.reloadMult + loot.gear.reloadBonus),
        gear:             { ...updatedBot.gear, [slot]: loot.gear },
      };
    }
  }

  updatedBot = {
    ...updatedBot,
    shield: Math.min(updatedBot.maxShield, updatedBot.shield + loot.shield),
    health: Math.min(updatedBot.maxHealth, updatedBot.health + loot.health),
    materials: {
      wood: updatedBot.materials.wood + loot.materials.wood,
      stone: updatedBot.materials.stone + loot.materials.stone,
      metal: updatedBot.materials.metal + loot.materials.metal,
    },
  };

  const players = state.players.map((p) => (p.id === bot.id ? updatedBot : p));
  const lootDrops = state.lootDrops.filter((l) => l.id !== lootId);
  return { ...state, players, lootDrops };
}
