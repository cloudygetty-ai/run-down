/**
 * Deterministic randomness.
 *
 * INVARIANT: the simulation never calls Math.random. Every stochastic decision
 * draws from a seeded stream stored in state, so a save file replays exactly.
 */

/** mulberry32 — small, fast, good enough for terrain and event draws. */
export const makeRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stable 2-D hash in [0,1). Used for terrain and per-tile render variance. */
export const hash2 = (x, y, seed = 0) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const smooth = (t) => t * t * (3 - 2 * t);

/** Value noise over the tile plane at the given cell size. */
export const noise2 = (x, y, scale, seed) => {
  const px = x / scale;
  const py = y / scale;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const fx = smooth(px - x0);
  const fy = smooth(py - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
};

/** Pick one weighted entry. `weightOf` must return a non-negative number. */
export const weightedPick = (items, weightOf, roll) => {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (total <= 0) return null;
  let cursor = roll * total;
  for (const item of items) {
    cursor -= Math.max(0, weightOf(item));
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
};
