/**
 * Fighter design specifications.
 *
 * Every fighter is built procedurally from these numbers at runtime — there are
 * no model files in this repository. That is a deliberate constraint: a
 * silhouette defined as data can be re-tuned in one line, stays diffable in
 * review, and keeps the whole game inside a build with no asset pipeline.
 *
 * This lives in the render layer, not the engine. Appearance must never be able
 * to influence the simulation.
 */

export type Build = {
  /** Multiplier on the 1.8-unit baseline height. */
  readonly height: number;
  readonly shoulderWidth: number;
  readonly hipWidth: number;
  readonly limbThickness: number;
  readonly headSize: number;
  /** Forward lean of the idle stance, in radians. */
  readonly stanceLean: number;
};

export type Palette = {
  readonly skin: string;
  readonly hair: string;
  /** Dominant costume colour. */
  readonly primary: string;
  readonly secondary: string;
  readonly trim: string;
  /** Emissive colour for markings, eyes and energy. */
  readonly glow: string;
  readonly auraCore: string;
  readonly auraEdge: string;
};

export type HairStyle = 'braid' | 'bald' | 'bob' | 'hooded' | 'sleek' | 'wild';

export type Costume = {
  readonly top: 'gi' | 'bare' | 'bodysuit' | 'coat' | 'jacket' | 'halfCape';
  readonly legs: 'wrapped' | 'skirtPanels' | 'heavy' | 'robe' | 'wide' | 'guard';
  readonly shoulders: 'none' | 'stone' | 'single' | 'pads';
  readonly handWraps: boolean;
  readonly belt: 'sash' | 'heavy' | 'chain' | 'none';
  /** Glowing scar lines across the torso, a mark of surviving the Herald. */
  readonly scarring: number;
};

export type AuraStyle = {
  readonly shape: 'column' | 'heavy' | 'flicker' | 'motes' | 'ring' | 'flame';
  readonly particles: number;
  readonly speed: number;
  readonly radius: number;
};

/** What changes when the fighter ascends. */
export type AscendedLook = {
  readonly hair: string;
  readonly glow: string;
  readonly auraCore: string;
  readonly auraScale: number;
  /** Cyan-style afterimages trailing the model. */
  readonly afterimages: number;
};

export type FighterDesign = {
  readonly characterId: string;
  /** One line describing the read at a glance — the silhouette test. */
  readonly silhouette: string;
  readonly build: Build;
  readonly palette: Palette;
  readonly hair: HairStyle;
  readonly costume: Costume;
  readonly aura: AuraStyle;
  readonly ascended: AscendedLook;
};
