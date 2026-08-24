import { INPUT_HISTORY } from '../types/fighter';
import { packInput, unpackInput, type PlayerInput } from '../types/input';

/**
 * Input history helpers.
 *
 * The history is a plain array of packed 16-bit inputs capped at
 * INPUT_HISTORY, newest last — small enough to copy on every rollback snapshot
 * without measurable cost.
 */

export function pushInput(history: number[], input: PlayerInput): void {
  history.push(packInput(input));
  if (history.length > INPUT_HISTORY) {
    history.splice(0, history.length - INPUT_HISTORY);
  }
}

/** Directions from the most recent `window` frames, oldest first. */
export function recentDirs(history: readonly number[], window: number): number[] {
  const start = Math.max(0, history.length - window);
  const out: number[] = [];
  for (let i = start; i < history.length; i++) {
    out.push(unpackInput(history[i] ?? 0).dir);
  }
  return out;
}

/**
 * True if `button` transitioned from released to pressed within the last
 * `frames` frames — the classic input buffer that stops a special from being
 * eaten because it was entered one frame early.
 */
export function pressedWithin(
  history: readonly number[],
  button: number,
  frames: number,
): boolean {
  const end = history.length - 1;
  const start = Math.max(1, history.length - frames);
  for (let i = end; i >= start; i--) {
    const current = unpackInput(history[i] ?? 0).buttons;
    const previous = unpackInput(history[i - 1] ?? 0).buttons;
    if ((current & button) !== 0 && (previous & button) === 0) {
      return true;
    }
  }
  return false;
}

export function latestInput(history: readonly number[]): PlayerInput {
  return unpackInput(history[history.length - 1] ?? 0);
}
