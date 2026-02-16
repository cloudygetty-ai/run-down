import { tickGame, fireShot, InputState } from './GameEngine';
import { GameState, Player } from '../../types';
import { createInitialBombardment } from '../meteor';

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
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
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
    const human = next.players.find(p => p.isHuman)!;
    expect(human.position.x).toBeGreaterThan(800);
  });

  it('does not move player when input is zero', () => {
    const state = makeGameState();
    const next = tickGame(state, defaultInput, 50);
    const human = next.players.find(p => p.isHuman)!;
    expect(human.position.x).toBe(800);
    expect(human.position.y).toBe(800);
  });

  it('clamps player position to map bounds', () => {
    const state = makeGameState({
      players: [makePlayer({ position: { x: MAP_W - 1, y: MAP_H - 1 } })],
    });
    const input: InputState = { ...defaultInput, moveVector: { x: 1, y: 1 } };
    const next = tickGame(state, input, 50);
    const human = next.players.find(p => p.isHuman)!;
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
    const target = makePlayer({ id: 'bot1', isHuman: false, position: { x: 850, y: 800 } });
    const state = makeGameState({ players: [shooter, target] });
    const next = fireShot(state, 'human', { x: 850, y: 800 });
    const updatedShooter = next.players.find(p => p.id === 'human')!;
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
    const shooter = makePlayer({ weapons: [arWeapon, null, null], activeWeaponSlot: 0 });
    const target = makePlayer({ id: 'bot1', isHuman: false, position: { x: 810, y: 800 } });
    const state = makeGameState({ players: [shooter, target] });
    const next = fireShot(state, 'human', { x: 810, y: 800 });
    const updatedTarget = next.players.find(p => p.id === 'bot1')!;
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
    const shooter = makePlayer({ weapons: [emptyWeapon, null, null], activeWeaponSlot: 0 });
    const state = makeGameState({ players: [shooter] });
    const next = fireShot(state, 'human', { x: 900, y: 800 });
    const updatedShooter = next.players.find(p => p.id === 'human')!;
    expect(updatedShooter.weapons[0]?.currentAmmo).toBe(0);
  });
});
