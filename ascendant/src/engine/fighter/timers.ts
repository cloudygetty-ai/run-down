import {
  DAZE_SWAY_RATE,
  KNOCKDOWN_FRAMES,
  LANDING_RECOVERY,
  TRANSFORM_FRAMES,
  TRANSFORM_KI_DRAIN,
  VANISH_FRAMES,
  WAKEUP_FRAMES,
  DASH_FRAMES,
  BACKDASH_FRAMES,
  DRIVE_RUSH_FRAMES,
} from '../data/constants';
import type { CharacterStats } from '../data/characters';
import { getMove } from '../data/moves';
import { tickDrive } from '../combat/drive';
import { tickCharge, tickKi } from '../combat/ki';
import type { Fighter } from '../types/fighter';
import { totalFrames } from '../types/move';

/**
 * Per-frame bookkeeping: timers, resources, and the transitions that fire when
 * a timed state runs out.
 *
 * Hitstop returns early on purpose. During impact freeze nothing about a
 * fighter advances — not their move, not their meters, not their stun — which
 * is what makes a heavy hit feel heavy instead of just doing more damage.
 */

export function tickTimers(fighter: Fighter, stats: CharacterStats): void {
  if (fighter.hitstop > 0) {
    fighter.hitstop -= 1;
    return;
  }

  fighter.stateFrame += 1;
  if (fighter.moveId !== null) {
    fighter.moveFrame += 1;
  }
  if (fighter.stun > 0) {
    fighter.stun -= 1;
  }
  if (fighter.vanishCooldown > 0) {
    fighter.vanishCooldown -= 1;
  }

  tickDrive(fighter, stats);
  if (fighter.state === 'charge') {
    tickCharge(fighter, stats);
  } else {
    tickKi(fighter, stats);
  }

  if (fighter.transformed) {
    fighter.transformFrames += 1;
    fighter.ki -= TRANSFORM_KI_DRAIN;
    if (fighter.ki <= 0) {
      fighter.ki = 0;
      fighter.transformed = false;
    }
  }

  // A combo is over the moment the victim is free to act again.
  if (fighter.stun <= 0 && fighter.state !== 'hitstun' && fighter.state !== 'launched') {
    fighter.comboHits = 0;
    fighter.comboDamage = 0;
  }
}

/** Return a fighter to a neutral state appropriate to where they are standing. */
export function toNeutral(fighter: Fighter): void {
  fighter.state = fighter.grounded ? 'idle' : 'air';
  fighter.stateFrame = 0;
  fighter.moveId = null;
  fighter.moveFrame = 0;
  fighter.connected.length = 0;
  fighter.armor = 0;
}

/** Resolve any state whose lifetime has elapsed. */
export function advanceState(fighter: Fighter): void {
  if (fighter.hitstop > 0) {
    return;
  }

  switch (fighter.state) {
    case 'attack': {
      if (fighter.moveId === null) {
        toNeutral(fighter);
        return;
      }
      const move = getMove(fighter.moveId);
      if (move.kind === 'transform' && fighter.moveFrame === move.startup) {
        fighter.transformed = true;
        fighter.transformFrames = 0;
      }
      if (fighter.moveFrame > totalFrames(move)) {
        fighter.chain.length = 0;
        toNeutral(fighter);
      }
      return;
    }
    case 'hitstun':
    case 'blockstun':
      if (fighter.stun <= 0) {
        toNeutral(fighter);
      }
      return;
    case 'launched':
      // Resolved by the ground collision in movement, not by a timer.
      return;
    case 'knockdown':
      if (fighter.stateFrame >= KNOCKDOWN_FRAMES) {
        fighter.state = 'wakeup';
        fighter.stateFrame = 0;
      }
      return;
    case 'wakeup':
      if (fighter.stateFrame >= WAKEUP_FRAMES) {
        toNeutral(fighter);
      }
      return;
    case 'vanish':
      if (fighter.stateFrame >= VANISH_FRAMES) {
        toNeutral(fighter);
      }
      return;
    case 'transform':
      if (fighter.stateFrame >= TRANSFORM_FRAMES) {
        fighter.transformed = true;
        fighter.transformFrames = 0;
        toNeutral(fighter);
      }
      return;
    case 'dash':
      if (fighter.stateFrame >= DASH_FRAMES) {
        toNeutral(fighter);
      }
      return;
    case 'backdash':
      if (fighter.stateFrame >= BACKDASH_FRAMES) {
        toNeutral(fighter);
      }
      return;
    case 'land':
      if (fighter.stateFrame >= LANDING_RECOVERY) {
        toNeutral(fighter);
      }
      return;
    case 'dazed':
      // Sways in place until the Erasure window closes; the match layer owns it.
      fighter.facing += DAZE_SWAY_RATE * (fighter.stateFrame % 2 === 0 ? 1 : -1);
      return;
    default:
      return;
  }
}

export const DRIVE_RUSH_DURATION = DRIVE_RUSH_FRAMES;
