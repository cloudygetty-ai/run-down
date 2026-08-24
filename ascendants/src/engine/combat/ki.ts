import { KI_CHARGE_RATE, KI_MAX, KI_REGEN_PASSIVE } from '../data/constants';
import type { CharacterStats } from '../data/characters';
import type { Fighter } from '../types/fighter';

/**
 * The Ki gauge (the Dragon Ball half of the system).
 *
 * Where Drive regenerates on its own and punishes overuse, Ki must be actively
 * earned: standing still to charge is the only fast source, and standing still
 * is exactly when you are most vulnerable. That tension is the reason the
 * charge stance exists at all.
 */

export function canSpendKi(fighter: Fighter, amount: number): boolean {
  return fighter.ki >= amount;
}

export function spendKi(fighter: Fighter, amount: number): boolean {
  if (!canSpendKi(fighter, amount)) {
    return false;
  }
  fighter.ki -= amount;
  return true;
}

export function gainKi(fighter: Fighter, amount: number): void {
  fighter.ki = Math.min(KI_MAX, fighter.ki + amount);
}

/** Trickle regeneration applied on every frame the fighter is not charging. */
export function tickKi(fighter: Fighter, stats: CharacterStats): void {
  gainKi(fighter, KI_REGEN_PASSIVE * stats.kiRegenMult);
}

/** The charge stance: an order of magnitude faster, and completely defenceless. */
export function tickCharge(fighter: Fighter, stats: CharacterStats): void {
  gainKi(fighter, KI_CHARGE_RATE * stats.kiRegenMult);
}

export function kiRatio(fighter: Fighter): number {
  return fighter.ki / KI_MAX;
}
