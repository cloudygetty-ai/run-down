import {
  GameState,
  Player,
  MeteorImpact,
  Vector2,
  FractureCore,
  FractureCoreEffect,
  GravityZone,
  TimeEchoZone,
  HelixRelay,
  SupplyDrop,
  WeaponType,
  Rarity,
  KillFeedEntry,
  GearSlot,
} from '../../types';
import { tickBombardment, tickIncomingMeteors } from '../meteor';
import { resolvePlayerWallCollision, isPlayerHitByBullet, checkBulletHit } from '../physics';
import {
  distance,
  clamp,
  normalize,
  randomInRange,
  randomInt,
  makeGear,
  applyGearDelta,
  isInsideCircle,
} from '../../utils';
import { logger } from '../../utils';
import { getCharacter } from '../characters';
import {
  TICK_RATE_MS,
  PLAYER_SPEED,
  FRACTURE_CORE_PICKUP_RANGE,
  FRACTURE_CORE_DAMAGE_AMP,
  FRACTURE_CORE_CDR_CHARGE_RATE,
  JAX_HP_DRAIN_DPS,
  ABILITY_DAMAGE_BOOST_MULT,
  HELIX_RELAY_CAPTURE_RATE,
  HELIX_RELAY_DECAY_RATE,
  HELIX_RELAY_REWARD_LOOT_RADIUS,
  SUPPLY_DROP_INTERVAL_MS,
  SUPPLY_DROP_LAND_DELAY_MS,
  SUPPLY_DROP_PICKUP_RADIUS,
  BOUNTY_KILL_THRESHOLD,
  QUIP_DISPLAY_MS,
  ECHO_ZONE_CHARGE_RATE_MULT,
  ECHO_ZONE_SPEED_MULT,
  ECHO_ZONE_RADIUS,
  ECHO_ZONE_MAX_AGE_MS,
  GRAVITY_ZONE_SPEED_MULT,
  GRAVITY_ZONE_RADIUS,
  GRAVITY_ZONE_PULL_STRENGTH,
  GRAVITY_ZONE_MAX_AGE_MS,
  ABILITY_SPEED_BOOST_MULT,
  KNOCKED_TIMER_MS,
  KILL_FEED_TTL_MS,
  KILL_FEED_MAX,
  SHIELD_REGEN_DELAY_MS,
  SHIELD_REGEN_RATE,
} from '../balance';

export type InputState = {
  moveVector: Vector2; // normalized joystick direction (-1..1 on each axis)
  aimVector: Vector2; // direction the player is aiming
  isShooting: boolean;
  isBuilding: boolean;
  buildPieceType: 'wall' | 'floor' | 'ramp';
  buildPosition: Vector2 | null;
  wantsReload: boolean;
};

// Trigger a player's active ability. Works for both human and bot players.
// WHY: pure function so bots and the store can both call it without coupling.
export function triggerPlayerAbility(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;
  const player = state.players[playerIndex];
  if (player.status !== 'alive' || player.abilityChargeMs > 0) return state;

  const character = getCharacter(player.characterId);
  const { ability } = character;
  let updated = { ...player, abilityChargeMs: ability.cooldownMs };

  if (ability.durationMs === 0) {
    // Instant effects
    switch (character.id) {
      case 'vex': {
        const rad = (player.rotation * Math.PI) / 180;
        updated = {
          ...updated,
          position: {
            x: clamp(player.position.x + Math.cos(rad) * 250, 0, state.mapWidth),
            y: clamp(player.position.y + Math.sin(rad) * 250, 0, state.mapHeight),
          },
        };
        break;
      }
      case 'voss':
        updated = { ...updated, health: Math.min(updated.maxHealth, updated.health + 80) };
        break;
      case 'orin':
        updated = {
          ...updated,
          materials: {
            wood: updated.materials.wood + 100,
            stone: updated.materials.stone + 100,
            metal: updated.materials.metal + 100,
          },
        };
        break;
      default:
        break;
    }
  } else {
    // Timed effects
    updated = {
      ...updated,
      abilityActiveMs: ability.durationMs,
      activeAbilityEffect: ability.effectType,
    };
    // Per-character activation bonuses on top of the timed effect
    if (character.id === 'nyra') {
      updated = { ...updated, health: Math.min(updated.maxHealth, updated.health + 60) };
    }
    if (character.id === 'talon') {
      const rad = (player.rotation * Math.PI) / 180;
      updated = {
        ...updated,
        position: {
          x: clamp(player.position.x + Math.cos(rad) * 200, 0, state.mapWidth),
          y: clamp(player.position.y + Math.sin(rad) * 200, 0, state.mapHeight),
        },
      };
    }
  }

  const players = [...state.players];
  players[playerIndex] = updated;
  return { ...state, players };
}

// Pure tick function — takes current state + input and returns new state.
// WHY: keeping this pure makes it trivially testable without mocks.
export function tickGame(state: GameState, humanInput: InputState, deltaMs: number): GameState {
  if (state.phase !== 'playing') {
    return state;
  }

  try {
    let next = {
      ...state,
      players: [...state.players],
      buildPieces: [...state.buildPieces],
    };

    next = tickAbilityTimers(next, deltaMs);
    next = tickShieldRegen(next, deltaMs);
    next = tickEnvironmentHazard(next, deltaMs);
    next = tickKnockedPlayers(next, deltaMs);
    next = tickKillFeed(next, deltaMs);
    next = tickFractureCores(next, deltaMs);
    next = tickGravityZones(next, deltaMs);
    next = tickTimeEchoZones(next, deltaMs);
    next = tickHelixRelays(next, deltaMs);
    next = tickSupplyDrops(next, deltaMs);
    next = tickQuip(next, deltaMs);
    next = moveHumanPlayer(next, humanInput, deltaMs);

    // Tick incoming warning meteors — graduate those that reach 0 into real impacts
    const { stillPending, newImpacts: graduatedImpacts } = tickIncomingMeteors(
      next.incomingMeteors,
      deltaMs,
    );
    next = { ...next, incomingMeteors: stillPending };

    // Tick the bombardment — spawns new IncomingMeteors (not yet landed)
    const { bombardment, newIncoming } = tickBombardment(
      next.bombardment,
      deltaMs,
      next.mapWidth,
      next.mapHeight,
    );
    next = {
      ...next,
      bombardment,
      incomingMeteors: [...next.incomingMeteors, ...newIncoming],
    };

    // Add graduated impacts to the visual crater list
    next = {
      ...next,
      bombardment: {
        ...next.bombardment,
        activeImpacts: [...next.bombardment.activeImpacts, ...graduatedImpacts],
      },
    };

    next = applyMeteorDamage(next, graduatedImpacts);
    next = spawnMeteorEffects(next, graduatedImpacts);
    next = triggerMeteorQuip(next, graduatedImpacts);

    next = updateBounty(next);
    next = { ...next, tickCount: next.tickCount + 1 };
    next = checkWinCondition(next);

    return next;
  } catch (err) {
    // WHY: the game loop must never crash — log and return unchanged state
    logger.error('GameEngine', 'tick error', err);
    return state;
  }
}

// Apply per-environment outside-zone DPS to alive players standing in the danger area.
// WHY: Ashfall Crater has acid ash that burns players who linger outside the shelter.
function tickEnvironmentHazard(state: GameState, deltaMs: number): GameState {
  if (state.outsideZoneDps <= 0) return state;
  const hpLoss = state.outsideZoneDps * (deltaMs / 1000);
  let changed = false;
  const players = state.players.map((p) => {
    if (p.status !== 'alive') return p;
    if (isInsideCircle(p.position, state.bombardment.shelterCenter, state.bombardment.shelterRadius)) return p;
    const newHealth = Math.max(0, p.health - hpLoss);
    changed = true;
    if (newHealth <= 0) {
      return { ...p, health: 0, status: 'knocked' as const, knockedTimerMs: KNOCKED_TIMER_MS, shieldRegenDelayMs: SHIELD_REGEN_DELAY_MS };
    }
    return { ...p, health: newHealth, shieldRegenDelayMs: SHIELD_REGEN_DELAY_MS };
  });
  return changed ? { ...state, players } : state;
}

// Auto-eliminate knocked players whose bleed-out timer expires.
function tickKnockedPlayers(state: GameState, deltaMs: number): GameState {
  let players = [...state.players];
  let { killFeed, lootDrops } = state;
  let changed = false;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (p.status !== 'knocked') continue;

    const newTimer = p.knockedTimerMs - deltaMs;
    if (newTimer <= 0) {
      const entry: KillFeedEntry = {
        id: `kf_bleed_${state.tickCount}_${i}`,
        killerName: 'Storm',
        victimName: p.name,
        ttlMs: KILL_FEED_TTL_MS,
      };
      killFeed = [entry, ...killFeed].slice(0, KILL_FEED_MAX);

      // Drop weapons on auto-eliminate
      p.weapons.forEach((w, slot) => {
        if (!w || w.type === 'pickaxe') return;
        lootDrops = [
          ...lootDrops,
          {
            id: `bleed_loot_${p.id}_s${slot}_${state.tickCount}`,
            position: { x: p.position.x + (slot - 1) * 18, y: p.position.y + (slot - 1) * 18 },
            weapon: { ...w, currentAmmo: w.magazineSize },
            gear: null,
            ammo: 0,
            materials: { wood: 0, stone: 0, metal: 0 },
            shield: 0,
            health: 0,
          },
        ];
      });

      players[i] = { ...p, status: 'eliminated', knockedTimerMs: 0 };
      changed = true;
    } else {
      players[i] = { ...p, knockedTimerMs: newTimer };
      changed = true;
    }
  }

  if (!changed) return state;
  return { ...state, players, killFeed, lootDrops };
}

// Regen shield for players who haven't taken damage in SHIELD_REGEN_DELAY_MS.
function tickShieldRegen(state: GameState, deltaMs: number): GameState {
  const regenPerTick = SHIELD_REGEN_RATE * (deltaMs / 1000);
  let changed = false;
  const players = state.players.map((p) => {
    if (p.status !== 'alive' || p.maxShield === 0) return p;
    if (p.shieldRegenDelayMs > 0) {
      changed = true;
      return { ...p, shieldRegenDelayMs: Math.max(0, p.shieldRegenDelayMs - deltaMs) };
    }
    if (p.shield < p.maxShield) {
      changed = true;
      return { ...p, shield: Math.min(p.maxShield, p.shield + regenPerTick) };
    }
    return p;
  });
  return changed ? { ...state, players } : state;
}

// Age kill feed entries; remove expired ones.
function tickKillFeed(state: GameState, deltaMs: number): GameState {
  if (state.killFeed.length === 0) return state;
  const killFeed = state.killFeed
    .map((e) => ({ ...e, ttlMs: e.ttlMs - deltaMs }))
    .filter((e) => e.ttlMs > 0);
  return { ...state, killFeed };
}

// Tick down ability cooldown and active-effect timers for every player.
// Also applies Jax's HP drain, CDR acceleration, and Echo Zone ability stutter.
function tickAbilityTimers(state: GameState, deltaMs: number): GameState {
  const players = state.players.map((p) => {
    let updated = { ...p };

    if (updated.abilityChargeMs > 0) {
      const inEchoZone = state.timeEchoZones.some(
        (z) => distance(updated.position, z.position) <= z.radius,
      );
      // CDR core charges 2× faster; Echo Zone halves charge rate (stutter effect)
      const chargeRate =
        (updated.heldCoreEffect === 'cooldown_reduction' ? FRACTURE_CORE_CDR_CHARGE_RATE : 1) *
        (inEchoZone ? ECHO_ZONE_CHARGE_RATE_MULT : 1);
      updated = {
        ...updated,
        abilityChargeMs: Math.max(0, updated.abilityChargeMs - deltaMs * chargeRate),
      };
    }

    if (updated.abilityActiveMs > 0) {
      const remaining = Math.max(0, updated.abilityActiveMs - deltaMs);
      updated = {
        ...updated,
        abilityActiveMs: remaining,
        activeAbilityEffect: remaining > 0 ? updated.activeAbilityEffect : 'none',
      };

      // WHY: Jax's Adrenal Override uniquely drains HP during the active window
      const character = getCharacter(updated.characterId);
      if (character.id === 'jax' && updated.abilityActiveMs > 0 && updated.status === 'alive') {
        const drain = (JAX_HP_DRAIN_DPS / 1000) * deltaMs;
        const newHp = Math.max(1, updated.health - drain); // floor at 1 — can't self-eliminate
        updated = { ...updated, health: newHp };
      }
    }

    return updated;
  });

  return { ...state, players };
}

// Auto-pick up nearby Fracture Cores and apply their corruption drain each tick.
// Anti-stacking rule: a player can only hold ONE core at a time.
function tickFractureCores(state: GameState, deltaMs: number): GameState {
  let fractureCores = [...state.fractureCores];

  const players = state.players.map((p) => {
    if (p.status !== 'alive') {
      return p;
    }

    let updated = { ...p };

    // Apply ongoing corruption drain to anyone already holding a core
    if (updated.corruptionDps > 0) {
      const drain = (updated.corruptionDps / 1000) * deltaMs;
      updated = { ...updated, health: Math.max(1, updated.health - drain) };
    }

    // WHY: one core per player — holding multiple would make corruption unbalanceable.
    // Player must lose their current core (via corruption attrition) before picking up another.
    if (updated.heldCoreEffect !== null) {
      return updated;
    }

    const coreIndex = fractureCores.findIndex(
      (c) => distance(updated.position, c.position) <= FRACTURE_CORE_PICKUP_RANGE,
    );
    if (coreIndex === -1) {
      return updated;
    }

    const core = fractureCores[coreIndex];
    fractureCores = fractureCores.filter((_, i) => i !== coreIndex);
    updated = applyCorePick(updated, core);

    return updated;
  });

  return { ...state, players, fractureCores };
}

function applyCorePick(player: Player, core: FractureCore): Player {
  let updated: Player = {
    ...player,
    heldCoreEffect: core.effect,
    corruptionDps: core.corruptionDps,
  };

  if (core.effect === 'cooldown_reduction') {
    updated = { ...updated, abilityChargeMs: Math.floor(updated.abilityChargeMs / 2) };
  }

  if (core.effect === 'ability_mutation') {
    // WHY: unpredictable — picks a random timed effect for 10s
    const effects: Array<'speed_boost' | 'damage_boost' | 'damage_immunity'> = [
      'speed_boost',
      'damage_boost',
      'damage_immunity',
    ];
    const roll = effects[randomInt(0, effects.length - 1)];
    updated = { ...updated, abilityActiveMs: 10000, activeAbilityEffect: roll };
  }

  return updated;
}

// Age gravity zones and apply pull force + speed debuff to players inside.
function tickGravityZones(state: GameState, deltaMs: number): GameState {
  const gravityZones = state.gravityZones
    .map((z) => ({ ...z, age: z.age + deltaMs }))
    .filter((z) => z.age < z.maxAge);

  const players = state.players.map((p) => {
    if (p.status !== 'alive') {
      return p;
    }

    let pos = { ...p.position };
    for (const zone of gravityZones) {
      const dist = distance(p.position, zone.position);
      if (dist <= zone.radius && dist > 0) {
        const pull = (zone.pullStrength / 1000) * deltaMs;
        const dx = zone.position.x - pos.x;
        const dy = zone.position.y - pos.y;
        pos = {
          x: clamp(pos.x + (dx / dist) * pull, 0, state.mapWidth),
          y: clamp(pos.y + (dy / dist) * pull, 0, state.mapHeight),
        };
      }
    }

    return { ...p, position: pos };
  });

  return { ...state, gravityZones, players };
}

// Age time echo zones and remove expired ones.
// Effect: players inside charge abilities slower and move slightly slower ("reality stutters").
function tickTimeEchoZones(state: GameState, deltaMs: number): GameState {
  const timeEchoZones = state.timeEchoZones
    .map((z) => ({ ...z, age: z.age + deltaMs }))
    .filter((z) => z.age < z.maxAge);

  return { ...state, timeEchoZones };
}

// Progress Helix Relay capture if any player stands inside; reward on full capture.
function tickHelixRelays(state: GameState, deltaMs: number): GameState {
  let { players, lootDrops } = state;
  const alivePlayers = players.filter((p) => p.status === 'alive');

  const helixRelays = state.helixRelays.map((relay) => {
    let updated = { ...relay, rewardCooldownMs: Math.max(0, relay.rewardCooldownMs - deltaMs) };

    const occupant = alivePlayers.find(
      (p) => distance(p.position, relay.position) <= relay.captureRadius,
    );

    if (occupant) {
      updated = {
        ...updated,
        captureProgress: Math.min(1, updated.captureProgress + HELIX_RELAY_CAPTURE_RATE * deltaMs),
        capturedById: occupant.id,
      };

      if (updated.captureProgress >= 1 && updated.rewardCooldownMs === 0) {
        lootDrops = [
          ...lootDrops,
          {
            id: `relay_loot_${relay.id}_${Date.now()}`,
            position: {
              x: relay.position.x + randomInRange(-HELIX_RELAY_REWARD_LOOT_RADIUS, HELIX_RELAY_REWARD_LOOT_RADIUS),
              y: relay.position.y + randomInRange(-HELIX_RELAY_REWARD_LOOT_RADIUS, HELIX_RELAY_REWARD_LOOT_RADIUS),
            },
            weapon: null,
            gear: null,
            ammo: randomInt(60, 120),
            materials: { wood: randomInt(40, 80), stone: randomInt(30, 60), metal: randomInt(20, 40) },
            shield: 100,
            health: 50,
          },
        ];
        updated = { ...updated, captureProgress: 0, rewardCooldownMs: 60_000 };
      }
    } else {
      updated = {
        ...updated,
        captureProgress: Math.max(0, updated.captureProgress - HELIX_RELAY_DECAY_RATE * deltaMs),
      };
    }

    return updated;
  });

  return { ...state, helixRelays, lootDrops };
}

// Tick supply drop countdown; land drops and check for player pickup.
function tickSupplyDrops(state: GameState, deltaMs: number): GameState {
  let { players } = state;
  let nextSupplyDropMs = state.nextSupplyDropMs - deltaMs;
  let supplyDrops = [...state.supplyDrops];

  if (nextSupplyDropMs <= 0) {
    const drop = spawnSupplyDrop(state.mapWidth, state.mapHeight);
    supplyDrops = [...supplyDrops, drop];
    nextSupplyDropMs = SUPPLY_DROP_INTERVAL_MS;
  }

  supplyDrops = supplyDrops.map((drop) => {
    if (drop.isLanded) return drop;
    const remaining = drop.landInMs - deltaMs;
    return { ...drop, landInMs: Math.max(0, remaining), isLanded: remaining <= 0 };
  });

  supplyDrops = supplyDrops.filter((drop) => {
    if (!drop.isLanded) return true;
    const nearbyPlayer = players.find(
      (p) => p.status === 'alive' && distance(p.position, drop.position) <= drop.pickupRadius,
    );
    if (!nearbyPlayer) return true;

    players = players.map((p) => {
      if (p.id !== nearbyPlayer.id) return p;
      let updated = { ...p };

      // Weapon slot
      const emptySlot = p.weapons.findIndex((w, i) => i > 0 && w === null) as 0 | 1 | 2 | -1;
      if (emptySlot !== -1) {
        const weapons = [...p.weapons] as Player['weapons'];
        weapons[emptySlot] = {
          id: `supply_${drop.id}`,
          type: drop.weaponType,
          rarity: drop.rarity,
          damage: 50,
          fireRate: 3,
          magazineSize: 20,
          currentAmmo: 20,
          range: 400,
          reloadTime: 2000,
          isReloading: false,
        };
        updated = { ...updated, weapons };
      }

      // Gear slot — always equip supply drop gear (it's legendary)
      if (drop.gear) {
        const { slot } = drop.gear;
        const oldGear = updated.gear[slot];
        if (oldGear) updated = applyGearDelta(updated, oldGear, -1);
        updated = applyGearDelta(updated, drop.gear, 1);
        updated = { ...updated, gear: { ...updated.gear, [slot]: drop.gear } };
      }

      return updated;
    });

    return false;
  });

  return { ...state, players, supplyDrops, nextSupplyDropMs };
}

function spawnSupplyDrop(mapWidth: number, mapHeight: number): SupplyDrop {
  const epicWeapons: WeaponType[] = ['sniper', 'heavy_sniper', 'rail_gun', 'minigun', 'rocket_launcher', 'heavy_ar'];
  const rarities: Rarity[] = ['epic', 'legendary'];
  const gearSlots: GearSlot[] = ['helmet', 'chest', 'legs', 'gloves'];
  return {
    id: `supply_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    position: {
      x: randomInRange(100, mapWidth - 100),
      y: randomInRange(100, mapHeight - 100),
    },
    isLanded: false,
    landInMs: SUPPLY_DROP_LAND_DELAY_MS,
    pickupRadius: SUPPLY_DROP_PICKUP_RADIUS,
    weaponType: epicWeapons[randomInt(0, epicWeapons.length - 1)],
    rarity: rarities[randomInt(0, rarities.length - 1)],
    gear: makeGear(gearSlots[randomInt(0, gearSlots.length - 1)], 'legendary'),
  };
}

function tickQuip(state: GameState, deltaMs: number): GameState {
  if (!state.activeQuip) return state;
  const quipTtlMs = state.quipTtlMs - deltaMs;
  if (quipTtlMs <= 0) return { ...state, activeQuip: null, quipTtlMs: 0 };
  return { ...state, quipTtlMs };
}

function triggerMeteorQuip(state: GameState, newImpacts: MeteorImpact[]): GameState {
  if (newImpacts.length === 0 || state.activeQuip) return state;
  const human = state.players.find((p) => p.isHuman && p.status === 'alive');
  if (!human) return state;
  const nearbyImpact = newImpacts.find((i) => distance(human.position, i.position) < 300);
  if (!nearbyImpact) return state;
  const character = getCharacter(human.characterId);
  return { ...state, activeQuip: character.meteorQuip, quipTtlMs: QUIP_DISPLAY_MS };
}

function moveHumanPlayer(state: GameState, input: InputState, deltaMs: number): GameState {
  const humanIndex = state.players.findIndex((p) => p.isHuman && p.status === 'alive');
  if (humanIndex === -1) return state;

  const player = state.players[humanIndex];
  const abilitySpeedMult = player.activeAbilityEffect === 'speed_boost' ? ABILITY_SPEED_BOOST_MULT : 1;

  const inGravityZone = state.gravityZones.some(
    (z) => distance(player.position, z.position) <= z.radius,
  );
  const inEchoZone = state.timeEchoZones.some(
    (z) => distance(player.position, z.position) <= z.radius,
  );

  const speed =
    PLAYER_SPEED *
    player.speedMult *
    abilitySpeedMult *
    (inGravityZone ? GRAVITY_ZONE_SPEED_MULT : 1) *
    (inEchoZone ? ECHO_ZONE_SPEED_MULT : 1) *
    (deltaMs / TICK_RATE_MS);

  const dir = normalize(input.moveVector);

  const rawNext: Vector2 = {
    x: clamp(player.position.x + dir.x * speed, 0, state.mapWidth),
    y: clamp(player.position.y + dir.y * speed, 0, state.mapHeight),
  };

  const resolvedPos = resolvePlayerWallCollision(
    { ...player, position: rawNext },
    state.buildPieces,
  );

  const rotation =
    input.aimVector.x !== 0 || input.aimVector.y !== 0
      ? Math.atan2(input.aimVector.y, input.aimVector.x) * (180 / Math.PI)
      : player.rotation;

  const updated: Player = {
    ...player,
    position: resolvedPos,
    rotation,
    isBuilding: input.isBuilding,
  };

  const players = [...state.players];
  players[humanIndex] = updated;
  return { ...state, players };
}

// Apply damage from freshly landed EXPLOSIVE impacts only.
// WHY: damage_immunity blocks meteor hits — that's the counterplay for Iris, Rook, Kael, etc.
function applyMeteorDamage(state: GameState, newImpacts: MeteorImpact[]): GameState {
  const explosiveImpacts = newImpacts.filter((i) => i.meteorType === 'explosive');
  if (explosiveImpacts.length === 0) return state;

  const players = state.players.map((p) => {
    // Knocked players are already dying; skip to avoid double-processing
    if (p.status !== 'alive') return p;
    if (p.activeAbilityEffect === 'damage_immunity') return p;

    let totalDmg = 0;
    for (const impact of explosiveImpacts) {
      if (distance(p.position, impact.position) <= impact.blastRadius) {
        totalDmg += state.bombardment.impactDamage;
      }
    }
    if (totalDmg === 0) return p;

    const effectiveDmg = Math.round(totalDmg * (1 - p.damageResistance));
    let shield = p.shield;
    let health = p.health;
    const absorbed = Math.min(shield, effectiveDmg);
    shield -= absorbed;
    health = Math.max(0, health - (effectiveDmg - absorbed));

    const newStatus = health === 0 ? ('knocked' as const) : p.status;
    const knockedTimerMs = newStatus === 'knocked' ? KNOCKED_TIMER_MS : p.knockedTimerMs;
    return { ...p, shield, health, status: newStatus, knockedTimerMs, shieldRegenDelayMs: SHIELD_REGEN_DELAY_MS };
  });

  return { ...state, players };
}

// Spawn Fracture Cores, Gravity Zones, and Time Echo Zones based on impact type.
function spawnMeteorEffects(state: GameState, newImpacts: MeteorImpact[]): GameState {
  if (newImpacts.length === 0) return state;

  let { fractureCores, gravityZones, timeEchoZones } = state;

  for (const impact of newImpacts) {
    if (impact.meteorType === 'explosive') {
      const effects: FractureCoreEffect[] = ['cooldown_reduction', 'damage_amp', 'ability_mutation'];
      fractureCores = [
        ...fractureCores,
        {
          id: `core_${impact.id}`,
          position: impact.position,
          effect: effects[randomInt(0, effects.length - 1)],
          corruptionDps: randomInRange(4, 8),
        },
      ];
    } else if (impact.meteorType === 'gravity') {
      gravityZones = [
        ...gravityZones,
        {
          id: `gzone_${impact.id}`,
          position: impact.position,
          radius: GRAVITY_ZONE_RADIUS,
          pullStrength: GRAVITY_ZONE_PULL_STRENGTH,
          speedMult: GRAVITY_ZONE_SPEED_MULT,
          age: 0,
          maxAge: GRAVITY_ZONE_MAX_AGE_MS,
        },
      ];
    } else {
      timeEchoZones = [
        ...timeEchoZones,
        {
          id: `echo_${impact.id}`,
          position: impact.position,
          radius: ECHO_ZONE_RADIUS,
          age: 0,
          maxAge: ECHO_ZONE_MAX_AGE_MS,
        },
      ];
    }
  }

  return { ...state, fractureCores, gravityZones, timeEchoZones };
}

function updateBounty(state: GameState): GameState {
  const eligible = state.players.filter(
    (p) => p.status === 'alive' && p.kills >= BOUNTY_KILL_THRESHOLD,
  );
  if (eligible.length === 0) {
    return state.bountyPlayerId !== null ? { ...state, bountyPlayerId: null } : state;
  }
  const top = eligible.reduce((a, b) => (b.kills > a.kills ? b : a));
  return top.id !== state.bountyPlayerId ? { ...state, bountyPlayerId: top.id } : state;
}

// Fire a shot from the shooter toward the target position.
export function fireShot(state: GameState, shooterId: string, targetPos: Vector2): GameState {
  const shooterIndex = state.players.findIndex((p) => p.id === shooterId);
  if (shooterIndex === -1) return state;

  const shooter = state.players[shooterIndex];
  if (shooter.status !== 'alive') return state;

  const weapon = shooter.weapons[shooter.activeWeaponSlot];
  if (!weapon || weapon.currentAmmo <= 0 || weapon.isReloading) return state;

  const hitPiece = checkBulletHit(shooter.position, targetPos, state.buildPieces);
  if (hitPiece) {
    const buildPieces = state.buildPieces
      .map((bp) => {
        if (bp.id !== hitPiece.id) return bp;
        return { ...bp, health: Math.max(0, bp.health - weapon.damage) };
      })
      .filter((bp) => bp.health > 0);

    const players = [...state.players];
    players[shooterIndex] = {
      ...shooter,
      weapons: shooter.weapons.map((w, i) =>
        i === shooter.activeWeaponSlot && w ? { ...w, currentAmmo: w.currentAmmo - 1 } : w,
      ) as Player['weapons'],
    };
    return { ...state, players, buildPieces };
  }

  let players = [...state.players];
  players[shooterIndex] = {
    ...shooter,
    weapons: shooter.weapons.map((w, i) =>
      i === shooter.activeWeaponSlot && w ? { ...w, currentAmmo: w.currentAmmo - 1 } : w,
    ) as Player['weapons'],
  };

  for (let i = 0; i < players.length; i++) {
    const target = players[i];
    // Knocked players can be finished with a shot; eliminated players cannot be hit
    if (target.id === shooterId || target.status === 'eliminated') continue;
    if (!isPlayerHitByBullet(shooter.position, targetPos, target)) continue;
    if (target.activeAbilityEffect === 'damage_immunity') break;

    // Outgoing multipliers: passive × ability × Fracture Core damage_amp
    const abilityDamageMult =
      players[shooterIndex].activeAbilityEffect === 'damage_boost' ? ABILITY_DAMAGE_BOOST_MULT : 1;
    const coreDamageMult =
      players[shooterIndex].heldCoreEffect === 'damage_amp' ? FRACTURE_CORE_DAMAGE_AMP : 1;
    const rawDmg = Math.round(
      weapon.damage * players[shooterIndex].damageMult * abilityDamageMult * coreDamageMult,
    );

    const wasKnocked = target.status === 'knocked';
    const wasAlive = target.status === 'alive';

    // Hitting a knocked player finishes them instantly
    let dmg = wasKnocked
      ? target.health
      : Math.round(rawDmg * (1 - target.damageResistance));

    let shield = wasKnocked ? 0 : target.shield;
    let health = target.health;

    let shieldAbsorbed = 0;
    if (!wasKnocked && shield > 0) {
      shieldAbsorbed = Math.min(shield, dmg);
      shield -= shieldAbsorbed;
      dmg -= shieldAbsorbed;
    }
    health = Math.max(0, health - dmg);
    const totalDamage = shieldAbsorbed + (target.health - health);

    const newStatus = health === 0
      ? (wasAlive ? ('knocked' as const) : ('eliminated' as const))
      : target.status;
    const knockedTimerMs = newStatus === 'knocked' ? KNOCKED_TIMER_MS : target.knockedTimerMs;

    players[i] = {
      ...target,
      shield,
      health,
      status: newStatus,
      knockedTimerMs,
      shieldRegenDelayMs: SHIELD_REGEN_DELAY_MS,
    };

    // Accumulate damage on shooter
    players[shooterIndex] = {
      ...players[shooterIndex],
      damageDealt: players[shooterIndex].damageDealt + totalDamage,
    };

    // Kill credit on the first down (alive → knocked)
    if (wasAlive && health === 0) {
      const kills = players[shooterIndex].kills + 1;
      const healedHp = Math.min(
        players[shooterIndex].maxHealth,
        players[shooterIndex].health + players[shooterIndex].killHealAmount,
      );
      players[shooterIndex] = { ...players[shooterIndex], kills, health: healedHp };
    }

    // Weapon drop + kill feed on elimination (finish)
    if (newStatus === 'eliminated') {
      const newEntry: KillFeedEntry = {
        id: `kf_${state.tickCount}_${i}`,
        killerName: players[shooterIndex].name,
        victimName: target.name,
        ttlMs: KILL_FEED_TTL_MS,
      };
      const killFeed = [newEntry, ...state.killFeed].slice(0, KILL_FEED_MAX);

      let lootDrops = state.lootDrops;
      target.weapons.forEach((w, slot) => {
        if (!w || w.type === 'pickaxe') return;
        lootDrops = [
          ...lootDrops,
          {
            id: `kill_loot_${target.id}_s${slot}_${state.tickCount}`,
            position: {
              x: target.position.x + (slot - 1) * 18,
              y: target.position.y + (slot - 1) * 18,
            },
            weapon: { ...w, currentAmmo: w.magazineSize },
            gear: null,
            ammo: 0,
            materials: { wood: 0, stone: 0, metal: 0 },
            shield: 0,
            health: 0,
          },
        ];
      });

      // Drop equipped gear so human can loot it
      let gearOffset = 0;
      (Object.entries(target.gear) as [GearSlot, typeof target.gear[GearSlot]][]).forEach(
        ([, piece]) => {
          if (!piece) return;
          lootDrops = [
            ...lootDrops,
            {
              id: `kill_gear_${target.id}_${piece.id}_${state.tickCount}`,
              position: {
                x: target.position.x + (gearOffset - 1) * 16,
                y: target.position.y + 18,
              },
              weapon: null,
              gear: piece,
              ammo: 0,
              materials: { wood: 0, stone: 0, metal: 0 },
              shield: 0,
              health: 0,
            },
          ];
          gearOffset++;
        },
      );

      if (target.id === state.bountyPlayerId) {
        lootDrops = [
          ...lootDrops,
          {
            id: `bounty_loot_${state.tickCount}`,
            position: target.position,
            weapon: null,
            gear: null,
            ammo: 60,
            materials: { wood: 80, stone: 60, metal: 40 },
            shield: 100,
            health: 50,
          },
        ];
      }

      return { ...state, players, lootDrops, killFeed };
    }
    break;
  }

  return { ...state, players };
}

function checkWinCondition(state: GameState): GameState {
  const alive = state.players.filter((p) => p.status === 'alive');
  if (alive.length <= 1) {
    const winner = alive[0] ?? null;
    const human = state.players.find((p) => p.isHuman);
    const placement = human?.status === 'alive' ? 1 : calculatePlacement(state.players);

    return {
      ...state,
      phase: 'game_over',
      alivePlayers: alive.length,
      result: {
        placement,
        kills: human?.kills ?? 0,
        damageDealt: human?.damageDealt ?? 0,
        survivalTimeMs: Date.now() - state.startTime,
        winner: winner?.name ?? null,
        environmentId: state.environmentId,
      },
    };
  }
  return { ...state, alivePlayers: alive.length };
}

function calculatePlacement(players: Player[]): number {
  const human = players.find((p) => p.isHuman);
  if (!human) return players.length;
  const survivedLonger = players.filter((p) => !p.isHuman && p.status === 'alive').length;
  return survivedLonger + 1;
}
