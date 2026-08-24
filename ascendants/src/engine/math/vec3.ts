/** Immutable 3D vector helpers. Y is up; the arena floor sits at y = 0. */

export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

export const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function lengthSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

export function length(v: Vec3): number {
  // Math.sqrt is correctly rounded per IEEE-754, so it is rollback-safe.
  return Math.sqrt(lengthSq(v));
}

export function distanceSq(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return dx * dx + dy * dy + dz * dz;
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.sqrt(distanceSq(a, b));
}

/** Horizontal (XZ) distance — the plane that drives spacing and lock-on. */
export function distanceXZ(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  return len === 0 ? ZERO : scale(v, 1 / len);
}

/** Clamp a vector's magnitude without changing its direction. */
export function clampLength(v: Vec3, max: number): Vec3 {
  const len = length(v);
  return len <= max || len === 0 ? v : scale(v, max / len);
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    z: a.z + (b.z - a.z) * k,
  };
}

export function withY(v: Vec3, y: number): Vec3 {
  return { x: v.x, y, z: v.z };
}
