import { create } from 'zustand';
import {
  GameState,
  Player,
  BuildPiece,
  LootDrop,
  Weapon,
  WeaponType,
  Rarity,
  BuildingMaterial,
  Vector2,
  HelixRelay,
  GearSlot,
  DropPhasePlayer,
} from '../../types';
import { createInitialBombardment } from '../../core/meteor';
import { getCharacter, DEFAULT_CHARACTER_ID, CHARACTERS } from '../../core/characters';
import { getEnvironment, DEFAULT_ENVIRONMENT_ID } from '../../core/environments';
import { MAP_WIDTH, MAP_HEIGHT, BOT_COUNT } from '../../core/balance';
import { randomInRange, randomInt, makeGear, applyGearDelta } from '../../utils';
import { triggerPlayerAbility } from '../../core/gameEngine';
// WHY: resetGame must clean up both weapon timers and bot brain state
// to prevent stale callbacks firing into a fresh game.
import { cancelAllReloads } from '../weapons';
import { clearBotBrains } from '../ai';


// --- Weapon templates ---

function makeWeapon(type: WeaponType, rarity: Rarity): Weapon {
  const base: Record<WeaponType, Omit<Weapon, 'id' | 'type' | 'rarity' | 'isReloading' | 'reloadStartMs'>> = {
    // ── Melee ────────────────────────────────────────────────────────────────
    pickaxe: {
      damage: 20,
      fireRate: 0.9,
      magazineSize: Infinity,
      currentAmmo: Infinity,
      range: 60,
      reloadTime: 0,
    },

    // ── Pistols ──────────────────────────────────────────────────────────────
    pistol: {
      damage: 25,
      fireRate: 4,
      magazineSize: 16,
      currentAmmo: 16,
      range: 250,
      reloadTime: 1500,
    },
    revolver: {
      damage: 55,
      fireRate: 1.5,
      magazineSize: 6,
      currentAmmo: 6,
      range: 350,
      reloadTime: 2000,
    },
    hand_cannon: {
      damage: 80,
      fireRate: 0.75,
      magazineSize: 6,
      currentAmmo: 6,
      range: 300,
      reloadTime: 2500,
    },
    burst_pistol: {
      damage: 22,
      fireRate: 7,
      magazineSize: 18,
      currentAmmo: 18,
      range: 250,
      reloadTime: 1600,
    },

    // ── SMGs ─────────────────────────────────────────────────────────────────
    smg: {
      damage: 17,
      fireRate: 10,
      magazineSize: 35,
      currentAmmo: 35,
      range: 200,
      reloadTime: 1800,
    },
    compact_smg: {
      damage: 14,
      fireRate: 13,
      magazineSize: 25,
      currentAmmo: 25,
      range: 150,
      reloadTime: 1400,
    },
    suppressed_smg: {
      damage: 18,
      fireRate: 9,
      magazineSize: 30,
      currentAmmo: 30,
      range: 220,
      reloadTime: 1800,
    },

    // ── Assault Rifles ────────────────────────────────────────────────────────
    assault_rifle: {
      damage: 35,
      fireRate: 5,
      magazineSize: 30,
      currentAmmo: 30,
      range: 400,
      reloadTime: 2000,
    },
    burst_ar: {
      damage: 32,
      fireRate: 4,
      magazineSize: 27,
      currentAmmo: 27,
      range: 380,
      reloadTime: 2000,
    },
    heavy_ar: {
      damage: 45,
      fireRate: 3,
      magazineSize: 20,
      currentAmmo: 20,
      range: 420,
      reloadTime: 2200,
    },
    thermal_ar: {
      damage: 38,
      fireRate: 4.5,
      magazineSize: 25,
      currentAmmo: 25,
      range: 500,
      reloadTime: 2100,
    },

    // ── Shotguns ──────────────────────────────────────────────────────────────
    shotgun: {
      damage: 110,
      fireRate: 0.8,
      magazineSize: 5,
      currentAmmo: 5,
      range: 120,
      reloadTime: 2500,
    },
    tactical_shotgun: {
      damage: 72,
      fireRate: 1.5,
      magazineSize: 8,
      currentAmmo: 8,
      range: 130,
      reloadTime: 2000,
    },
    heavy_shotgun: {
      damage: 150,
      fireRate: 0.5,
      magazineSize: 2,
      currentAmmo: 2,
      range: 110,
      reloadTime: 3500,
    },
    drum_shotgun: {
      damage: 50,
      fireRate: 2,
      magazineSize: 12,
      currentAmmo: 12,
      range: 100,
      reloadTime: 3000,
    },

    // ── Sniper Rifles ─────────────────────────────────────────────────────────
    sniper: {
      damage: 100,
      fireRate: 0.5,
      magazineSize: 4,
      currentAmmo: 4,
      range: 800,
      reloadTime: 3000,
    },
    semi_sniper: {
      damage: 70,
      fireRate: 1.5,
      magazineSize: 10,
      currentAmmo: 10,
      range: 700,
      reloadTime: 2500,
    },
    heavy_sniper: {
      damage: 150,
      fireRate: 0.3,
      magazineSize: 1,
      currentAmmo: 1,
      range: 1000,
      reloadTime: 4000,
    },
    hunting_rifle: {
      damage: 65,
      fireRate: 1,
      magazineSize: 8,
      currentAmmo: 8,
      range: 550,
      reloadTime: 2000,
    },

    // ── Marksman / DMR ────────────────────────────────────────────────────────
    marksman_rifle: {
      damage: 55,
      fireRate: 2,
      magazineSize: 12,
      currentAmmo: 12,
      range: 500,
      reloadTime: 2200,
    },

    // ── LMGs ─────────────────────────────────────────────────────────────────
    lmg: {
      damage: 25,
      fireRate: 8,
      magazineSize: 100,
      currentAmmo: 100,
      range: 350,
      reloadTime: 4500,
    },

    // ── Explosives ────────────────────────────────────────────────────────────
    rocket_launcher: {
      damage: 300,
      fireRate: 0.2,
      magazineSize: 1,
      currentAmmo: 1,
      range: 500,
      reloadTime: 5000,
    },

    // ── Special / Exotic ──────────────────────────────────────────────────────
    crossbow: {
      damage: 95,
      fireRate: 0.7,
      magazineSize: 6,
      currentAmmo: 6,
      range: 600,
      reloadTime: 2800,
    },
    minigun: {
      damage: 18,
      fireRate: 20,
      magazineSize: 200,
      currentAmmo: 200,
      range: 300,
      reloadTime: 6000,
    },
    rail_gun: {
      damage: 200,
      fireRate: 0.25,
      magazineSize: 3,
      currentAmmo: 3,
      range: 1200,
      reloadTime: 5000,
    },
  };
  const rarityMult: Record<Rarity, number> = {
    common: 1,
    uncommon: 1.1,
    rare: 1.2,
    epic: 1.35,
    legendary: 1.5,
  };
  const b = base[type];
  return {
    ...b,
    id: `weapon_${Math.random().toString(36).slice(2)}`,
    type,
    rarity,
    damage: Math.round(b.damage * rarityMult[rarity]),
    isReloading: false,
    reloadStartMs: 0,
  };
}

function makeMaterials(): Record<BuildingMaterial, number> {
  return { wood: 100, stone: 50, metal: 25 };
}

function makePlayer(
  id: string,
  name: string,
  isHuman: boolean,
  position: Vector2,
  characterId = DEFAULT_CHARACTER_ID,
): Player {
  const character = getCharacter(characterId);
  const p = character.passive;
  const maxHealth = 100 + p.maxHealthBonus;
  const maxShield = 100 + p.maxShieldBonus;
  const startingShield = isHuman ? Math.min(maxShield, p.startingShield) : 0;
  const baseMaterials = isHuman ? 100 + p.materialsBonus : 100;
  return {
    id,
    name,
    isHuman,
    position,
    velocity: { x: 0, y: 0 },
    rotation: 0,
    health: maxHealth,
    maxHealth,
    shield: startingShield,
    maxShield,
    shieldRegenDelayMs: 0,
    status: 'alive',
    knockedTimerMs: 0,
    weapons: [makeWeapon('pickaxe', 'common'), null, null],
    activeWeaponSlot: 0,
    materials: { wood: baseMaterials, stone: 50 + (isHuman ? p.materialsBonus : 0), metal: 25 + (isHuman ? p.materialsBonus : 0) },
    kills: 0,
    damageDealt: 0,
    isBuilding: false,
    selectedBuildPiece: 'wall',
    selectedBuildMaterial: 'wood',
    characterId,
    damageMult: p.damageMult,
    damageResistance: p.damageResistance,
    killHealAmount: p.killHealAmount,
    speedMult: p.speedMult,
    reloadMult: p.reloadMult,
    // WHY: stagger bots so they don't all use abilities simultaneously at match start
    abilityChargeMs: isHuman ? 0 : randomInt(0, character.ability.cooldownMs),
    abilityActiveMs: 0,
    activeAbilityEffect: 'none',
    heldCoreEffect: null,
    corruptionDps: 0,
    gear: { helmet: null, chest: null, legs: null, gloves: null },
  };
}

function scatterLoot(count: number): LootDrop[] {
  const types: WeaponType[] = [
    'pistol',
    'revolver',
    'hand_cannon',
    'burst_pistol',
    'smg',
    'compact_smg',
    'suppressed_smg',
    'assault_rifle',
    'burst_ar',
    'heavy_ar',
    'thermal_ar',
    'shotgun',
    'tactical_shotgun',
    'heavy_shotgun',
    'drum_shotgun',
    'sniper',
    'semi_sniper',
    'heavy_sniper',
    'hunting_rifle',
    'marksman_rifle',
    'lmg',
    'rocket_launcher',
    'crossbow',
    'minigun',
    'rail_gun',
  ];
  const rarities: Rarity[] = ['common', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

  const gearSlots: GearSlot[] = ['helmet', 'chest', 'legs', 'gloves'];

  return Array.from({ length: count }, (_, i) => {
    const gearRarity = rarities[randomInt(0, rarities.length - 1)];
    const hasGear = randomInt(0, 9) < 3; // 30% chance of gear in a drop

    return {
      id: `loot_${i}`,
      position: {
        x: randomInRange(50, MAP_WIDTH - 50),
        y: randomInRange(50, MAP_HEIGHT - 50),
      },
      weapon: makeWeapon(
        types[randomInt(0, types.length - 1)],
        rarities[randomInt(0, rarities.length - 1)],
      ),
      gear: hasGear ? makeGear(gearSlots[randomInt(0, gearSlots.length - 1)], gearRarity) : null,
      ammo: randomInt(30, 120),
      materials: {
        wood: randomInt(20, 60),
        stone: randomInt(10, 30),
        metal: randomInt(5, 15),
      },
      shield: randomInt(0, 1) === 1 ? 50 : 0,
      health: randomInt(0, 1) === 1 ? 25 : 0,
    };
  });
}

// Operatives pulled from the Helix Corp roster and rogue faction lists.
// WHY: named opponents feel like real combatants, not test dummies.
const BOT_NAMES = [
  'Phantom', 'Cipher', 'Wraith', 'Specter', 'Nexus',
  'Vector', 'Axiom', 'Prism', 'Reflex', 'Shade',
  'Pulse', 'Echo', 'Flux', 'Apex', 'Hex',
  'Scion', 'Nova', 'Surge', 'Drift', 'Cobalt',
  'Veil', 'Razor', 'Pierce', 'Krait', 'Thorn',
  'Grim', 'Dusk', 'Ash', 'Cinder', 'Ember',
  'Steel', 'Rust', 'Shard', 'Wick', 'Knell',
  'Ruin', 'Brink', 'Glint', 'Mave', 'Fang',
];

function buildHelixRelays(mapWidth: number, mapHeight: number): HelixRelay[] {
  // Place 5 relays at fixed strategic positions across the map
  const positions: Vector2[] = [
    { x: mapWidth * 0.25, y: mapHeight * 0.25 },
    { x: mapWidth * 0.75, y: mapHeight * 0.25 },
    { x: mapWidth * 0.5,  y: mapHeight * 0.5  },
    { x: mapWidth * 0.25, y: mapHeight * 0.75 },
    { x: mapWidth * 0.75, y: mapHeight * 0.75 },
  ];
  return positions.map((pos, i) => ({
    id: `relay_${i}`,
    position: pos,
    captureRadius: 80,
    captureProgress: 0,
    capturedById: null,
    rewardCooldownMs: 0,
  }));
}

function buildInitialState(characterId = DEFAULT_CHARACTER_ID, environmentId: string = DEFAULT_ENVIRONMENT_ID): GameState {
  const env = getEnvironment(environmentId);
  const human = makePlayer('human', 'You', true, {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
  }, characterId);
  // Shuffle names and character IDs so each match has a varied field
  const shuffledNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  const charIds = CHARACTERS.map((c) => c.id).filter((id) => id !== characterId);
  const shuffledChars = [...charIds].sort(() => Math.random() - 0.5);
  const bots: Player[] = Array.from({ length: BOT_COUNT }, (_, i) =>
    makePlayer(
      `bot_${i}`,
      shuffledNames[i % shuffledNames.length],
      false,
      {
        x: randomInRange(100, MAP_WIDTH - 100),
        y: randomInRange(100, MAP_HEIGHT - 100),
      },
      shuffledChars[i % shuffledChars.length],
    ),
  );

  // Apply environment speed modifier to all players
  const allPlayers = [human, ...bots].map((p) =>
    env.playerSpeedMult !== 1.0
      ? { ...p, speedMult: p.speedMult * env.playerSpeedMult }
      : p,
  );

  const lootCount = Math.round(200 * env.lootCountMult);

  return {
    phase: 'lobby',
    selectedCharacterId: characterId,
    players: allPlayers,
    buildPieces: [],
    lootDrops: scatterLoot(lootCount),
    bombardment: createInitialBombardment(MAP_WIDTH, MAP_HEIGHT, env.meteorFrequencyMult),
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    tickCount: 0,
    startTime: 0,
    result: null,
    // WHY: derived directly from players array — not hardcoded — so it's always accurate
    alivePlayers: allPlayers.filter((p) => p.status === 'alive').length,
    // Meteor event objects (empty at start — populated during play)
    fractureCores: [],
    gravityZones: [],
    timeEchoZones: [],
    // Mid-match objectives
    helixRelays: buildHelixRelays(MAP_WIDTH, MAP_HEIGHT),
    supplyDrops: [],
    nextSupplyDropMs: env.supplyDropIntervalMs,
    // Comeback mechanic
    bountyPlayerId: null,
    // Character quips
    activeQuip: null,
    quipTtlMs: 0,
    // Incoming meteor warnings
    incomingMeteors: [],
    // Kill feed
    killFeed: [],
    // Environment
    environmentId,
    mapTheme: env.theme,
    outsideZoneDps: env.outsideZoneDps,
    // Vex decoys — empty until ability fires
    decoys: [],
    // Drop phase — populated when startGame transitions to 'dropping'
    dropPhase: [],
  };
}

// --- Store ---

type GameStore = {
  gameState: GameState;
  startGame: () => void;
  resetGame: () => void;
  updateGameState: (next: GameState) => void;
  pickUpLoot: (playerId: string, lootId: string) => void;
  placeBuildPiece: (piece: BuildPiece) => void;
  selectCharacter: (characterId: string) => void;
  selectEnvironment: (environmentId: string) => void;
  triggerAbility: () => void;
  switchBuildMaterial: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: buildInitialState(),

  startGame: () => {
    set((s) => {
      const dropPhase: DropPhasePlayer[] = s.gameState.players.map((p) => ({
        playerId: p.id,
        altitude: 600 + Math.random() * 200, // stagger drops so bots don't all land at once
      }));
      return {
        gameState: {
          ...s.gameState,
          phase: 'dropping',
          startTime: Date.now(),
          dropPhase,
        },
      };
    });
  },

  resetGame: () => {
    cancelAllReloads();
    clearBotBrains();
    const { gameState } = get();
    set({ gameState: buildInitialState(gameState.selectedCharacterId, gameState.environmentId) });
  },

  selectCharacter: (characterId: string) => {
    set((s) => ({
      gameState: { ...s.gameState, selectedCharacterId: characterId },
    }));
  },

  selectEnvironment: (environmentId: string) => {
    const { gameState } = get();
    const env = getEnvironment(environmentId);
    set({
      gameState: {
        ...gameState,
        environmentId,
        mapTheme: env.theme,
        outsideZoneDps: env.outsideZoneDps,
      },
    });
  },

  // Delegates to the engine's pure function so bots can share the same logic.
  triggerAbility: () => {
    const { gameState } = get();
    const human = gameState.players.find((p) => p.isHuman && p.status === 'alive');
    if (!human || human.abilityChargeMs > 0) return;
    set({ gameState: triggerPlayerAbility(gameState, human.id) });
  },

  updateGameState: (next: GameState) => {
    set({ gameState: next });
  },

  switchBuildMaterial: () => {
    const { gameState } = get();
    const human = gameState.players.find((p) => p.isHuman);
    if (!human) return;
    const cycle: BuildingMaterial[] = ['wood', 'stone', 'metal'];
    const nextMat = cycle[(cycle.indexOf(human.selectedBuildMaterial) + 1) % cycle.length];
    set({
      gameState: {
        ...gameState,
        players: gameState.players.map((p) =>
          p.id === human.id ? { ...p, selectedBuildMaterial: nextMat } : p,
        ),
      },
    });
  },

  pickUpLoot: (playerId: string, lootId: string) => {
    const { gameState } = get();
    const loot = gameState.lootDrops.find((l) => l.id === lootId);
    if (!loot) {
      return;
    }

    const players = gameState.players.map((p) => {
      if (p.id !== playerId) {
        return p;
      }
      let updated = { ...p };

      if (loot.weapon) {
        const emptySlot = updated.weapons.findIndex((w, i) => i > 0 && w === null) as
          | 0
          | 1
          | 2
          | -1;
        if (emptySlot !== -1) {
          const weapons = [...updated.weapons] as Player['weapons'];
          weapons[emptySlot] = loot.weapon;
          updated = { ...updated, weapons };
        }
      }

      if (loot.gear) {
        const { slot } = loot.gear;
        const oldGear = updated.gear[slot];
        // Remove old gear's stat delta before applying new piece
        if (oldGear) updated = applyGearDelta(updated, oldGear, -1);
        updated = applyGearDelta(updated, loot.gear, 1);
        updated = { ...updated, gear: { ...updated.gear, [slot]: loot.gear } };
      }

      // Add ammo from loot drop to active weapon
      if (loot.ammo > 0) {
        const slot = updated.activeWeaponSlot;
        const activeWeapon = updated.weapons[slot];
        if (activeWeapon && activeWeapon.type !== 'pickaxe' && isFinite(activeWeapon.magazineSize)) {
          const weapons = [...updated.weapons] as Player['weapons'];
          weapons[slot] = {
            ...activeWeapon,
            currentAmmo: Math.min(activeWeapon.magazineSize, activeWeapon.currentAmmo + loot.ammo),
          };
          updated = { ...updated, weapons };
        }
      }

      return {
        ...updated,
        shield: Math.min(updated.maxShield, updated.shield + loot.shield),
        health: Math.min(updated.maxHealth, updated.health + loot.health),
        materials: {
          wood: updated.materials.wood + loot.materials.wood,
          stone: updated.materials.stone + loot.materials.stone,
          metal: updated.materials.metal + loot.materials.metal,
        },
      };
    });

    set({
      gameState: {
        ...gameState,
        players,
        lootDrops: gameState.lootDrops.filter((l) => l.id !== lootId),
      },
    });
  },

  placeBuildPiece: (piece: BuildPiece) => {
    const { gameState } = get();
    const player = gameState.players.find((p) => p.id === piece.ownerId);
    if (!player) {
      return;
    }

    const matCost = 10;
    const mat = player.selectedBuildMaterial;
    if (player.materials[mat] < matCost) {
      return;
    }

    const players = gameState.players.map((p) => {
      if (p.id !== piece.ownerId) {
        return p;
      }
      return {
        ...p,
        materials: { ...p.materials, [mat]: p.materials[mat] - matCost },
      };
    });

    set({
      gameState: {
        ...gameState,
        players,
        buildPieces: [...gameState.buildPieces, piece],
      },
    });
  },
}));
