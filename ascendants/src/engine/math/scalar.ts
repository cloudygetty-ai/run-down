/** Scalar helpers shared by every simulation subsystem. */

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function sign(value: number): number {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

/** Step `current` toward `target` by at most `maxDelta`. */
export function approach(current: number, target: number, maxDelta: number): number {
  const diff = target - current;
  if (diff > maxDelta) {
    return current + maxDelta;
  }
  if (diff < -maxDelta) {
    return current - maxDelta;
  }
  return target;
}

/** Map `value` from [inMin, inMax] onto [outMin, outMax], clamped. */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) {
    return outMin;
  }
  return lerp(outMin, outMax, (value - inMin) / (inMax - inMin));
}
