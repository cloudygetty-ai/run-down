import { tickGame, fireShot, InputState } from './GameEngine';
import { GameState, Player } from '../../types';
import { createInitialBombardment } from '../meteor';

// Run tickGame N times and return the final state.
function simulateTicks(
  state: GameState,
  input: InputState,
  ticks: number,
  deltaMs = 50,
): GameState {
  let s = state;
  for (let i = 0; i < ticks; i++) {
    s = tickGame(s, input, deltaMs);
    if (s.phase !== 'playing') break;
  }
  return s;
}

const MAP_W = 1600;
const MAP_H = 1600;

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'human',
    name: 'Test Player',
    isHuman: true,
    position: { x: 800, y: 800 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 100,
    status: 'alive',
    weapons: [
      {
        id: 'pickaxe',
        type: 'pickaxe',
        rarity: 'common',
        damage: 20,
        fireRate: 0.9,
        magazineSize: Infinity,
        currentAmmo: Infinity,
        range: 60,
        reloadTime: 0,
        isReloading: false,
      },
      null,
      null,
    ],
    activeWeaponSlot: 0,
    materials: { wood: 100, stone: 50, metal: 25 },
    kills: 0,
    isBuilding: false,
    selectedBuildPiece: 'wall',
    selectedBuildMaterial: 'wood',
    characterId: 'vex',
    damageMult: 1,
    damageResistance: 0,
    killHealAmount: 0,
    speedMult: 1,
    reloadMult: 1,
    abilityChargeMs: 0,
    abilityActiveMs: 0,
    activeAbilityEffect: 'none' as const,
    heldCoreEffect: null,
    corruptionDps: 0,
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    selectedCharacterId: 'vex',
    players: [makePlayer()],
    buildPieces: [],
    lootDrops: [],
    bombardment: createInitialBombardment(MAP_W, MAP_H),
    mapWidth: MAP_W,
    mapHeight: MAP_H,
    tickCount: 0,
    startTime: Date.now(),
    result: null,
    alivePlayers: 1,
    fractureCores: [],
    gravityZones: [],
    timeEchoZones: [],
    helixRelays: [],
    supplyDrops: [],
    nextSupplyDropMs: 180_000,
    bountyPlayerId: null,
    activeQuip: null,
    quipTtlMs: 0,
    incomingMeteors: [],
    ...overrides,
  };
}

const defaultInput: InputState = {
  moveVector: { x: 0, y: 0 },
  aimVector: { x: 1, y: 0 },
  isShooting: false,
  isBuilding: false,
  buildPieceType: 'wall',
  buildPosition: null,
  wantsReload: false,
};

describe('GameEngine.tickGame', () => {
  it('increments tickCount each tick', () => {
    const state = makeGameState();
    const next = tickGame(state, defaultInput, 50);
    expect(next.tickCount).toBe(1);
  });

  it('does not tick when phase is not playing', () => {
    const state = makeGameState({ phase: 'lobby' });
    const next = tickGame(state, defaultInput, 50);
    expect(next.tickCount).toBe(0);
  });

  it('moves human player in the input direction', () => {
    const state = makeGameState();
    const input: InputState = { ...defaultInput, moveVector: { x: 1, y: 0 } };
    const next = tickGame(state, input, 50);
    const human = next.players.find((p) => p.isHuman)!;
    expect(human.position.x).toBeGreaterThan(800);
  });

  it('does not move player when input is zero', () => {
    const state = makeGameState();
    const next = tickGame(state, defaultInput, 50);
    const human = next.players.find((p) => p.isHuman)!;
    expect(human.position.x).toBe(800);
    expect(human.position.y).toBe(800);
  });

  it('clamps player position to map bounds', () => {
    const state = makeGameState({
      players: [makePlayer({ position: { x: MAP_W - 1, y: MAP_H - 1 } })],
    });
    const input: InputState = { ...defaultInput, moveVector: { x: 1, y: 1 } };
    const next = tickGame(state, input, 50);
    const human = next.players.find((p) => p.isHuman)!;
    expect(human.position.x).toBeLessThanOrEqual(MAP_W);
    expect(human.position.y).toBeLessThanOrEqual(MAP_H);
  });

  it('triggers game over when only one player is alive', () => {
    const state = makeGameState({ alivePlayers: 1 });
    const next = tickGame(state, defaultInput, 50);
    expect(next.phase).toBe('game_over');
  });

  it('does not crash when all players are dead', () => {
    const deadPlayer = makePlayer({ status: 'eliminated' });
    const state = makeGameState({ players: [deadPlayer], alivePlayers: 0 });
    expect(() => tickGame(state, defaultInput, 50)).not.toThrow();
  });
});

describe('GameEngine.fireShot', () => {
  it('reduces ammo on a valid shot', () => {
    const arWeapon = {
      id: 'ar1',
      type: 'assault_rifle' as const,
      rarity: 'common' as const,
      damage: 35,
      fireRate: 5,
      magazineSize: 30,
      currentAmmo: 30,
      range: 400,
      reloadTime: 2000,
      isReloading: false,
    };
    const shooter = makePlayer({
      weapons: [arWeapon, null, null],
      activeWeaponSlot: 0,
    });
    const target = makePlayer({
      id: 'bot1',
      isHuman: false,
      position: { x: 850, y: 800 },
    });
    const state = makeGameState({ players: [shooter, target] });
    const next = fireShot(state, 'human', { x: 850, y: 800 });
    const updatedShooter = next.players.find((p) => p.id === 'human')!;
    expect(updatedShooter.weapons[0]?.currentAmmo).toBe(29);
  });

  it('damages the target player when hit', () => {
    const arWeapon = {
      id: 'ar2',
      type: 'assault_rifle' as const,
      rarity: 'common' as const,
      damage: 35,
      fireRate: 5,
      magazineSize: 30,
      currentAmmo: 30,
      range: 400,
      reloadTime: 2000,
      isReloading: false,
    };
    const shooter = makePlayer({
      weapons: [arWeapon, null, null],
      activeWeaponSlot: 0,
    });
    const target = makePlayer({
      id: 'bot1',
      isHuman: false,
      position: { x: 810, y: 800 },
    });
    const state = makeGameState({ players: [shooter, target] });
    const next = fireShot(state, 'human', { x: 810, y: 800 });
    const updatedTarget = next.players.find((p) => p.id === 'bot1')!;
    expect(updatedTarget.health).toBeLessThan(100);
  });

  it('does not fire when ammo is empty', () => {
    const emptyWeapon = {
      id: 'ar3',
      type: 'assault_rifle' as const,
      rarity: 'common' as const,
      damage: 35,
      fireRate: 5,
      magazineSize: 30,
      currentAmmo: 0,
      range: 400,
      reloadTime: 2000,
      isReloading: false,
    };
    const shooter = makePlayer({
      weapons: [emptyWeapon, null, null],
      activeWeaponSlot: 0,
    });
    const state = makeGameState({ players: [shooter] });
    const next = fireShot(state, 'human', { x: 900, y: 800 });
    const updatedShooter = next.players.find((p) => p.id === 'human')!;
    expect(updatedShooter.weapons[0]?.currentAmmo).toBe(0);
  });
});

// ─── Simulation tests ─────────────────────────────────────────────────────────

describe('GameEngine simulation (multi-tick)', () => {
  const noInput: InputState = {
    moveVector: { x: 0, y: 0 },
    aimVector: { x: 1, y: 0 },
    isShooting: false,
    isBuilding: false,
    buildPieceType: 'wall',
    buildPosition: null,
    wantsReload: false,
  };

  it('survives 200 ticks (10s) without throwing or corrupting tickCount', () => {
    const bot = makePlayer({ id: 'bot', isHuman: false, position: { x: 400, y: 400 } });
    const state = makeGameState({ players: [makePlayer(), bot], alivePlayers: 2 });
    const final = simulateTicks(state, noInput, 200);
    expect(final.tickCount).toBe(200);
  });

  it('bountyPlayerId is null when no player has 3+ kills', () => {
    const state = makeGameState();
    const final = simulateTicks(state, noInput, 20);
    expect(final.bountyPlayerId).toBeNull();
  });

  it('bountyPlayerId is set to the player with the most kills once threshold is met', () => {
    const highKiller = makePlayer({ id: 'killer', kills: 5, isHuman: false });
    const human = makePlayer({ id: 'human', kills: 0, isHuman: true });
    const state = makeGameState({ players: [human, highKiller], alivePlayers: 2 });
    const final = simulateTicks(state, noInput, 1);
    expect(final.bountyPlayerId).toBe('killer');
  });

  it('supply drop position stays within map bounds', () => {
    // Force a supply drop to spawn immediately
    const state = makeGameState({ nextSupplyDropMs: 10 });
    const final = simulateTicks(state, noInput, 5);
    for (const drop of final.supplyDrops) {
      expect(drop.position.x).toBeGreaterThanOrEqual(0);
      expect(drop.position.x).toBeLessThanOrEqual(MAP_W);
      expect(drop.position.y).toBeGreaterThanOrEqual(0);
      expect(drop.position.y).toBeLessThanOrEqual(MAP_H);
    }
  });

  it('Fracture Core corruption never kills the holder (floor at 1 HP)', () => {
    const player = makePlayer({
      id: 'human',
      health: 10,
      heldCoreEffect: 'damage_amp',
      corruptionDps: 100, // extreme drain
    });
    const state = makeGameState({ players: [player] });
    // Run for 5 full seconds — enough for 500 HP of drain
    const final = simulateTicks(state, noInput, 100);
    const h = final.players.find((p) => p.id === 'human')!;
    expect(h.health).toBeGreaterThanOrEqual(1);
    expect(h.status).toBe('alive');
  });

  it('Helix Relay reward does not fire again before cooldown expires', () => {
    const relay = {
      id: 'r1',
      position: { x: 800, y: 800 },
      captureRadius: 500, // enormous — human always inside
      captureProgress: 0,
      capturedById: null,
      rewardCooldownMs: 0,
    };
    const state = makeGameState({ helixRelays: [relay] });

    // Run long enough to trigger first capture reward (5s = 100 ticks)
    const afterCapture = simulateTicks(state, noInput, 100);
    const initialLootCount = afterCapture.lootDrops.length;

    // Run one more tick immediately — cooldown is 60s, no second reward yet
    const afterExtra = simulateTicks(afterCapture, noInput, 1);
    expect(afterExtra.lootDrops.length).toBe(initialLootCount);
  });

  it('second Fracture Core pickup is blocked while player already holds one', () => {
    const core1 = { id: 'c1', position: { x: 800, y: 800 }, effect: 'damage_amp' as const, corruptionDps: 5 };
    const core2 = { id: 'c2', position: { x: 800, y: 800 }, effect: 'cooldown_reduction' as const, corruptionDps: 5 };
    const player = makePlayer({ position: { x: 800, y: 800 } });
    const state = makeGameState({ players: [player], fractureCores: [core1, core2] });
    const final = simulateTicks(state, noInput, 1);
    const h = final.players.find((p) => p.id === 'human')!;
    // Player should hold exactly one core — no double-stacking
    expect(h.heldCoreEffect).not.toBeNull();
    // At least one core should remain unclaimed (can't hold both)
    expect(final.fractureCores.length).toBeGreaterThanOrEqual(1);
  });
});
