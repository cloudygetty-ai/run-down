import { ARENA_RADIUS, BURNOUT_BLOCKSTUN_BONUS, CLASH_FRAMES, CLASH_PUSH, DRIVE_PARRY_GAIN, DRIVE_PARRY_STARTUP } from '../data/constants';
import { atan2, cos, sin, wrapAngle } from '../math/trig';
import { add, normalize, scale, sub, vec3, type Vec3 } from '../math/vec3';
import type { Fighter } from '../types/fighter';
import type { MatchState, Projectile } from '../types/match';
import type { ProjectileSpec } from '../types/move';
import { applyBlock, applyParry, type CombatContext } from './apply';
import { applyDamage } from './damage';
import { bodyCapsule, capsulesOverlap, forwardVector, sphereCapsule, toWorld } from './hitbox';
import { isInvulnerable } from './resolve';

/**
 * Projectiles and beam clashes.
 *
 * Beams are projectiles with a high clash power rather than a separate entity
 * type. That means the beam struggle — two supers meeting mid-screen and the
 * players fighting over it — falls out of ordinary projectile collision instead
 * of needing a bespoke system.
 */

export function spawnProjectile(
  state: MatchState,
  owner: Fighter,
  spec: ProjectileSpec,
): Projectile {
  const origin = add(owner.pos, toWorld(spec.spawnOffset, owner.facing));
  const projectile: Projectile = {
    id: state.nextProjectileId++,
    owner: owner.index,
    kind: spec.kind,
    pos: origin,
    vel: scale(forwardVector(owner.facing), spec.speed),
    radius: spec.radius,
    life: spec.lifetime,
    homing: spec.homing,
    clashPower: spec.clashPower,
    pierce: spec.pierce,
    hit: spec.hit,
    clashWith: -1,
    clashFrames: 0,
  };
  state.projectiles.push(projectile);
  return projectile;
}

function steerToward(projectile: Projectile, target: Vec3, rate: number): void {
  const speed = Math.sqrt(
    projectile.vel.x * projectile.vel.x + projectile.vel.z * projectile.vel.z,
  );
  if (speed === 0 || rate === 0) {
    return;
  }
  const current = atan2(projectile.vel.x, projectile.vel.z);
  const desired = atan2(target.x - projectile.pos.x, target.z - projectile.pos.z);
  // Fold into [-PI, PI] so the projectile always turns the short way. Trig here
  // must come from the deterministic module, never from Math.
  const delta = wrapAngle(desired - current);
  const step = delta > rate ? rate : delta < -rate ? -rate : delta;
  const heading = current + step;
  projectile.vel = vec3(sin(heading) * speed, projectile.vel.y, cos(heading) * speed);
}

function outOfBounds(p: Projectile): boolean {
  const r = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
  return r > ARENA_RADIUS + 4 || p.pos.y < -2 || p.pos.y > 40;
}

/** Two opposing projectiles meeting head-on enter a contested clash. */
function detectClashes(state: MatchState, ctx: CombatContext): void {
  const list = state.projectiles;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a || a.clashWith >= 0) {
      continue;
    }
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (!b || b.clashWith >= 0 || b.owner === a.owner) {
        continue;
      }
      if (!capsulesOverlap(sphereCapsule(a.pos, a.radius), sphereCapsule(b.pos, b.radius))) {
        continue;
      }
      a.clashWith = b.id;
      b.clashWith = a.id;
      ctx.effects.push({ kind: 'clash', pos: a.pos, power: 1, owner: a.owner });
    }
  }
}

/**
 * Advance a live clash. Both projectiles hold position while the stronger one
 * inches forward; when the contest times out the weaker is destroyed and the
 * winner continues at reduced power.
 */
function tickClashes(state: MatchState, ctx: CombatContext): void {
  const byId = new Map(state.projectiles.map((p) => [p.id, p]));
  const destroyed = new Set<number>();

  for (const p of state.projectiles) {
    if (p.clashWith < 0 || destroyed.has(p.id)) {
      continue;
    }
    const other = byId.get(p.clashWith);
    if (!other) {
      p.clashWith = -1;
      continue;
    }
    if (other.id < p.id) {
      continue;
    }

    p.clashFrames++;
    other.clashFrames++;
    const advantage = p.clashPower - other.clashPower;
    const drift = scale(normalize(sub(other.pos, p.pos)), CLASH_PUSH * Math.sign(advantage));
    p.pos = add(p.pos, drift);
    other.pos = add(other.pos, drift);
    ctx.effects.push({ kind: 'clash', pos: p.pos, power: Math.abs(advantage) / 8, owner: p.owner });

    if (p.clashFrames >= CLASH_FRAMES) {
      if (advantage > 0) {
        destroyed.add(other.id);
        p.clashWith = -1;
        p.clashPower *= 0.6;
      } else if (advantage < 0) {
        destroyed.add(p.id);
        other.clashWith = -1;
        other.clashPower *= 0.6;
      } else {
        destroyed.add(p.id);
        destroyed.add(other.id);
      }
    }
  }

  if (destroyed.size > 0) {
    state.projectiles = state.projectiles.filter((p) => !destroyed.has(p.id));
  }
}

function hitFighter(
  state: MatchState,
  projectile: Projectile,
  defender: Fighter,
  ctx: CombatContext,
): boolean {
  if (isInvulnerable(defender, 'projectile')) {
    return false;
  }
  const owner = state.fighters[projectile.owner];
  if (defender.state === 'parry' && defender.parryHold >= DRIVE_PARRY_STARTUP) {
    applyParry(owner, defender, projectile.hit, ctx, DRIVE_PARRY_GAIN);
    return true;
  }
  if (defender.state === 'guard' || defender.state === 'blockstun') {
    applyBlock(owner, defender, projectile.hit, ctx, defender.burnout > 0 ? BURNOUT_BLOCKSTUN_BONUS : 0);
    return true;
  }

  applyDamage(defender, projectile.hit.damage);
  defender.comboHits += 1;
  defender.stun = projectile.hit.hitstun;
  defender.hitstop = projectile.hit.hitstop;
  defender.state = defender.grounded ? 'hitstun' : 'launched';
  defender.stateFrame = 0;
  defender.moveId = null;
  const push = scale(normalize(projectile.vel), projectile.hit.pushback);
  defender.vel = { x: defender.vel.x + push.x, y: defender.vel.y, z: defender.vel.z + push.z };
  ctx.effects.push({ kind: 'impact', pos: defender.pos, power: 1.2, owner: projectile.owner });
  return true;
}

export function tickProjectiles(state: MatchState, ctx: CombatContext): void {
  detectClashes(state, ctx);
  tickClashes(state, ctx);

  const survivors: Projectile[] = [];
  for (const p of state.projectiles) {
    if (p.clashWith < 0) {
      const target = state.fighters[p.owner === 0 ? 1 : 0];
      if (p.homing > 0) {
        steerToward(p, target.pos, p.homing);
      }
      p.pos = add(p.pos, p.vel);
      p.life -= 1;
    }

    if (p.life <= 0 || outOfBounds(p)) {
      continue;
    }

    const defender = state.fighters[p.owner === 0 ? 1 : 0];
    const connected =
      defender.state !== 'defeated' &&
      capsulesOverlap(sphereCapsule(p.pos, p.radius), bodyCapsule(defender)) &&
      hitFighter(state, p, defender, ctx);

    if (connected && !p.pierce) {
      continue;
    }
    survivors.push(p);
  }
  state.projectiles = survivors;
}
