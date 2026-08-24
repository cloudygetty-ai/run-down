import type { FighterDesign } from './types';

export * from './types';

/**
 * The six designs.
 *
 * Each one is built to pass the silhouette test: blacked out and shrunk to
 * thumbnail size, you should still know who you are looking at. That drove the
 * proportions far more than the colour did — Korvath is a block, Sei is a
 * sliver, Marrow is a vertical line, and no two share a shoulder width.
 */
export const DESIGNS: readonly FighterDesign[] = [
  {
    characterId: 'vanta',
    silhouette: 'Even shoulders, long braid falling to the waist, wrapped forearms.',
    build: {
      height: 1,
      shoulderWidth: 1,
      hipWidth: 1,
      limbThickness: 1,
      headSize: 1,
      stanceLean: 0.06,
    },
    palette: {
      skin: '#c9a58a',
      hair: '#e8e4f5',
      primary: '#1a1030',
      secondary: '#2e1065',
      trim: '#8b5cf6',
      glow: '#a78bfa',
      auraCore: '#c4b5fd',
      auraEdge: '#6d28d9',
    },
    hair: 'braid',
    costume: {
      top: 'gi',
      legs: 'wrapped',
      shoulders: 'none',
      handWraps: true,
      belt: 'sash',
      scarring: 0.2,
    },
    aura: { shape: 'column', particles: 34, speed: 1, radius: 0.9 },
    ascended: {
      hair: '#ffffff',
      glow: '#ddd6fe',
      auraCore: '#ffffff',
      auraScale: 1.9,
      afterimages: 0,
    },
  },
  {
    characterId: 'korvath',
    silhouette: 'A block. Shoulders wider than he is tall is nearly true.',
    build: {
      height: 1.28,
      shoulderWidth: 1.65,
      hipWidth: 1.35,
      limbThickness: 1.7,
      headSize: 0.92,
      stanceLean: 0.14,
    },
    palette: {
      skin: '#8a7355',
      hair: '#000000',
      primary: '#3b2f0b',
      secondary: '#1c1508',
      trim: '#c9a84c',
      glow: '#ffcf5c',
      auraCore: '#e0b64f',
      auraEdge: '#6b4e12',
    },
    hair: 'bald',
    costume: {
      top: 'bare',
      legs: 'heavy',
      shoulders: 'stone',
      handWraps: false,
      belt: 'heavy',
      // He took the Herald head-on; the cracks never closed.
      scarring: 1,
    },
    aura: { shape: 'heavy', particles: 46, speed: 0.55, radius: 1.35 },
    ascended: {
      hair: '#000000',
      glow: '#fff1a8',
      auraCore: '#ffd76a',
      auraScale: 2.1,
      afterimages: 0,
    },
  },
  {
    characterId: 'sei',
    silhouette: 'A sliver. Shortest fighter, split skirt panels reading as speed lines.',
    build: {
      height: 0.9,
      shoulderWidth: 0.82,
      hipWidth: 0.88,
      limbThickness: 0.78,
      headSize: 1.06,
      stanceLean: 0.22,
    },
    palette: {
      skin: '#e0b598',
      hair: '#22d3ee',
      primary: '#083344',
      secondary: '#0e4b5a',
      trim: '#67e8f9',
      glow: '#a5f3fc',
      auraCore: '#cffafe',
      auraEdge: '#0891b2',
    },
    hair: 'bob',
    costume: {
      top: 'bodysuit',
      legs: 'skirtPanels',
      shoulders: 'none',
      handWraps: true,
      belt: 'none',
      scarring: 0,
    },
    aura: { shape: 'flicker', particles: 22, speed: 2.4, radius: 0.62 },
    ascended: {
      hair: '#ecfeff',
      glow: '#ffffff',
      auraCore: '#e0fbff',
      auraScale: 1.5,
      // The only fighter who ascends into afterimages rather than volume.
      afterimages: 6,
    },
  },
  {
    characterId: 'marrow',
    silhouette: 'A vertical line. Hooded, coat tails splitting below the knee.',
    build: {
      height: 1.12,
      shoulderWidth: 0.86,
      hipWidth: 0.8,
      limbThickness: 0.8,
      headSize: 0.96,
      stanceLean: -0.04,
    },
    palette: {
      skin: '#6f7f74',
      hair: '#04140f',
      primary: '#052e22',
      secondary: '#020f0b',
      trim: '#34d399',
      glow: '#6ee7b7',
      auraCore: '#a7f3d0',
      auraEdge: '#065f46',
    },
    hair: 'hooded',
    costume: {
      top: 'coat',
      legs: 'robe',
      shoulders: 'none',
      handWraps: true,
      belt: 'none',
      scarring: 0.35,
    },
    aura: { shape: 'motes', particles: 18, speed: 0.4, radius: 1.5 },
    ascended: {
      hair: '#04140f',
      glow: '#d1fae5',
      auraCore: '#ecfdf5',
      auraScale: 1.7,
      afterimages: 0,
    },
  },
  {
    characterId: 'talon',
    silhouette: 'Wiry and square-shouldered, chain belt swinging off one hip.',
    build: {
      height: 1.02,
      shoulderWidth: 1.12,
      hipWidth: 0.92,
      limbThickness: 0.9,
      headSize: 0.98,
      stanceLean: 0.02,
    },
    palette: {
      skin: '#b4776a',
      hair: '#1c0a10',
      primary: '#4c0519',
      secondary: '#1f0209',
      trim: '#f472b6',
      glow: '#fda4d3',
      auraCore: '#fbcfe8',
      auraEdge: '#9d174d',
    },
    hair: 'sleek',
    costume: {
      top: 'jacket',
      legs: 'wide',
      shoulders: 'none',
      handWraps: true,
      belt: 'chain',
      scarring: 0.5,
    },
    // Tight and quiet until he answers something — then it snaps outward.
    aura: { shape: 'ring', particles: 26, speed: 1.3, radius: 0.72 },
    ascended: {
      hair: '#1c0a10',
      glow: '#ffe4f0',
      auraCore: '#fce7f3',
      auraScale: 1.6,
      afterimages: 0,
    },
  },
  {
    characterId: 'helios',
    silhouette: 'Broad top, narrow waist, one armoured arm and a burnt half-cape.',
    build: {
      height: 1.06,
      shoulderWidth: 1.34,
      hipWidth: 0.88,
      limbThickness: 1.12,
      headSize: 0.97,
      stanceLean: 0.1,
    },
    palette: {
      skin: '#d08a5e',
      hair: '#f97316',
      primary: '#431407',
      secondary: '#1c0a03',
      trim: '#fb923c',
      glow: '#fdba74',
      auraCore: '#fff7ed',
      auraEdge: '#c2410c',
    },
    hair: 'wild',
    costume: {
      top: 'halfCape',
      legs: 'guard',
      shoulders: 'single',
      handWraps: false,
      belt: 'sash',
      // Ember veins: he is burning himself to fight and it shows.
      scarring: 0.85,
    },
    aura: { shape: 'flame', particles: 52, speed: 1.8, radius: 1.15 },
    ascended: {
      hair: '#fff7ed',
      glow: '#ffffff',
      auraCore: '#ffffff',
      auraScale: 2.3,
      afterimages: 2,
    },
  },
];

const BY_ID = new Map(DESIGNS.map((d) => [d.characterId, d]));

export function designFor(characterId: string): FighterDesign {
  const found = BY_ID.get(characterId);
  if (!found) {
    throw new Error(`No design for character: ${characterId}`);
  }
  return found;
}
