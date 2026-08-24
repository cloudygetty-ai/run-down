/**
 * The roster. Stats are multipliers against the universal baseline so the
 * balance conversation stays relative — "Korvath takes 12% less damage" reads
 * faster than an absolute defense number, and a baseline tuning change
 * propagates to every character automatically.
 */

export type CharacterStats = {
  readonly maxHealth: number;
  readonly walkMult: number;
  readonly dashMult: number;
  readonly damageMult: number;
  /** Incoming damage multiplier; below 1 is tankier. */
  readonly defenseMult: number;
  readonly kiRegenMult: number;
  readonly driveRegenMult: number;
  readonly jumpMult: number;
  /** Resistance to pushback and juggle height; heavier fighters move less. */
  readonly weight: number;
};

/** Objective-case pronoun, used to address a fighter in announcer lines. */
export type Pronoun = 'her' | 'him' | 'them';

export type Character = {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly lore: string;
  readonly pronoun: Pronoun;
  readonly accent: string;
  readonly secondary: string;
  readonly stats: CharacterStats;
  /** Ids of this character's three specials, in menu order. */
  readonly specials: readonly [string, string, string];
  readonly superMove: string;
};

const BASE: CharacterStats = {
  maxHealth: 1000,
  walkMult: 1,
  dashMult: 1,
  damageMult: 1,
  defenseMult: 1,
  kiRegenMult: 1,
  driveRegenMult: 1,
  jumpMult: 1,
  weight: 1,
};

export const ROSTER: readonly Character[] = [
  {
    id: 'vanta',
    name: 'VANTA',
    title: 'The Even Hand',
    lore: 'First to walk out of the crater still standing. Teaches what she survived.',
    pronoun: 'her',
    accent: '#8B5CF6',
    secondary: '#2E1065',
    stats: { ...BASE },
    specials: ['vanta.riftPalm', 'vanta.ascensionKnee', 'vanta.phaseStep'],
    superMove: 'vanta.eclipse',
  },
  {
    id: 'korvath',
    name: 'KORVATH',
    title: 'Sunken Colossus',
    lore: 'Took a direct hit from the Herald and got up. Slower every year, harder every year.',
    pronoun: 'him',
    accent: '#C9A84C',
    secondary: '#3B2F0B',
    stats: {
      ...BASE,
      maxHealth: 1180,
      walkMult: 0.82,
      dashMult: 0.85,
      damageMult: 1.14,
      defenseMult: 0.88,
      kiRegenMult: 0.9,
      jumpMult: 0.9,
      weight: 1.35,
    },
    specials: ['korvath.quake', 'korvath.grasp', 'korvath.bulwark'],
    superMove: 'korvath.gravityWell',
  },
  {
    id: 'sei',
    name: 'SEI',
    title: 'Nine Steps',
    lore: 'Never blocks. Insists blocking is just being somewhere you should not be.',
    pronoun: 'her',
    accent: '#22D3EE',
    secondary: '#083344',
    stats: {
      ...BASE,
      maxHealth: 880,
      walkMult: 1.28,
      dashMult: 1.32,
      damageMult: 0.86,
      defenseMult: 1.12,
      kiRegenMult: 1.1,
      driveRegenMult: 1.15,
      jumpMult: 1.15,
      weight: 0.78,
    },
    specials: ['sei.nineStep', 'sei.razorRush', 'sei.updraft'],
    superMove: 'sei.thousandCuts',
  },
  {
    id: 'marrow',
    name: 'MARROW',
    title: 'The Long Dark',
    lore: 'Measures every fight in metres. Has never willingly been inside two of them.',
    pronoun: 'them',
    accent: '#34D399',
    secondary: '#052E22',
    stats: {
      ...BASE,
      maxHealth: 920,
      walkMult: 0.94,
      dashMult: 0.96,
      damageMult: 0.92,
      defenseMult: 1.08,
      kiRegenMult: 1.45,
      jumpMult: 0.98,
      weight: 0.92,
    },
    specials: ['marrow.lance', 'marrow.tether', 'marrow.bulwarkWall'],
    superMove: 'marrow.eventHorizon',
  },
  {
    id: 'talon',
    name: 'TALON',
    title: 'Counterweight',
    lore: 'Fights entirely in replies. Has not thrown a first punch since the sky fell.',
    pronoun: 'him',
    accent: '#F472B6',
    secondary: '#4C0519',
    stats: {
      ...BASE,
      maxHealth: 960,
      walkMult: 1.06,
      damageMult: 0.95,
      defenseMult: 0.97,
      driveRegenMult: 1.3,
      weight: 0.95,
    },
    specials: ['talon.counter', 'talon.hookKick', 'talon.airDive'],
    superMove: 'talon.retribution',
  },
  {
    id: 'helios',
    name: 'HELIOS',
    title: 'Last Light',
    lore: 'Burns through his own reserves to end fights early, because he cannot survive long ones.',
    pronoun: 'him',
    accent: '#F97316',
    secondary: '#431407',
    stats: {
      ...BASE,
      maxHealth: 840,
      walkMult: 1.02,
      damageMult: 1.28,
      defenseMult: 1.18,
      kiRegenMult: 1.2,
      driveRegenMult: 0.9,
      weight: 0.9,
    },
    specials: ['helios.solarFang', 'helios.corona', 'helios.flare'],
    superMove: 'helios.supernova',
  },
];

const BY_ID = new Map(ROSTER.map((c) => [c.id, c]));

export function getCharacter(id: string): Character {
  const found = BY_ID.get(id);
  if (!found) {
    throw new Error(`Unknown character: ${id}`);
  }
  return found;
}

export const DEFAULT_CHARACTER_ID = 'vanta';
