import {
  ARENA_CEILING,
  ARENA_RADIUS,
  FLOOR_Y,
  GRAVITY,
  JUGGLE_GRAVITY_STEP,
  MAX_FALL_SPEED,
  PUSHBACK_DECAY,
} from '../data/constants';
import { atan2, rotateToward } from '../math/trig';
import { add, scale, vec3 } from '../math/vec3';
import { forwardVector } from '../combat/hitbox';
import { FIGHTER_RADIUS, type Fighter } from '../types/fighter';

/**
 * Physics and world constraints.
 *
 * Velocity is reserved for forces the player does not directly steer — gravity,
 * launches, pushback. Deliberate locomotion writes to position instead. Keeping
 * the two separate means a walk input can never fight a knockback impulse for
 * ownership of the same number, which is the usual source of "my character
 * slid" bugs.
 */

const AIR_DRAG = 0.985;
const FLIGHT_VERTICAL_DAMP = 0.86;

export function tickPhysics(fighter: Fighter): void {
  if (fighter.hitstop > 0) {
    return;
  }

  const { x: vx, z: vz } = fighter.vel;
  let vy = fighter.vel.y;

  if (fighter.flying) {
    vy *= FLIGHT_VERTICAL_DAMP;
  } else if (!fighter.grounded) {
    // Each juggle point adds gravity, so a long combo drops the victim out
    // naturally instead of needing a hard hit-count cutoff.
    vy -= GRAVITY * (1 + fighter.juggle * JUGGLE_GRAVITY_STEP);
    if (vy < -MAX_FALL_SPEED) {
      vy = -MAX_FALL_SPEED;
    }
  }

  fighter.pos = add(fighter.pos, vec3(vx, vy, vz));

  // Horizontal drag only: vertical velocity was already resolved above, by
  // flight damping or by gravity.
  const drag = fighter.grounded ? PUSHBACK_DECAY : AIR_DRAG;
  fighter.vel = vec3(vx * drag, vy, vz * drag);

  landAndBound(fighter);
}

function landAndBound(fighter: Fighter): void {
  if (fighter.pos.y <= FLOOR_Y) {
    const wasAirborne = !fighter.grounded;
    fighter.pos = vec3(fighter.pos.x, FLOOR_Y, fighter.pos.z);
    fighter.vel = vec3(fighter.vel.x, 0, fighter.vel.z);
    fighter.grounded = true;
    fighter.flying = false;
    fighter.juggle = 0;
    if (wasAirborne && fighter.state === 'launched') {
      fighter.state = 'knockdown';
      fighter.stateFrame = 0;
    }
  } else {
    fighter.grounded = false;
  }

  if (fighter.pos.y > ARENA_CEILING) {
    fighter.pos = vec3(fighter.pos.x, ARENA_CEILING, fighter.pos.z);
    fighter.vel = vec3(fighter.vel.x, Math.min(0, fighter.vel.y), fighter.vel.z);
  }

  clampToArena(fighter);
}

/** The arena is a disc with an invisible cylinder wall; nobody leaves it. */
export function clampToArena(fighter: Fighter): void {
  const limit = ARENA_RADIUS - FIGHTER_RADIUS;
  const r = Math.sqrt(fighter.pos.x * fighter.pos.x + fighter.pos.z * fighter.pos.z);
  if (r <= limit || r === 0) {
    return;
  }
  const k = limit / r;
  fighter.pos = vec3(fighter.pos.x * k, fighter.pos.y, fighter.pos.z * k);
  fighter.vel = vec3(fighter.vel.x * 0.2, fighter.vel.y, fighter.vel.z * 0.2);
}

/** Translate along the fighter's own axes: +forward is toward their facing. */
export function translateLocal(fighter: Fighter, forward: number, strafe: number): void {
  const fwd = forwardVector(fighter.facing);
  // Right-hand perpendicular of the forward vector on the XZ plane.
  const right = vec3(fwd.z, 0, -fwd.x);
  fighter.pos = add(fighter.pos, add(scale(fwd, forward), scale(right, strafe)));
  clampToArena(fighter);
}

export function translateVertical(fighter: Fighter, amount: number): void {
  fighter.pos = vec3(fighter.pos.x, fighter.pos.y + amount, fighter.pos.z);
  if (fighter.pos.y < FLOOR_Y) {
    fighter.pos = vec3(fighter.pos.x, FLOOR_Y, fighter.pos.z);
  }
}

const TURN_RATE = 0.32;

/** Lock-on: fighters continuously orient toward their opponent. */
export function faceOpponent(fighter: Fighter, opponentX: number, opponentZ: number, instant = false): void {
  const desired = atan2(opponentX - fighter.pos.x, opponentZ - fighter.pos.z);
  fighter.facing = instant ? desired : rotateToward(fighter.facing, desired, TURN_RATE);
}

/** Stop two fighters occupying the same space, pushing each apart evenly. */
export function separate(a: Fighter, b: Fighter): void {
  const dx = b.pos.x - a.pos.x;
  const dz = b.pos.z - a.pos.z;
  const distSq = dx * dx + dz * dz;
  const minDist = FIGHTER_RADIUS * 2;
  if (distSq >= minDist * minDist) {
    return;
  }
  const dist = Math.sqrt(distSq);
  if (dist === 0) {
    // Perfectly co-located: nudge along a fixed axis so the result stays
    // deterministic rather than depending on a random direction.
    a.pos = vec3(a.pos.x - minDist / 2, a.pos.y, a.pos.z);
    b.pos = vec3(b.pos.x + minDist / 2, b.pos.y, b.pos.z);
    return;
  }
  const overlap = (minDist - dist) / 2;
  const nx = (dx / dist) * overlap;
  const nz = (dz / dist) * overlap;
  a.pos = vec3(a.pos.x - nx, a.pos.y, a.pos.z - nz);
  b.pos = vec3(b.pos.x + nx, b.pos.y, b.pos.z + nz);
  clampToArena(a);
  clampToArena(b);
}
