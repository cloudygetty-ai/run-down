import {
  BURNOUT_FRAMES,
  DRIVE_MAX,
  DRIVE_REGEN,
  DRIVE_REGEN_BURNOUT,
} from '../data/constants';
import type { CharacterStats } from '../data/characters';
import type { Fighter } from '../types/fighter';

/**
 * The Drive gauge (Street Fighter 6's system, adopted wholesale).
 *
 * Drive is the risk resource: it pays for Impact, Parry, Rush and Overdrive,
 * and blocking burns it. Running it to zero triggers Burnout, where the
 * fighter loses every drive option, takes chip damage that can kill, and
 * suffers longer blockstun. That is the pressure valve the whole neutral game
 * is built around, so it is modelled exactly rather than approximated.
 */

export function canSpendDrive(fighter: Fighter, amount: number): boolean {
  return fighter.burnout <= 0 && fighter.drive >= amount;
}

export function spendDrive(fighter: Fighter, amount: number): boolean {
  if (!canSpendDrive(fighter, amount)) {
    return false;
  }
  fighter.drive -= amount;
  if (fighter.drive <= 0) {
    enterBurnout(fighter);
  }
  return true;
}

/** Drive lost passively — chip on block, parry upkeep. Can force Burnout. */
export function drainDrive(fighter: Fighter, amount: number): void {
  if (fighter.burnout > 0) {
    return;
  }
  fighter.drive -= amount;
  if (fighter.drive <= 0) {
    enterBurnout(fighter);
  }
}

export function gainDrive(fighter: Fighter, amount: number): void {
  if (fighter.burnout > 0) {
    return;
  }
  fighter.drive = Math.min(DRIVE_MAX, fighter.drive + amount);
}

export function enterBurnout(fighter: Fighter): void {
  fighter.drive = 0;
  fighter.burnout = BURNOUT_FRAMES;
}

/**
 * Advance drive recovery by one frame. In Burnout the gauge refills on a timer
 * and the fighter only escapes once it is full again — recovery is faster than
 * normal regeneration precisely so Burnout is a bad minute, not a lost round.
 */
export function tickDrive(fighter: Fighter, stats: CharacterStats): void {
  if (fighter.burnout > 0) {
    fighter.burnout -= 1;
    fighter.drive = Math.min(DRIVE_MAX, fighter.drive + DRIVE_REGEN_BURNOUT);
    if (fighter.burnout <= 0) {
      fighter.burnout = 0;
      fighter.drive = DRIVE_MAX;
    }
    return;
  }
  fighter.drive = Math.min(DRIVE_MAX, fighter.drive + DRIVE_REGEN * stats.driveRegenMult);
}
