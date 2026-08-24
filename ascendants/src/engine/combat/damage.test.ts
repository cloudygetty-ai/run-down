import { describe, expect, it } from 'vitest';
import { MIN_SCALING, SCALING_TABLE } from '../data/constants';
import { getCharacter } from '../data/characters';
import { createFighter } from '../sim/init';
import { applyChip, applyDamage, comboScaling, computeDamage } from './damage';

const stats = getCharacter('vanta').stats;
const tank = getCharacter('korvath').stats;

function ctx(overrides: Partial<Parameters<typeof computeDamage>[0]> = {}) {
  return computeDamage({
    base: 100,
    hitIndex: 0,
    attackerStats: stats,
    defenderStats: stats,
    attackerTransformed: false,
    transformMult: 1.25,
    ignoreScaling: false,
    ...overrides,
  });
}

describe('damage pipeline', () => {
  it('applies no scaling to the first two hits', () => {
    expect(comboScaling(0)).toBe(SCALING_TABLE[0]);
    expect(comboScaling(1)).toBe(SCALING_TABLE[1]);
  });

  it('floors scaling for combos past the table', () => {
    expect(comboScaling(50)).toBe(MIN_SCALING);
  });

  it('scales later hits down monotonically', () => {
    let previous = Infinity;
    for (let i = 0; i < 12; i++) {
      const value = comboScaling(i);
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
  });

  it('reduces damage as a combo lengthens', () => {
    expect(ctx({ hitIndex: 5 })).toBeLessThan(ctx({ hitIndex: 0 }));
  });

  it('increases damage while transformed', () => {
    expect(ctx({ attackerTransformed: true })).toBeGreaterThan(ctx());
  });

  it('reduces damage against a tankier defender', () => {
    expect(ctx({ defenderStats: tank })).toBeLessThan(ctx());
  });

  it('keeps supers meaningful deep into a combo', () => {
    const late = ctx({ hitIndex: 9 });
    const lateSuper = ctx({ hitIndex: 9, ignoreScaling: true });
    expect(lateSuper).toBeGreaterThan(late);
  });

  it('always returns a whole number of at least one', () => {
    const value = ctx({ base: 0.1, hitIndex: 9 });
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(1);
  });

  it('never drives health below zero', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.health = 30;
    expect(applyDamage(fighter, 500)).toBe(30);
    expect(fighter.health).toBe(0);
  });

  it('leaves chip damage one point short of a kill', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.health = 5;
    applyChip(fighter, 100);
    expect(fighter.health).toBe(1);
  });

  it('lets chip damage kill a fighter in burnout', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.health = 5;
    fighter.burnout = 60;
    applyChip(fighter, 100);
    expect(fighter.health).toBe(0);
  });
});
