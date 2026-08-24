import { Button } from '../engine/types/input';
import type { Move } from '../engine/types/move';
import { totalFrames } from '../engine/types/move';

/**
 * Fighting-game notation.
 *
 * Move lists are read at a glance during character select, so directions are
 * shown as arrows rather than numpad digits — a player who has never seen this
 * game still recognises a quarter-circle from its shape.
 */

const ARROWS: Record<number, string> = {
  1: '↙',
  2: '↓',
  3: '↘',
  4: '←',
  5: '·',
  6: '→',
  7: '↖',
  8: '↑',
  9: '↗',
};

const BUTTON_LABELS: [number, string][] = [
  [Button.Light, 'L'],
  [Button.Medium, 'M'],
  [Button.Heavy, 'H'],
  [Button.Ki, 'K'],
  [Button.Guard, 'G'],
  [Button.Drive, 'D'],
  [Button.Dash, 'DS'],
  [Button.Charge, 'C'],
  [Button.Vanish, 'V'],
];

export function motionNotation(motion: readonly number[]): string {
  return motion.map((dir) => ARROWS[dir] ?? String(dir)).join('');
}

export function buttonNotation(mask: number): string {
  const parts = BUTTON_LABELS.filter(([bit]) => (mask & bit) !== 0).map(([, label]) => label);
  return parts.join('+');
}

/** Full input for a move, e.g. "↓↘→ + K". */
export function inputNotation(move: Move): string {
  const motion = motionNotation(move.input.motion);
  const hold = move.input.holdDir ? `${ARROWS[move.input.holdDir] ?? ''} ` : '';
  const buttons = buttonNotation(move.input.button);
  return motion ? `${motion} + ${buttons}` : `${hold}${buttons}`;
}

/**
 * Compact frame data. Projectile moves report the projectile's damage, since
 * the move itself does none — showing 0 there would read as a bug.
 */
export function frameNotation(move: Move): string {
  const damage = move.projectile ? move.projectile.hit.damage : move.hit.damage;
  return `${move.startup}f · ${damage} dmg · ${totalFrames(move)}f total`;
}
