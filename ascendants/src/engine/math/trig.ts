/**
 * Deterministic trigonometry.
 *
 * WHY: rollback netcode re-simulates past frames independently on every peer
 * and demands bit-identical results. IEEE-754 exactly specifies + - * / and
 * sqrt, but Math.sin/cos/atan2 are implementation-defined and drift between
 * JS engines, CPU architectures and browser versions. A single ULP of drift in
 * a facing angle compounds into a desync within seconds. Every angle in the
 * simulation therefore routes through these polynomial approximations, which
 * use only exactly-specified operations (Math.round and Math.abs are also
 * exactly specified, so they are safe).
 */

export const PI = 3.141592653589793;
export const TWO_PI = 6.283185307179586;
export const HALF_PI = 1.5707963267948966;

// Reciprocal factorials for the odd Taylor series of sin. Degree 15 on the
// reduced domain [-PI/2, PI/2] holds absolute error under 1e-11 — orders of
// magnitude tighter than any gameplay tolerance, and cheap at 7 multiplies.
const R3 = 1 / 6;
const R5 = 1 / 120;
const R7 = 1 / 5040;
const R9 = 1 / 362880;
const R11 = 1 / 39916800;
const R13 = 1 / 6227020800;
const R15 = 1 / 1307674368000;

/** sin for arguments already reduced to [-PI/2, PI/2]. */
function sinCore(x: number): number {
  const u = x * x;
  const series =
    1 - u * (R3 - u * (R5 - u * (R7 - u * (R9 - u * (R11 - u * (R13 - u * R15))))));
  return x * series;
}

export function sin(x: number): number {
  // Fold to [-PI, PI], then mirror the outer quadrants into [-PI/2, PI/2]
  // where the series is most accurate.
  let a = x - TWO_PI * Math.round(x / TWO_PI);
  if (a > HALF_PI) {
    a = PI - a;
  } else if (a < -HALF_PI) {
    a = -PI - a;
  }
  return sinCore(a);
}

export function cos(x: number): number {
  return sin(x + HALF_PI);
}

// Minimax coefficients for atan on [0, 1]; max error ~1e-5 rad (0.0006 deg),
// which is imperceptible for facing and aim angles.
const A1 = 0.999866;
const A3 = -0.3302995;
const A5 = 0.180141;
const A7 = -0.085133;
const A9 = 0.0208351;

/** atan for a ratio in [0, 1]. */
function atanCore(z: number): number {
  const u = z * z;
  return z * (A1 + u * (A3 + u * (A5 + u * (A7 + u * A9))));
}

export function atan2(y: number, x: number): number {
  if (x === 0 && y === 0) {
    return 0;
  }
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  // Keep the ratio inside [0, 1] so the polynomial stays in its fitted domain.
  let r = ax >= ay ? atanCore(ay / ax) : HALF_PI - atanCore(ax / ay);
  if (x < 0) {
    r = PI - r;
  }
  return y < 0 ? -r : r;
}

/**
 * Fold any angle into [-PI, PI].
 *
 * Exactly +PI maps to -PI, because Math.round breaks a .5 tie upward. The two
 * represent the same direction, so the choice is arbitrary — but it is fixed
 * and identical on every machine, which is the only property rollback needs.
 */
export function wrapAngle(a: number): number {
  return a - TWO_PI * Math.round(a / TWO_PI);
}

/** Shortest signed rotation from `from` to `to`. */
export function angleDelta(from: number, to: number): number {
  return wrapAngle(to - from);
}

/**
 * Rotate `from` toward `to` by at most `maxStep` radians, taking the short way
 * around. For an exactly antipodal target both ways are equally short and the
 * turn resolves negative — arbitrary, but deterministic.
 */
export function rotateToward(from: number, to: number, maxStep: number): number {
  const delta = angleDelta(from, to);
  if (delta > maxStep) {
    return wrapAngle(from + maxStep);
  }
  if (delta < -maxStep) {
    return wrapAngle(from - maxStep);
  }
  return wrapAngle(to);
}
