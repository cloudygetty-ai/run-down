// Mock portraits so require() returns numbers (matching Metro's production behavior)
// rather than the { testUri } objects that Jest's asset transformer produces.
jest.mock('./portraits', () => {
  const ids = [
    'vex','brutus','nyra','kade','iris','rook','talon','voss',
    'sable','orin','lyric','magnus','eira','jax','kael',
  ];
  const PORTRAITS: Record<string, number> = {};
  ids.forEach((id, i) => { PORTRAITS[id] = i + 1; });
  return { PORTRAITS };
});

import { CHARACTERS, getCharacter, DEFAULT_CHARACTER_ID } from './characters';

describe('character roster', () => {
  it('has 15 unique characters', () => {
    expect(CHARACTERS).toHaveLength(15);
    const ids = CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(15);
  });

  it('every character has a non-empty name, title, lore, and meteorQuip', () => {
    for (const c of CHARACTERS) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.lore.length).toBeGreaterThan(0);
      expect(c.meteorQuip.length).toBeGreaterThan(0);
    }
  });

  it('every character has a valid 6-digit hex accentColor', () => {
    const hexColor = /^#[0-9a-f]{6}$/i;
    for (const c of CHARACTERS) {
      expect(c.accentColor).toMatch(hexColor);
    }
  });

  it('all accentColors are unique across the roster', () => {
    const colors = CHARACTERS.map((c) => c.accentColor.toLowerCase());
    expect(new Set(colors).size).toBe(CHARACTERS.length);
  });

  it('portraitSource is a number (local asset) or null', () => {
    for (const c of CHARACTERS) {
      const valid = c.portraitSource === null || typeof c.portraitSource === 'number';
      expect(valid).toBe(true);
    }
  });

  it('every character ability has a positive cooldown', () => {
    for (const c of CHARACTERS) {
      expect(c.ability.cooldownMs).toBeGreaterThan(0);
    }
  });

  it('instant abilities have durationMs of 0', () => {
    const instant = CHARACTERS.filter((c) => c.ability.effectType === 'none');
    for (const c of instant) {
      expect(c.ability.durationMs).toBe(0);
    }
  });

  it('timed abilities have durationMs > 0', () => {
    const timed = CHARACTERS.filter((c) => c.ability.effectType !== 'none');
    for (const c of timed) {
      expect(c.ability.durationMs).toBeGreaterThan(0);
    }
  });

  it('passive stat multipliers are within sane ranges', () => {
    for (const c of CHARACTERS) {
      const p = c.passive;
      expect(p.speedMult).toBeGreaterThan(0);
      expect(p.speedMult).toBeLessThanOrEqual(2);
      expect(p.damageMult).toBeGreaterThan(0);
      expect(p.damageMult).toBeLessThanOrEqual(2);
      expect(p.damageResistance).toBeGreaterThanOrEqual(0);
      expect(p.damageResistance).toBeLessThan(1);
      expect(p.reloadMult).toBeGreaterThan(0);
      expect(p.reloadMult).toBeLessThanOrEqual(1);
    }
  });
});

describe('getCharacter', () => {
  it('returns the correct character by id', () => {
    const c = getCharacter('vex');
    expect(c.id).toBe('vex');
    expect(c.name).toBe('Vex "Glitch" Calder');
  });

  it('returns the default character for an unknown id', () => {
    const c = getCharacter('unknown_id_xyz');
    expect(c.id).toBe(DEFAULT_CHARACTER_ID);
  });

  it('DEFAULT_CHARACTER_ID matches the first character in the roster', () => {
    expect(DEFAULT_CHARACTER_ID).toBe(CHARACTERS[0].id);
  });
});
