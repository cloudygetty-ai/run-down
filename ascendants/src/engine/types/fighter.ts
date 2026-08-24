import type { Vec3 } from '../math/vec3';

/**
 * The fighter state machine. Attack phases are not separate states: a fighter
 * in `attack` carries a moveId plus a frame counter, and the move's own
 * startup/active/recovery data decides what is happening. That keeps the
 * machine small and makes every attack behave by the same rules.
 */
export type FighterState =
  | 'idle'
  | 'walk'
  | 'dash'
  | 'backdash'
  | 'jump'
  | 'air'
  | 'land'
  | 'fly'
  | 'charge'
  | 'attack'
  | 'guard'
  | 'blockstun'
  | 'parry'
  | 'hitstun'
  | 'launched'
  | 'knockdown'
  | 'wakeup'
  | 'vanish'
  | 'transform'
  /** Left standing and helpless when a match-ending blow lands — the Erasure window. */
  | 'dazed'
  | 'erased'
  | 'defeated';

/** Per-fighter simulation state. Plain data only, so snapshots are cheap. */
export type Fighter = {
  index: 0 | 1;
  characterId: string;

  pos: Vec3;
  vel: Vec3;
  /** Yaw in radians; 0 faces +z. */
  facing: number;

  state: FighterState;
  stateFrame: number;
  moveId: string | null;
  moveFrame: number;
  /** Move ids already used in the current chain, to enforce cancel rules. */
  chain: string[];
  /** Ids of things already hit by the active move, preventing double hits. */
  connected: number[];

  health: number;
  maxHealth: number;
  ki: number;
  drive: number;
  superMeter: number;

  /** > 0 means Burnout: no drive options, chip kills, worse blockstun. */
  burnout: number;
  stun: number;
  hitstop: number;

  juggle: number;
  comboHits: number;
  comboDamage: number;

  grounded: boolean;
  flying: boolean;
  transformed: boolean;
  transformFrames: number;

  fatalUsed: boolean;
  vanishCooldown: number;
  parryHold: number;
  armor: number;

  wins: number;

  /** Committed dash direction in fighter-local axes, held for the dash's duration. */
  dashForward: number;
  dashStrafe: number;

  /**
   * Packed inputs for the last INPUT_HISTORY frames, newest last.
   *
   * WHY it lives on the fighter rather than in a side buffer: motion inputs are
   * state, and rollback must rewind them exactly like position or health.
   * A separate buffer would survive a rollback and let a rewound frame
   * recognise a dragon punch that never happened.
   */
  inputHistory: number[];
};

export const INPUT_HISTORY = 18;

export const FIGHTER_RADIUS = 0.55;
export const FIGHTER_HEIGHT = 1.8;

/** Fighters in these states cannot act until the state resolves. */
export function isBusy(f: Fighter): boolean {
  return (
    f.state === 'attack' ||
    f.state === 'hitstun' ||
    f.state === 'blockstun' ||
    f.state === 'launched' ||
    f.state === 'knockdown' ||
    f.state === 'wakeup' ||
    f.state === 'vanish' ||
    f.state === 'transform' ||
    f.state === 'defeated'
  );
}

/** Being hit or blocked — the window where a Vanish escape is legal. */
export function isReeling(f: Fighter): boolean {
  return f.state === 'hitstun' || f.state === 'launched';
}

export function isDefeated(f: Fighter): boolean {
  return f.health <= 0;
}
