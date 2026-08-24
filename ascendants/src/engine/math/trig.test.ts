import { describe, expect, it } from 'vitest';
import { atan2, cos, HALF_PI, PI, rotateToward, sin, TWO_PI, wrapAngle } from './trig';

describe('deterministic trig', () => {
  it('matches Math.sin closely across a full turn', () => {
    for (let i = -720; i <= 720; i += 7) {
      const angle = (i / 720) * TWO_PI * 2;
      expect(sin(angle)).toBeCloseTo(Math.sin(angle), 9);
    }
  });

  it('matches Math.cos closely across a full turn', () => {
    for (let i = -360; i <= 360; i += 5) {
      const angle = (i / 360) * TWO_PI;
      expect(cos(angle)).toBeCloseTo(Math.cos(angle), 9);
    }
  });

  it('hits the cardinal values exactly enough to trust', () => {
    expect(sin(0)).toBeCloseTo(0, 12);
    expect(sin(HALF_PI)).toBeCloseTo(1, 10);
    expect(cos(0)).toBeCloseTo(1, 10);
    expect(cos(PI)).toBeCloseTo(-1, 10);
  });

  it('resolves atan2 in every quadrant', () => {
    const cases: Array<[number, number]> = [
      [1, 1], [1, -1], [-1, -1], [-1, 1], [0, 1], [0, -1], [1, 0], [-1, 0], [3, 4], [-7, 2],
    ];
    for (const [y, x] of cases) {
      expect(atan2(y, x)).toBeCloseTo(Math.atan2(y, x), 4);
    }
  });

  it('returns a stable zero for the degenerate origin', () => {
    expect(atan2(0, 0)).toBe(0);
  });

  it('is bit-identical when called repeatedly — the rollback requirement', () => {
    const first: number[] = [];
    const second: number[] = [];
    for (let i = 0; i < 500; i++) {
      first.push(sin(i * 0.37), cos(i * 0.37), atan2(i - 250, 17));
    }
    for (let i = 0; i < 500; i++) {
      second.push(sin(i * 0.37), cos(i * 0.37), atan2(i - 250, 17));
    }
    expect(first).toEqual(second);
  });

  it('wraps angles into [-PI, PI]', () => {
    expect(wrapAngle(3 * TWO_PI + 0.5)).toBeCloseTo(0.5, 10);
    expect(wrapAngle(-3 * TWO_PI - 0.5)).toBeCloseTo(-0.5, 10);
    expect(Math.abs(wrapAngle(12.3))).toBeLessThanOrEqual(PI);
  });

  it('rotates the short way around the wrap point', () => {
    // From just under +PI to just over -PI is a small step, not a near-full turn.
    const from = PI - 0.05;
    const to = -PI + 0.05;
    const result = rotateToward(from, to, 0.2);
    expect(Math.abs(wrapAngle(result - to))).toBeLessThan(1e-9);
  });

  it('clamps rotation to the step size', () => {
    expect(rotateToward(0, PI / 2, 0.1)).toBeCloseTo(0.1, 10);
    expect(rotateToward(0, -PI / 2, 0.1)).toBeCloseTo(-0.1, 10);
  });

  it('snaps to the target when it is within one step', () => {
    expect(rotateToward(1, 1.05, 0.2)).toBeCloseTo(1.05, 10);
  });

  it('breaks the antipodal tie the same way every time', () => {
    // Turning to face exactly behind you has no short way round. Either
    // direction is correct; being consistent about which is what matters.
    const results = Array.from({ length: 5 }, () => rotateToward(0, PI, 0.1));
    expect(new Set(results).size).toBe(1);
    expect(Math.abs(results[0] as number)).toBeCloseTo(0.1, 10);
  });
});
