import {
  distance,
  normalize,
  lerp,
  lerpVec2,
  angleBetween,
  clamp,
  randomInRange,
  randomInt,
  isInsideCircle,
} from './math';

describe('math utils', () => {
  describe('distance', () => {
    it('returns 0 for same point', () => {
      expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });
    it('returns correct distance for known values', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
    });
  });

  describe('normalize', () => {
    it('returns unit vector', () => {
      const n = normalize({ x: 3, y: 4 });
      const len = Math.sqrt(n.x * n.x + n.y * n.y);
      expect(len).toBeCloseTo(1);
    });
    it('returns zero vector for zero input', () => {
      expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    });
  });

  describe('lerp', () => {
    it('returns a at t=0', () => expect(lerp(0, 10, 0)).toBe(0));
    it('returns b at t=1', () => expect(lerp(0, 10, 1)).toBe(10));
    it('returns midpoint at t=0.5', () => expect(lerp(0, 10, 0.5)).toBe(5));
    it('clamps t below 0', () => expect(lerp(0, 10, -1)).toBe(0));
    it('clamps t above 1', () => expect(lerp(0, 10, 2)).toBe(10));
  });

  describe('clamp', () => {
    it('clamps below min', () => expect(clamp(-5, 0, 10)).toBe(0));
    it('clamps above max', () => expect(clamp(15, 0, 10)).toBe(10));
    it('passes through value in range', () => expect(clamp(5, 0, 10)).toBe(5));
  });

  describe('isInsideCircle', () => {
    it('returns true for point at center', () => {
      expect(isInsideCircle({ x: 0, y: 0 }, { x: 0, y: 0 }, 100)).toBe(true);
    });
    it('returns true for point on boundary', () => {
      expect(isInsideCircle({ x: 100, y: 0 }, { x: 0, y: 0 }, 100)).toBe(true);
    });
    it('returns false for point outside', () => {
      expect(isInsideCircle({ x: 200, y: 0 }, { x: 0, y: 0 }, 100)).toBe(false);
    });
  });

  describe('randomInRange', () => {
    it('returns values within range', () => {
      for (let i = 0; i < 100; i++) {
        const v = randomInRange(5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThan(10);
      }
    });
  });

  describe('randomInt', () => {
    it('returns integers within inclusive range', () => {
      const values = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const v = randomInt(1, 3);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(3);
        values.add(v);
      }
      expect(values.size).toBe(3); // should hit all three values
    });
  });
});
