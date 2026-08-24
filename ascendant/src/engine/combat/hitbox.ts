import { cos, sin } from '../math/trig';
import { add, scale, sub, vec3, type Vec3 } from '../math/vec3';
import { FIGHTER_HEIGHT, FIGHTER_RADIUS, type Fighter } from '../types/fighter';
import type { Hitbox } from '../types/move';

/**
 * Capsule collision.
 *
 * Every collider in the game — a limb's hitbox, a body's hurtbox, a beam — is a
 * capsule, so there is exactly one intersection test to get right and it is
 * cheap: the distance between two segments compared against summed radii.
 */

export type Capsule = { a: Vec3; b: Vec3; radius: number };

/** Rotate a fighter-local offset into world space (yaw only; +z is forward). */
export function toWorld(local: Vec3, facing: number): Vec3 {
  const s = sin(facing);
  const c = cos(facing);
  return vec3(local.x * c + local.z * s, local.y, -local.x * s + local.z * c);
}

export function forwardVector(facing: number): Vec3 {
  return vec3(sin(facing), 0, cos(facing));
}

/** Place a move's local hitbox into world space for the given fighter. */
export function hitboxCapsule(fighter: Fighter, boxDef: Hitbox): Capsule {
  const a = add(fighter.pos, toWorld(boxDef.offset, fighter.facing));
  const b = add(a, scale(forwardVector(fighter.facing), boxDef.length));
  return { a, b, radius: boxDef.radius };
}

/** A fighter's hurtbox: an upright capsule spanning their body. */
export function bodyCapsule(fighter: Fighter): Capsule {
  const foot = vec3(fighter.pos.x, fighter.pos.y + FIGHTER_RADIUS, fighter.pos.z);
  const head = vec3(fighter.pos.x, fighter.pos.y + FIGHTER_HEIGHT - FIGHTER_RADIUS, fighter.pos.z);
  return { a: foot, b: head, radius: FIGHTER_RADIUS };
}

export function sphereCapsule(center: Vec3, radius: number): Capsule {
  return { a: center, b: center, radius };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Squared distance between two segments (Ericson, Real-Time Collision
 * Detection). Kept squared so the common case never pays for a sqrt.
 */
export function segmentDistanceSq(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): number {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = d1.x * d1.x + d1.y * d1.y + d1.z * d1.z;
  const e = d2.x * d2.x + d2.y * d2.y + d2.z * d2.z;
  const f = d2.x * r.x + d2.y * r.y + d2.z * r.z;
  const EPS = 1e-9;

  let s: number;
  let t: number;

  if (a <= EPS && e <= EPS) {
    return r.x * r.x + r.y * r.y + r.z * r.z;
  }
  if (a <= EPS) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = d1.x * r.x + d1.y * r.y + d1.z * r.z;
    if (e <= EPS) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = d1.x * d2.x + d1.y * d2.y + d1.z * d2.z;
      const denom = a * e - b * b;
      s = denom !== 0 ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }

  const c1 = add(p1, scale(d1, s));
  const c2 = add(p2, scale(d2, t));
  const diff = sub(c1, c2);
  return diff.x * diff.x + diff.y * diff.y + diff.z * diff.z;
}

export function capsulesOverlap(x: Capsule, y: Capsule): boolean {
  const reach = x.radius + y.radius;
  return segmentDistanceSq(x.a, x.b, y.a, y.b) <= reach * reach;
}

/** Midpoint of a capsule — used as the spawn point for impact effects. */
export function capsuleCenter(c: Capsule): Vec3 {
  return vec3((c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2, (c.a.z + c.b.z) / 2);
}
