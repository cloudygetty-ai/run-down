import { describe, expect, it } from 'vitest';
import { cloneRng, nextFloat, nextInt, nextUint32, seedRng } from './rng';

describe('seeded rng', () => {
  it('reproduces the same stream for the same seed', () => {
    const a = seedRng(12345);
    const b = seedRng(12345);
    for (let i = 0; i < 200; i++) {
      expect(nextUint32(a)).toBe(nextUint32(b));
    }
  });

  it('diverges immediately for adjacent seeds', () => {
    const a = seedRng(1);
    const b = seedRng(2);
    expect(nextUint32(a)).not.toBe(nextUint32(b));
  });

  it('produces floats inside [0, 1)', () => {
    const state = seedRng(99);
    for (let i = 0; i < 1000; i++) {
      const value = nextFloat(state);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps integers inside the requested range', () => {
    const state = seedRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = nextInt(state, 3, 9);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
  });

  it('resumes identically from a cloned state — the rollback case', () => {
    const original = seedRng(555);
    for (let i = 0; i < 50; i++) {
      nextUint32(original);
    }
    const snapshot = cloneRng(original);
    const afterOriginal = [nextUint32(original), nextUint32(original), nextUint32(original)];
    const afterSnapshot = [nextUint32(snapshot), nextUint32(snapshot), nextUint32(snapshot)];
    expect(afterSnapshot).toEqual(afterOriginal);
  });
});
