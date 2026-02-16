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
} from '../../types';
import { createInitialBombardment } from '../../core/meteor';
import { randomInRange, randomInt } from '../../utils';

const MAP_WIDTH  = 1600;
const MAP_HEIGHT = 1600;
const BOT_COUNT  = 99;

// --- Weapon templates ---

function makeWeapon(type: WeaponType, rarity: Rarity): Weapon {
  const base: Record<WeaponType, Omit<Weapon, 'id' | 'type' | 'rarity' | 'isReloading'>> = {
    assault_rifle: { damage: 35,  fireRate: 5,   magazineSize: 30, currentAmmo: 30, range: 400, reloadTime: 2000 },
    shotgun:       { damage: 110, fireRate: 0.8, magazineSize: 5,  currentAmmo: 5,  range: 120, reloadTime: 2500 },
    sniper:        { damage: 100, fireRate: 0.5, magazineSize: 4,  currentAmmo: 4,  range: 800, reloadTime: 3000 },
    smg:           { damage: 17,  fireRate: 10,  magazineSize: 35, currentAmmo: 35, range: 200, reloadTime: 1800 },
    pickaxe:       { damage: 20,  fireRate: 0.9, magazineSize: Infinity, currentAmmo: Infinity, range: 60,  reloadTime: 0 },
  };
  const rarityMult: Record<Rarity, number> = {
    common: 1, uncommon: 1.1, rare: 1.2, epic: 1.35, legendary: 1.5,
  };
  const b = base[type];
  return {
    ...b,
    id: `weapon_${Math.random().toString(36).slice(2)}`,
    type,
    rarity,
    damage: Math.round(b.damage * rarityMult[rarity]),
    isReloading: false,
  };
}

function makeMaterials(): Record<BuildingMaterial, number> {
  return { wood: 100, stone: 50, metal: 25 };
}

function makePlayer(id: string, name: string, isHuman: boolean, position: Vector2): Player {
  return {
    id,
    name,
    isHuman,
    position,
    velocity: { x: 0, y: 0 },
    rotation: 0,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 100,
    status: 'alive',
    weapons: [makeWeapon('pickaxe', 'common'), null, null],
    activeWeaponSlot: 0,
    materials: makeMaterials(),
    kills: 0,
    isBuilding: false,
    selectedBuildPiece: 'wall',
    selectedBuildMaterial: 'wood',
  };
}

function scatterLoot(count: number): LootDrop[] {
  const types: WeaponType[] = ['assault_rifle', 'shotgun', 'sniper', 'smg'];
  const rarities: Rarity[]  = ['common', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

  return Array.from({ length: count }, (_, i) => ({
    id: `loot_${i}`,
    position: {
      x: randomInRange(50, MAP_WIDTH  - 50),
      y: randomInRange(50, MAP_HEIGHT - 50),
    },
    weapon: makeWeapon(
      types[randomInt(0, types.length - 1)],
      rarities[randomInt(0, rarities.length - 1)],
    ),
    ammo: randomInt(30, 120),
    materials: { wood: randomInt(20, 60), stone: randomInt(10, 30), metal: randomInt(5, 15) },
    shield: randomInt(0, 1) === 1 ? 50 : 0,
    health: randomInt(0, 1) === 1 ? 25 : 0,
  }));
}

function buildInitialState(): GameState {
  const human = makePlayer('human', 'You', true, {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
  });

  const bots: Player[] = Array.from({ length: BOT_COUNT }, (_, i) =>
    makePlayer(
      `bot_${i}`,
      `Bot${i + 1}`,
      false,
      {
        x: randomInRange(100, MAP_WIDTH  - 100),
        y: randomInRange(100, MAP_HEIGHT - 100),
      },
    ),
  );

  return {
    phase: 'lobby',
    players: [human, ...bots],
    buildPieces: [],
    lootDrops: scatterLoot(200),
    bombardment: createInitialBombardment(MAP_WIDTH, MAP_HEIGHT),
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    tickCount: 0,
    startTime: 0,
    result: null,
    alivePlayers: BOT_COUNT + 1,
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
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: buildInitialState(),

  startGame: () => {
    set(s => ({
      gameState: {
        ...s.gameState,
        phase: 'playing',
        startTime: Date.now(),
      },
    }));
  },

  resetGame: () => {
    set({ gameState: buildInitialState() });
  },

  updateGameState: (next: GameState) => {
    set({ gameState: next });
  },

  pickUpLoot: (playerId: string, lootId: string) => {
    const { gameState } = get();
    const loot = gameState.lootDrops.find(l => l.id === lootId);
    if (!loot) return;

    const players = gameState.players.map(p => {
      if (p.id !== playerId) return p;

      let updated = { ...p };

      // Pick up weapon into first empty slot (skip slot 0 = pickaxe)
      if (loot.weapon) {
        const emptySlot = updated.weapons.findIndex((w, i) => i > 0 && w === null) as 0 | 1 | 2 | -1;
        if (emptySlot !== -1) {
          const weapons = [...updated.weapons] as Player['weapons'];
          weapons[emptySlot] = loot.weapon;
          updated = { ...updated, weapons };
        }
      }

      // Pick up consumables
      updated = {
        ...updated,
        shield: Math.min(updated.maxShield, updated.shield + loot.shield),
        health: Math.min(updated.maxHealth, updated.health + loot.health),
        materials: {
          wood:  updated.materials.wood  + loot.materials.wood,
          stone: updated.materials.stone + loot.materials.stone,
          metal: updated.materials.metal + loot.materials.metal,
        },
      };

      return updated;
    });

    set({
      gameState: {
        ...gameState,
        players,
        lootDrops: gameState.lootDrops.filter(l => l.id !== lootId),
      },
    });
  },

  placeBuildPiece: (piece: BuildPiece) => {
    const { gameState } = get();
    const player = gameState.players.find(p => p.id === piece.ownerId);
    if (!player) return;

    const matCost = 10;
    const mat = player.selectedBuildMaterial;
    if (player.materials[mat] < matCost) return;

    const players = gameState.players.map(p => {
      if (p.id !== piece.ownerId) return p;
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
