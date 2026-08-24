/**
 * Motion input recognition.
 *
 * Matching is a backwards subsequence search over the recent direction history
 * rather than an exact sequence compare, which buys neutral frames mid-motion
 * and sloppy timing for free while the bounded window stops a motion from a
 * second ago counting now.
 *
 * Subsequence matching alone is still too strict for real hands: players roll
 * straight from down to forward without ever registering the diagonal, and a
 * quarter-circle that demands 2-3-6 exactly feels broken. So each motion also
 * matches a reduced variant with its interior diagonals dropped. The first and
 * last directions are always required — those are what separate a
 * quarter-circle from a dragon punch.
 */

export const MOTION_WINDOW = 15;

/** Diagonals that a cardinal hold should also accept. */
const HOLD_EQUIVALENTS: Record<number, readonly number[]> = {
  1: [1],
  2: [1, 2, 3],
  3: [3],
  4: [1, 4, 7],
  5: [5],
  6: [3, 6, 9],
  7: [7],
  8: [7, 8, 9],
  9: [9],
};

const DIAGONALS = new Set([1, 3, 7, 9]);

/**
 * Memoised per motion. This is pure derivation keyed by the input, so the cache
 * cannot introduce state that a rollback would need to rewind.
 */
const variantCache = new Map<string, number[][]>();

function variantsOf(motion: readonly number[]): number[][] {
  const key = motion.join(',');
  const cached = variantCache.get(key);
  if (cached) {
    return cached;
  }
  const reduced = motion.filter(
    (dir, i) => i === 0 || i === motion.length - 1 || !DIAGONALS.has(dir),
  );
  const variants =
    reduced.length === motion.length ? [motion.slice()] : [motion.slice(), reduced];
  variantCache.set(key, variants);
  return variants;
}

/** Strict backwards subsequence match of one exact direction sequence. */
function matchesExact(dirs: readonly number[], motion: readonly number[]): boolean {
  let m = motion.length - 1;
  for (let i = dirs.length - 1; i >= 0 && m >= 0; i--) {
    if (dirs[i] === motion[m]) {
      m--;
    }
  }
  return m < 0;
}

/**
 * @param dirs directions from the recent window, oldest first
 * @param motion required numpad sequence, e.g. [2,3,6]
 */
export function matchesMotion(dirs: readonly number[], motion: readonly number[]): boolean {
  if (motion.length === 0) {
    return true;
  }
  for (const variant of variantsOf(motion)) {
    if (matchesExact(dirs, variant)) {
      return true;
    }
  }
  return false;
}

/** Whether a currently-held direction satisfies a move's `holdDir` requirement. */
export function matchesHold(currentDir: number, required: number): boolean {
  if (required === 0) {
    return true;
  }
  const accepted = HOLD_EQUIVALENTS[required];
  return accepted ? accepted.includes(currentDir) : currentDir === required;
}

/**
 * Detect a double-tap of `dir` (the universal dash input) within `window`
 * frames: two separate presses of the direction separated by a release.
 */
export function isDoubleTap(dirs: readonly number[], dir: number, window: number): boolean {
  let taps = 0;
  let wasHeld = false;
  const start = Math.max(0, dirs.length - window);
  for (let i = start; i < dirs.length; i++) {
    const held = matchesHold(dirs[i] ?? 5, dir);
    if (held && !wasHeld) {
      taps++;
    }
    wasHeld = held;
  }
  return taps >= 2;
}
