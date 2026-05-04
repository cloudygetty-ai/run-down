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
} from '../../types';
import { tickBombardment } from '../meteor';
import { resolvePlayerWallCollision, isPlayerHitByBullet, checkBulletHit } from '../physics';
import { distance, clamp, normalize, randomInRange, randomInt } from '../../utils';
import { logger } from '../../utils';
import { getCharacter } from '../characters';

const TICK_RATE_MS = 50; // 20 ticks per second
const PLAYER_SPEED = 4; // units per tick at full joystick

const FRACTURE_CORE_PICKUP_RANGE = 60;
const HELIX_RELAY_CAPTURE_RATE = 1 / 5000; // progress per ms (captures in 5s)
const HELIX_RELAY_DECAY_RATE = 1 / 10000; // progress lost per ms when unoccupied
const HELIX_RELAY_REWARD_LOOT_RADIUS = 80;
const SUPPLY_DROP_INTERVAL_MS = 3 * 60 * 1000; // one drop every 3 minutes
const SUPPLY_DROP_LAND_DELAY_MS = 8000; // 8 seconds of descent
const SUPPLY_DROP_PICKUP_RADIUS = 100;
const BOUNTY_KILL_THRESHOLD = 3; // player needs ≥ 3 kills to become bounty target
const QUIP_DISPLAY_MS = 3500; // how long a character quip stays on screen

export type InputState = {
  moveVector: Vector2; // normalized joystick direction (-1..1 on each axis)
  aimVector: Vector2; // direction the player is aiming
  isShooting: boolean;
  isBuilding: boolean;
  buildPieceType: 'wall' | 'floor' | 'ramp';
  buildPosition: Vector2 | null;
  wantsReload: boolean;
};

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
    next = tickFractureCores(next, deltaMs);
    next = tickGravityZones(next, deltaMs);
    next = tickTimeEchoZones(next, deltaMs);
    next = tickHelixRelays(next, deltaMs);
    next = tickSupplyDrops(next, deltaMs);
    next = tickQuip(next, deltaMs);
    next = moveHumanPlayer(next, humanInput, deltaMs);

    // Tick the bombardment and apply any new meteor strikes
    const { bombardment, newImpacts } = tickBombardment(
      next.bombardment,
      deltaMs,
      next.mapWidth,
      next.mapHeight,
    );
    next = { ...next, bombardment };
    next = applyMeteorDamage(next, newImpacts);
    next = spawnMeteorEffects(next, newImpacts);
    next = triggerMeteorQuip(next, newImpacts);

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

// Tick down ability cooldown and active-effect timers for every player.
// Also applies Jax's HP drain and Fracture Core cooldown-reduction acceleration.
function tickAbilityTimers(state: GameState, deltaMs: number): GameState {
  const players = state.players.map((p) => {
    let updated = { ...p };

    if (updated.abilityChargeMs > 0) {
      // cooldown_reduction core charges ability 2× faster
      const chargeRate = updated.heldCoreEffect === 'cooldown_reduction' ? 2 : 1;
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
        const drain = (5 / 1000) * deltaMs; // 5 HP per second
        const newHp = Math.max(1, updated.health - drain); // floor at 1 — can't self-eliminate
        updated = { ...updated, health: newHp };
      }
    }

    return updated;
  });

  return { ...state, players };
}

// Auto-pick up nearby Fracture Cores and apply their corruption drain each tick.
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

    // Check if player is standing on an unclaimed core
    const coreIndex = fractureCores.findIndex(
      (c) => distance(p.position, c.position) <= FRACTURE_CORE_PICKUP_RANGE,
    );
    if (coreIndex === -1) {
      return updated;
    }

    const core = fractureCores[coreIndex];
    fractureCores = fractureCores.filter((_, i) => i !== coreIndex);

    // Apply the core's immediate effect
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
    // Instantly halve the current ability cooldown
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

// Age time echo zones and remove expired ones. Effect is primarily visual.
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
        // Grant a loot cache at the relay position
        lootDrops = [
          ...lootDrops,
          {
            id: `relay_loot_${relay.id}_${Date.now()}`,
            position: {
              x: relay.position.x + randomInRange(-HELIX_RELAY_REWARD_LOOT_RADIUS, HELIX_RELAY_REWARD_LOOT_RADIUS),
              y: relay.position.y + randomInRange(-HELIX_RELAY_REWARD_LOOT_RADIUS, HELIX_RELAY_REWARD_LOOT_RADIUS),
            },
            weapon: null,
            ammo: randomInt(60, 120),
            materials: { wood: randomInt(40, 80), stone: randomInt(30, 60), metal: randomInt(20, 40) },
            shield: 100,
            health: 50,
          },
        ];
        updated = { ...updated, captureProgress: 0, rewardCooldownMs: 60_000 };
      }
    } else {
      // Uncaptured relay slowly loses progress
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

  // Spawn a new drop when timer expires
  if (nextSupplyDropMs <= 0) {
    const drop = spawnSupplyDrop(state.mapWidth, state.mapHeight);
    supplyDrops = [...supplyDrops, drop];
    nextSupplyDropMs = SUPPLY_DROP_INTERVAL_MS;
  }

  // Age existing drops, land them, handle player pickup
  const landedIds = new Set<string>();
  supplyDrops = supplyDrops.map((drop) => {
    if (drop.isLanded) {
      return drop;
    }
    const remaining = drop.landInMs - deltaMs;
    return { ...drop, landInMs: Math.max(0, remaining), isLanded: remaining <= 0 };
  });

  // Apply pickups for landed drops
  supplyDrops = supplyDrops.filter((drop) => {
    if (!drop.isLanded) {
      return true;
    }
    const nearbyPlayer = players.find(
      (p) => p.status === 'alive' && distance(p.position, drop.position) <= drop.pickupRadius,
    );
    if (!nearbyPlayer) {
      return true;
    }
    // Give the player the weapon from the drop
    players = players.map((p) => {
      if (p.id !== nearbyPlayer.id) {
        return p;
      }
      const emptySlot = p.weapons.findIndex((w, i) => i > 0 && w === null) as 0 | 1 | 2 | -1;
      if (emptySlot === -1) {
        return p;
      }
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
      return { ...p, weapons };
    });
    landedIds.add(drop.id);
    return false;
  });

  return { ...state, players, supplyDrops, nextSupplyDropMs };
}

function spawnSupplyDrop(mapWidth: number, mapHeight: number): SupplyDrop {
  const epicWeapons: WeaponType[] = ['sniper', 'heavy_sniper', 'rail_gun', 'minigun', 'rocket_launcher', 'heavy_ar'];
  const rarities: Rarity[] = ['epic', 'legendary'];
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
  };
}

// Tick the active quip countdown and clear it when expired.
function tickQuip(state: GameState, deltaMs: number): GameState {
  if (!state.activeQuip) {
    return state;
  }
  const quipTtlMs = state.quipTtlMs - deltaMs;
  if (quipTtlMs <= 0) {
    return { ...state, activeQuip: null, quipTtlMs: 0 };
  }
  return { ...state, quipTtlMs };
}

// Show the human player's character quip when a meteor lands within 300 units.
function triggerMeteorQuip(state: GameState, newImpacts: MeteorImpact[]): GameState {
  if (newImpacts.length === 0 || state.activeQuip) {
    return state;
  }
  const human = state.players.find((p) => p.isHuman && p.status === 'alive');
  if (!human) {
    return state;
  }
  const nearbyImpact = newImpacts.find((i) => distance(human.position, i.position) < 300);
  if (!nearbyImpact) {
    return state;
  }
  const character = getCharacter(human.characterId);
  return { ...state, activeQuip: character.meteorQuip, quipTtlMs: QUIP_DISPLAY_MS };
}

function moveHumanPlayer(state: GameState, input: InputState, deltaMs: number): GameState {
  const humanIndex = state.players.findIndex((p) => p.isHuman && p.status === 'alive');
  if (humanIndex === -1) {
    return state;
  }

  const player = state.players[humanIndex];
  const abilitySpeedMult = player.activeAbilityEffect === 'speed_boost' ? 2 : 1;

  // Inside a gravity zone players move slower
  const inGravityZone = state.gravityZones.some(
    (z) => distance(player.position, z.position) <= z.radius,
  );
  const gravitySpeedMult = inGravityZone ? 0.6 : 1;

  const speed =
    PLAYER_SPEED * player.speedMult * abilitySpeedMult * gravitySpeedMult * (deltaMs / TICK_RATE_MS);
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

// Apply damage from freshly spawned EXPLOSIVE meteor impacts only.
function applyMeteorDamage(state: GameState, newImpacts: MeteorImpact[]): GameState {
  const explosiveImpacts = newImpacts.filter((i) => i.meteorType === 'explosive');
  if (explosiveImpacts.length === 0) {
    return state;
  }

  const players = state.players.map((p) => {
    if (p.status !== 'alive') {
      return p;
    }
    if (p.activeAbilityEffect === 'damage_immunity') {
      return p;
    }

    let totalDmg = 0;
    for (const impact of explosiveImpacts) {
      if (distance(p.position, impact.position) <= impact.blastRadius) {
        totalDmg += state.bombardment.impactDamage;
      }
    }
    if (totalDmg === 0) {
      return p;
    }

    const effectiveDmg = Math.round(totalDmg * (1 - p.damageResistance));
    let shield = p.shield;
    let health = p.health;
    const absorbed = Math.min(shield, effectiveDmg);
    shield -= absorbed;
    health = Math.max(0, health - (effectiveDmg - absorbed));

    const status = health === 0 ? ('eliminated' as const) : p.status;
    return { ...p, shield, health, status };
  });

  return { ...state, players };
}

// Spawn Fracture Cores, Gravity Zones, and Time Echo Zones based on impact type.
function spawnMeteorEffects(state: GameState, newImpacts: MeteorImpact[]): GameState {
  if (newImpacts.length === 0) {
    return state;
  }

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
          radius: 180,
          pullStrength: 60, // units per second pulled toward center
          speedMult: 0.6,
          age: 0,
          maxAge: 30_000, // 30 seconds
        },
      ];
    } else {
      // echo
      timeEchoZones = [
        ...timeEchoZones,
        {
          id: `echo_${impact.id}`,
          position: impact.position,
          radius: 200,
          age: 0,
          maxAge: 20_000, // 20 seconds
        },
      ];
    }
  }

  return { ...state, fractureCores, gravityZones, timeEchoZones };
}

// Update bountyPlayerId to track the highest-kill alive player.
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
  if (shooterIndex === -1) {
    return state;
  }

  const shooter = state.players[shooterIndex];
  if (shooter.status !== 'alive') {
    return state;
  }

  const weapon = shooter.weapons[shooter.activeWeaponSlot];
  if (!weapon || weapon.currentAmmo <= 0 || weapon.isReloading) {
    return state;
  }

  // Check for build piece hit first (bullets stop at walls)
  const hitPiece = checkBulletHit(shooter.position, targetPos, state.buildPieces);
  if (hitPiece) {
    const buildPieces = state.buildPieces
      .map((bp) => {
        if (bp.id !== hitPiece.id) {
          return bp;
        }
        const newHealth = Math.max(0, bp.health - weapon.damage);
        return { ...bp, health: newHealth };
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

  // Check for player hits
  let players = [...state.players];
  players[shooterIndex] = {
    ...shooter,
    weapons: shooter.weapons.map((w, i) =>
      i === shooter.activeWeaponSlot && w ? { ...w, currentAmmo: w.currentAmmo - 1 } : w,
    ) as Player['weapons'],
  };

  for (let i = 0; i < players.length; i++) {
    const target = players[i];
    if (target.id === shooterId || target.status !== 'alive') {
      continue;
    }
    if (!isPlayerHitByBullet(shooter.position, targetPos, target)) {
      continue;
    }
    if (target.activeAbilityEffect === 'damage_immunity') {
      break;
    }

    // Outgoing multipliers: passive × ability × Fracture Core damage_amp
    const abilityDamageMult = players[shooterIndex].activeAbilityEffect === 'damage_boost' ? 1.5 : 1;
    const coreDamageMult = players[shooterIndex].heldCoreEffect === 'damage_amp' ? 1.4 : 1;
    const rawDmg = Math.round(
      weapon.damage * players[shooterIndex].damageMult * abilityDamageMult * coreDamageMult,
    );

    let dmg = Math.round(rawDmg * (1 - target.damageResistance));
    let shield = target.shield;
    let health = target.health;

    if (shield > 0) {
      const absorbed = Math.min(shield, dmg);
      shield -= absorbed;
      dmg -= absorbed;
    }
    health = Math.max(0, health - dmg);

    const status = health === 0 ? ('eliminated' as const) : target.status;
    players[i] = { ...target, shield, health, status };

    if (status === 'eliminated') {
      const kills = players[shooterIndex].kills + 1;
      const healedHp = Math.min(
        players[shooterIndex].maxHealth,
        players[shooterIndex].health + players[shooterIndex].killHealAmount,
      );

      // Bounty bonus: killing the bounty target drops extra loot (handled via lootDrops)
      let lootDrops = state.lootDrops;
      if (target.id === state.bountyPlayerId) {
        lootDrops = [
          ...lootDrops,
          {
            id: `bounty_loot_${Date.now()}`,
            position: target.position,
            weapon: null,
            ammo: 60,
            materials: { wood: 80, stone: 60, metal: 40 },
            shield: 100,
            health: 50,
          },
        ];
      }

      players[shooterIndex] = { ...players[shooterIndex], kills, health: healedHp };
      if (lootDrops !== state.lootDrops) {
        return { ...state, players, lootDrops };
      }
    }
    break; // bullet hits one target
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
        survivalTimeMs: Date.now() - state.startTime,
        winner: winner?.name ?? null,
      },
    };
  }
  return { ...state, alivePlayers: alive.length };
}

function calculatePlacement(players: Player[]): number {
  const human = players.find((p) => p.isHuman);
  if (!human) {
    return players.length;
  }
  const survivedLonger = players.filter((p) => !p.isHuman && p.status === 'alive').length;
  return survivedLonger + 1;
}
