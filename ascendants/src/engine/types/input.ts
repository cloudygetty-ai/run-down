/**
 * Player input contract.
 *
 * `dir` uses numpad notation in TARGET-RELATIVE space: 6 is always "toward the
 * opponent", 4 is always "away", 8 ascends, 2 descends/crouches. Resolving
 * direction against the lock-on target on the client keeps the simulation free
 * of any camera knowledge, and means motion inputs never need side-switch
 * mirroring inside the engine.
 *
 * Both fields are integers so a frame of input packs into 16 bits — small
 * enough that rollback can ship several frames per datagram.
 */

export const Button = {
  Light: 1 << 0,
  Medium: 1 << 1,
  Heavy: 1 << 2,
  Ki: 1 << 3,
  Guard: 1 << 4,
  Drive: 1 << 5,
  Jump: 1 << 6,
  Dash: 1 << 7,
  Charge: 1 << 8,
  Vanish: 1 << 9,
} as const;

export type ButtonMask = number;

export type PlayerInput = {
  /** Numpad 1-9, target-relative. 5 = neutral. */
  readonly dir: number;
  readonly buttons: ButtonMask;
};

export const NEUTRAL_INPUT: PlayerInput = { dir: 5, buttons: 0 };

/** Inputs for both fighters on a single simulated frame. */
export type FrameInputs = readonly [PlayerInput, PlayerInput];

export function isDown(input: PlayerInput, button: number): boolean {
  return (input.buttons & button) !== 0;
}

/** True only on the frame a button transitions from released to pressed. */
export function isPressed(current: PlayerInput, previous: PlayerInput, button: number): boolean {
  return (current.buttons & button) !== 0 && (previous.buttons & button) === 0;
}

/** Numpad direction decomposed into forward (+toward target) and vertical axes. */
export function dirForward(dir: number): number {
  if (dir === 3 || dir === 6 || dir === 9) {
    return 1;
  }
  return dir === 1 || dir === 4 || dir === 7 ? -1 : 0;
}

export function dirVertical(dir: number): number {
  if (dir >= 7) {
    return 1;
  }
  return dir <= 3 ? -1 : 0;
}

export function packInput(input: PlayerInput): number {
  return (input.dir & 0xf) | ((input.buttons & 0xfff) << 4);
}

export function unpackInput(packed: number): PlayerInput {
  return { dir: packed & 0xf, buttons: (packed >>> 4) & 0xfff };
}
