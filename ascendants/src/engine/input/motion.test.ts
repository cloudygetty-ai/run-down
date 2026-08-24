import { describe, expect, it } from 'vitest';
import { isDoubleTap, matchesHold, matchesMotion } from './motion';

const QCF = [2, 3, 6];
const DP = [6, 2, 3];
const SUPER = [2, 3, 6, 2, 3, 6];

describe('motion recognition', () => {
  it('accepts a clean quarter-circle forward', () => {
    expect(matchesMotion([5, 5, 2, 3, 6], QCF)).toBe(true);
  });

  it('accepts a quarter-circle with the diagonal skipped', () => {
    // Players routinely roll straight from down to forward; the game has to
    // read that as the same input or specials feel broken.
    expect(matchesMotion([5, 2, 6], QCF)).toBe(true);
  });

  it('tolerates neutral frames inside the motion', () => {
    expect(matchesMotion([2, 5, 3, 5, 6], QCF)).toBe(true);
  });

  it('rejects the motion entered backwards', () => {
    expect(matchesMotion([6, 3, 2], QCF)).toBe(false);
  });

  it('rejects a motion that never reached forward', () => {
    expect(matchesMotion([5, 2, 3], QCF)).toBe(false);
  });

  it('distinguishes a dragon punch from a quarter-circle', () => {
    expect(matchesMotion([6, 2, 3], DP)).toBe(true);
    expect(matchesMotion([2, 3, 6], DP)).toBe(false);
  });

  it('accepts a super motion with both diagonals skipped', () => {
    expect(matchesMotion([2, 6, 2, 6], SUPER)).toBe(true);
  });

  it('still requires the first and last direction of a motion', () => {
    // Leniency must not go so far that a quarter-circle answers a dragon punch.
    expect(matchesMotion([2, 3], QCF)).toBe(false);
    expect(matchesMotion([2, 6], DP)).toBe(false);
  });

  it('reads a double quarter-circle super', () => {
    expect(matchesMotion([2, 3, 6, 2, 3, 6], SUPER)).toBe(true);
    expect(matchesMotion([2, 3, 6], SUPER)).toBe(false);
  });

  it('treats an empty motion as always satisfied', () => {
    expect(matchesMotion([], [])).toBe(true);
    expect(matchesMotion([5], [])).toBe(true);
  });

  it('accepts diagonals for a cardinal hold requirement', () => {
    expect(matchesHold(1, 2)).toBe(true);
    expect(matchesHold(3, 2)).toBe(true);
    expect(matchesHold(2, 2)).toBe(true);
    expect(matchesHold(8, 2)).toBe(false);
  });

  it('treats a zero hold requirement as no requirement', () => {
    expect(matchesHold(4, 0)).toBe(true);
  });

  it('detects a double tap only when the direction was released between', () => {
    expect(isDoubleTap([6, 5, 6], 6, 10)).toBe(true);
    expect(isDoubleTap([6, 6, 6], 6, 10)).toBe(false);
    expect(isDoubleTap([6, 5, 4], 6, 10)).toBe(false);
  });
});
