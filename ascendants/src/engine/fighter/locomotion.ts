import {
  BACKDASH_SPEED,
  DASH_SPEED,
  FLY_MIN_HEIGHT,
  FLY_SPEED,
  FLY_VERTICAL_SPEED,
  JUMP_VELOCITY,
  KI_FLY_UPKEEP,
  KI_VANISH_COST,
  DRIVE_PARRY_DRAIN,
  VANISH_COOLDOWN,
  VANISH_DISTANCE,
  VANISH_FRAMES,
  WALK_SPEED,
  TRANSFORM_SPEED_MULT,
} from '../data/constants';
import type { CharacterStats } from '../data/characters';
import { drainDrive } from '../combat/drive';
import { spendKi } from '../combat/ki';
import { forwardVector } from '../combat/hitbox';
import { add, scale, vec3 } from '../math/vec3';
import { Button, dirForward, dirVertical, isDown, type PlayerInput } from '../types/input';
import { isReeling, type Fighter } from '../types/fighter';
import type { EffectEvent } from '../types/match';
import { translateLocal, translateVertical, faceOpponent, clampToArena } from './movement';

/**
 * Player-driven movement.
 *
 * The fight happens on the plane between the two fighters: 6 advances, 4
 * retreats, 8 rises, 2 drops. Free lateral movement is deliberately not on the
 * stick — it is a committed sidestep off the dash button instead. Keeping the
 * stick two-dimensional is what lets quarter-circle motions stay readable in a
 * 3D space, and it is the same compromise the arena fighters this game descends
 * from all landed on.
 */

const SIDESTEP_SPEED = 0.2;

export function isFreeToMove(fighter: Fighter): boolean {
  return (
    fighter.state === 'idle' ||
    fighter.state === 'walk' ||
    fighter.state === 'air' ||
    fighter.state === 'fly' ||
    fighter.state === 'guard' ||
    fighter.state === 'charge' ||
    fighter.state === 'parry'
  );
}

function speedMult(fighter: Fighter, stats: CharacterStats): number {
  return stats.walkMult * (fighter.transformed ? TRANSFORM_SPEED_MULT : 1);
}

/**
 * The Vanish: spend ki to blink behind the attacker mid-combo.
 *
 * This is the pressure release valve the Dragon Ball half of the game needs —
 * without it, one launcher would mean watching an unbroken juggle. Its cost and
 * cooldown are what stop it from erasing offence entirely.
 */
export function tryVanish(
  fighter: Fighter,
  opponent: Fighter,
  input: PlayerInput,
  effects: EffectEvent[],
): boolean {
  if (!isReeling(fighter) || !isDown(input, Button.Vanish)) {
    return false;
  }
  if (fighter.vanishCooldown > 0 || !spendKi(fighter, KI_VANISH_COST)) {
    return false;
  }

  const behind = add(opponent.pos, scale(forwardVector(opponent.facing), -VANISH_DISTANCE));
  fighter.pos = vec3(behind.x, Math.max(opponent.pos.y, behind.y), behind.z);
  fighter.vel = vec3(0, 0, 0);
  fighter.state = 'vanish';
  fighter.stateFrame = 0;
  fighter.stun = 0;
  fighter.juggle = 0;
  fighter.comboHits = 0;
  fighter.moveId = null;
  fighter.vanishCooldown = VANISH_COOLDOWN + VANISH_FRAMES;
  faceOpponent(fighter, opponent.pos.x, opponent.pos.z, true);
  clampToArena(fighter);
  effects.push({ kind: 'vanish', pos: fighter.pos, power: 1, owner: fighter.index });
  return true;
}

function startDash(fighter: Fighter, forward: number, strafe: number): void {
  fighter.state = forward < 0 ? 'backdash' : 'dash';
  fighter.stateFrame = 0;
  fighter.dashForward = forward;
  fighter.dashStrafe = strafe;
}

/** Dashes are committed: the direction is locked in when the dash begins. */
export function tickDash(fighter: Fighter, stats: CharacterStats): void {
  const speed = fighter.dashForward < 0 ? BACKDASH_SPEED : DASH_SPEED;
  translateLocal(
    fighter,
    fighter.dashForward * speed * stats.dashMult,
    fighter.dashStrafe * SIDESTEP_SPEED * stats.dashMult,
  );
}

export function tickLocomotion(
  fighter: Fighter,
  input: PlayerInput,
  stats: CharacterStats,
): void {
  if (fighter.state === 'dash' || fighter.state === 'backdash') {
    tickDash(fighter, stats);
    return;
  }
  if (!isFreeToMove(fighter)) {
    return;
  }

  const forward = dirForward(input.dir);
  const vertical = dirVertical(input.dir);

  // Stance buttons are exclusive and checked in priority order: you cannot
  // parry while charging, and you cannot charge while guarding.
  if (isDown(input, Button.Drive) && fighter.burnout <= 0) {
    fighter.state = 'parry';
    fighter.parryHold += 1;
    drainDrive(fighter, DRIVE_PARRY_DRAIN);
    return;
  }
  fighter.parryHold = 0;

  if (isDown(input, Button.Guard)) {
    fighter.state = 'guard';
    return;
  }
  if (isDown(input, Button.Charge)) {
    fighter.state = 'charge';
    return;
  }

  if (isDown(input, Button.Dash)) {
    startDash(fighter, forward, forward === 0 ? (vertical >= 0 ? 1 : -1) : 0);
    return;
  }

  if (fighter.flying) {
    tickFlight(fighter, forward, vertical, stats);
    return;
  }

  if (fighter.grounded) {
    if (vertical > 0) {
      fighter.vel = vec3(fighter.vel.x, JUMP_VELOCITY * stats.jumpMult, fighter.vel.z);
      fighter.grounded = false;
      fighter.state = 'air';
      fighter.stateFrame = 0;
      return;
    }
    if (forward !== 0) {
      fighter.state = 'walk';
      translateLocal(fighter, forward * WALK_SPEED * speedMult(fighter, stats), 0);
    } else {
      fighter.state = 'idle';
    }
    return;
  }

  // Airborne: pressing up again converts the jump into sustained flight.
  if (vertical > 0 && fighter.pos.y > FLY_MIN_HEIGHT && fighter.ki > KI_FLY_UPKEEP) {
    fighter.flying = true;
    fighter.state = 'fly';
    return;
  }
  fighter.state = 'air';
  translateLocal(fighter, forward * WALK_SPEED * 0.6 * speedMult(fighter, stats), 0);
}

function tickFlight(
  fighter: Fighter,
  forward: number,
  vertical: number,
  stats: CharacterStats,
): void {
  if (!spendKi(fighter, KI_FLY_UPKEEP)) {
    fighter.flying = false;
    fighter.state = 'air';
    return;
  }
  fighter.state = 'fly';
  translateLocal(fighter, forward * FLY_SPEED * speedMult(fighter, stats), 0);
  if (vertical !== 0) {
    translateVertical(fighter, vertical * FLY_VERTICAL_SPEED);
  }
  if (fighter.pos.y <= FLY_MIN_HEIGHT && vertical < 0) {
    fighter.flying = false;
  }
}
