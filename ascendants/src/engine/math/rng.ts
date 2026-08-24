/**
 * Seeded xorshift128 PRNG.
 *
 * WHY: Math.random cannot appear anywhere in the simulation — rollback
 * re-simulates the same frame many times and every replay must produce the
 * same numbers. This generator's state is four uint32s, so it is trivially
 * snapshot-and-restored alongside the rest of the game state, and it uses only
 * exactly-specified integer operations.
 */

export type RngState = { a: number; b: number; c: number; d: number };

/** Build a generator state from any integer seed. */
export function seedRng(seed: number): RngState {
  // splitmix-style avalanche so that adjacent seeds diverge immediately.
  let h = seed >>> 0;
  const next = (): number => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  return { a: next(), b: next(), c: next(), d: next() || 1 };
}

export function cloneRng(state: RngState): RngState {
  return { a: state.a, b: state.b, c: state.c, d: state.d };
}

/** Advance the state in place and return the raw uint32 draw. */
export function nextUint32(state: RngState): number {
  const t = state.d ^ (state.d << 11);
  state.d = state.c;
  state.c = state.b;
  state.b = state.a;
  state.a = (state.a ^ (state.a >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
  return state.a;
}

/** Uniform float in [0, 1). */
export function nextFloat(state: RngState): number {
  return nextUint32(state) / 4294967296;
}

/** Uniform float in [min, max). */
export function nextRange(state: RngState, min: number, max: number): number {
  return min + nextFloat(state) * (max - min);
}

/** Uniform integer in [min, max] inclusive. */
export function nextInt(state: RngState, min: number, max: number): number {
  return min + Math.floor(nextFloat(state) * (max - min + 1));
}
