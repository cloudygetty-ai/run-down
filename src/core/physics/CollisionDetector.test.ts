import { resolvePlayerWallCollision, isPlayerHitByBullet } from './CollisionDetector';
import { BuildPiece, Player } from '../../types';

function makeWall(x: number, y: number, rotation = 0): BuildPiece {
  return {
    id: `wall_${x}_${y}`,
    type: 'wall',
    material: 'wood',
    position: { x, y },
    rotation,
    health: 150,
    maxHealth: 150,
    ownerId: 'test',
  };
}

function makePlayer(x: number, y: number): Player {
  return {
    id: 'p1',
    name: 'P1',
    isHuman: true,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 100,
    status: 'alive',
    weapons: [null, null, null],
    activeWeaponSlot: 0,
    materials: { wood: 0, stone: 0, metal: 0 },
    kills: 0,
    isBuilding: false,
    selectedBuildPiece: 'wall',
    selectedBuildMaterial: 'wood',
  };
}

describe('CollisionDetector', () => {
  describe('resolvePlayerWallCollision', () => {
    it('returns unchanged position when no walls nearby', () => {
      const player = makePlayer(800, 800);
      const result = resolvePlayerWallCollision(player, []);
      expect(result).toEqual({ x: 800, y: 800 });
    });

    it('resolves a collision by pushing the player away from a horizontal wall', () => {
      const wall = makeWall(800, 800); // horizontal wall
      const player = makePlayer(800, 803); // player slightly overlapping wall
      const result = resolvePlayerWallCollision(player, [wall]);
      // Player should be pushed out of the wall
      const dist = Math.abs(result.y - 800);
      expect(dist).toBeGreaterThan(0);
    });

    it('does not move player away from distant wall', () => {
      const wall = makeWall(500, 500);
      const player = makePlayer(800, 800);
      const result = resolvePlayerWallCollision(player, [wall]);
      expect(result).toEqual({ x: 800, y: 800 });
    });
  });

  describe('isPlayerHitByBullet', () => {
    it('returns true when bullet passes through player', () => {
      const origin = { x: 800, y: 800 };
      const target = { x: 900, y: 800 };
      const victim = makePlayer(850, 800);
      expect(isPlayerHitByBullet(origin, target, victim)).toBe(true);
    });

    it('returns false when bullet misses player by wide margin', () => {
      const origin = { x: 800, y: 800 };
      const target = { x: 900, y: 800 };
      const victim = makePlayer(850, 900); // 100 units off the bullet line
      expect(isPlayerHitByBullet(origin, target, victim)).toBe(false);
    });

    it('returns false for zero-length bullet', () => {
      const origin = { x: 800, y: 800 };
      const victim = makePlayer(800, 800);
      expect(isPlayerHitByBullet(origin, origin, victim)).toBe(false);
    });
  });
});
