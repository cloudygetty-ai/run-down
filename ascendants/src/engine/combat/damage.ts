import { MIN_SCALING, SCALING_TABLE } from '../data/constants';
import type { CharacterStats } from '../data/characters';
import type { Fighter } from '../types/fighter';

/**
 * Damage pipeline.
 *
 * Order matters and is fixed: base damage, then combo scaling, then the
 * attacker's power, then the defender's toughness, then transformation. Any
 * other order lets two multipliers compound into numbers the balance table
 * never predicted.
 */

/** Scaling applied to the Nth hit of a combo (0-indexed). */
export function comboScaling(hitIndex: number): number {
  if (hitIndex < 0) {
    return 1;
  }
  const value = SCALING_TABLE[hitIndex];
  return value ?? MIN_SCALING;
}

export type DamageContext = {
  readonly base: number;
  readonly hitIndex: number;
  readonly attackerStats: CharacterStats;
  readonly defenderStats: CharacterStats;
  readonly attackerTransformed: boolean;
  readonly transformMult: number;
  /** Supers and Fatal Blows ignore combo scaling below a floor. */
  readonly ignoreScaling: boolean;
};

export function computeDamage(ctx: DamageContext): number {
  const scaling = ctx.ignoreScaling ? Math.max(comboScaling(ctx.hitIndex), 0.5) : comboScaling(ctx.hitIndex);
  const power = ctx.attackerStats.damageMult * (ctx.attackerTransformed ? ctx.transformMult : 1);
  const raw = ctx.base * scaling * power * ctx.defenderStats.defenseMult;
  // Round to whole points so health is always an integer and two peers can
  // never disagree by a fraction after a long combo.
  return Math.max(1, Math.round(raw));
}

/** Chip damage cannot kill unless the defender is in Burnout (SF6 rule). */
export function applyChip(defender: Fighter, chip: number): number {
  if (chip <= 0) {
    return 0;
  }
  const canKill = defender.burnout > 0;
  const floor = canKill ? 0 : 1;
  const applied = Math.min(chip, Math.max(0, defender.health - floor));
  defender.health -= applied;
  return applied;
}

/** Apply damage and clamp at zero. Returns the amount actually dealt. */
export function applyDamage(defender: Fighter, amount: number): number {
  const applied = Math.min(amount, defender.health);
  defender.health -= applied;
  if (defender.health < 0) {
    defender.health = 0;
  }
  return applied;
}
