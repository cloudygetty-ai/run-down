import { describe, expect, it } from 'vitest';
import { BURNOUT_FRAMES, DRIVE_MAX } from '../data/constants';
import { getCharacter } from '../data/characters';
import { createFighter } from '../sim/init';
import { canSpendDrive, drainDrive, gainDrive, spendDrive, tickDrive } from './drive';
import { gainKi, spendKi } from './ki';

const stats = getCharacter('vanta').stats;

describe('drive gauge', () => {
  it('starts full', () => {
    expect(createFighter(0, 'vanta').drive).toBe(DRIVE_MAX);
  });

  it('spends when affordable and refuses when not', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.drive = 1500;
    expect(spendDrive(fighter, 1000)).toBe(true);
    expect(fighter.drive).toBe(500);
    expect(spendDrive(fighter, 1000)).toBe(false);
    expect(fighter.drive).toBe(500);
  });

  it('enters burnout when the gauge is emptied', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.drive = 1000;
    spendDrive(fighter, 1000);
    expect(fighter.burnout).toBe(BURNOUT_FRAMES);
    expect(fighter.drive).toBe(0);
  });

  it('enters burnout when chipped to empty on block', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.drive = 100;
    drainDrive(fighter, 200);
    expect(fighter.burnout).toBeGreaterThan(0);
  });

  it('locks out every drive option during burnout', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.drive = 1000;
    spendDrive(fighter, 1000);
    fighter.drive = DRIVE_MAX;
    expect(canSpendDrive(fighter, 1000)).toBe(false);
  });

  it('recovers to a full gauge when burnout expires', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.drive = 1000;
    spendDrive(fighter, 1000);
    for (let i = 0; i < BURNOUT_FRAMES + 1; i++) {
      tickDrive(fighter, stats);
    }
    expect(fighter.burnout).toBe(0);
    expect(fighter.drive).toBe(DRIVE_MAX);
  });

  it('never regenerates past the cap', () => {
    const fighter = createFighter(0, 'vanta');
    gainDrive(fighter, 99999);
    expect(fighter.drive).toBe(DRIVE_MAX);
  });
});

describe('ki gauge', () => {
  it('refuses a spend it cannot afford', () => {
    const fighter = createFighter(0, 'vanta');
    fighter.ki = 10;
    expect(spendKi(fighter, 25)).toBe(false);
    expect(fighter.ki).toBe(10);
  });

  it('caps at the maximum', () => {
    const fighter = createFighter(0, 'vanta');
    gainKi(fighter, 9999);
    expect(fighter.ki).toBe(100);
  });
});
