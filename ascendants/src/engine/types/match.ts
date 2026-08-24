import type { RngState } from '../math/rng';
import type { Vec3 } from '../math/vec3';
import type { Fighter } from './fighter';
import type { HitProps } from './move';

export type MatchPhase =
  | 'intro'
  | 'fight'
  | 'roundEnd'
  /** The opponent is left standing and helpless: PUT THEM DOWN. */
  | 'finisher'
  /** A finisher connected and its cinematic is playing. */
  | 'erasure'
  | 'matchEnd';

export type Projectile = {
  id: number;
  owner: 0 | 1;
  kind: 'blast' | 'beam';
  pos: Vec3;
  vel: Vec3;
  radius: number;
  life: number;
  homing: number;
  clashPower: number;
  pierce: boolean;
  hit: HitProps;
  /** Id of the projectile currently being contested, or -1. */
  clashWith: number;
  clashFrames: number;
};

/**
 * Render-only signals emitted by the simulation each frame (impacts, beams
 * firing, aura ignition). They are rebuilt from scratch every frame and are
 * deliberately excluded from the state checksum so a peer that drops a visual
 * effect can never desync the match.
 */
export type EffectEvent = {
  kind:
    | 'impact'
    | 'block'
    | 'parry'
    | 'launch'
    | 'clash'
    | 'transform'
    | 'vanish'
    | 'ko'
    | 'daze'
    | 'erasure';
  pos: Vec3;
  power: number;
  owner: 0 | 1;
};

export type MatchState = {
  frame: number;
  phase: MatchPhase;
  phaseFrame: number;
  round: number;
  /** Frames remaining in the round. */
  timer: number;
  fighters: [Fighter, Fighter];
  projectiles: Projectile[];
  effects: EffectEvent[];
  rng: RngState;
  stageId: string;
  nextProjectileId: number;
  /** Winner of the last completed round, or -1 while a round is live. */
  lastRoundWinner: number;
  finisher: FinisherState;
};

/** Tracks the Erasure window that opens on a match-ending blow. */
export type FinisherState = {
  /** Frames left to land an Erasure, or 0 when no window is open. */
  window: number;
  /** Fighter who may perform it, or -1. */
  performer: number;
  /** Id of the erasure that connected, or null. */
  performed: string | null;
};

export type MatchConfig = {
  readonly roundsToWin: number;
  readonly roundTimeFrames: number;
  readonly stageId: string;
  readonly seed: number;
  readonly characterIds: readonly [string, string];
};
