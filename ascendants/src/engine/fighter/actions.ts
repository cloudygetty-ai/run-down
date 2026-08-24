import { FATAL_HEALTH_RATIO, TRANSFORM_KI_REQUIRED } from '../data/constants';
import type { CharacterStats } from '../data/characters';
import { getMove, movesFor, resolveCancels } from '../data/moves';
import { pressedWithin, recentDirs } from '../input/buffer';
import { MOTION_WINDOW, matchesHold, matchesMotion } from '../input/motion';
import { canSpendDrive, spendDrive } from '../combat/drive';
import { canSpendKi, spendKi } from '../combat/ki';
import { scale, add, vec3 } from '../math/vec3';
import { forwardVector } from '../combat/hitbox';
import type { Fighter } from '../types/fighter';
import type { Move, MoveKind } from '../types/move';
import { totalFrames } from '../types/move';
import type { PlayerInput } from '../types/input';

/**
 * Move selection: turning a frame of input into an action.
 *
 * Candidates are ranked by how specific their input is — a six-direction super
 * motion beats a quarter-circle, which beats a bare button press. Without that
 * ordering the first matching entry in the table would win, and every super
 * would come out as a jab.
 */

const INPUT_BUFFER_FRAMES = 4;

const PRIORITY: Record<MoveKind, number> = {
  fatal: 100,
  super: 90,
  transform: 85,
  driveImpact: 80,
  throw: 70,
  overdrive: 65,
  special: 60,
  beam: 55,
  blast: 50,
  command: 40,
  normal: 30,
};

function specificity(move: Move): number {
  const holdBonus = move.input.holdDir ? 5 : 0;
  return move.input.motion.length * 100 + PRIORITY[move.kind] + holdBonus;
}

function affordable(fighter: Fighter, move: Move): boolean {
  return (
    canSpendKi(fighter, move.cost.ki) &&
    (move.cost.drive === 0 || canSpendDrive(fighter, move.cost.drive)) &&
    fighter.superMeter >= move.cost.superMeter
  );
}

/** Conditions beyond resources: Fatal Blows and transformations are gated. */
function unlocked(fighter: Fighter, move: Move): boolean {
  if (move.kind === 'fatal') {
    return !fighter.fatalUsed && fighter.health <= fighter.maxHealth * FATAL_HEALTH_RATIO;
  }
  if (move.kind === 'transform') {
    return !fighter.transformed && fighter.ki >= TRANSFORM_KI_REQUIRED;
  }
  return true;
}

function stanceAllows(fighter: Fighter, move: Move): boolean {
  return fighter.grounded ? move.groundOk : move.airOk;
}

/**
 * Cancel rules: a move already in progress can only be replaced if it has
 * connected, the new move is in its cancel list, and it has not already been
 * used in this chain (which is what stops a light attack looping into itself).
 */
function cancelAllowed(fighter: Fighter, next: Move): boolean {
  if (fighter.state !== 'attack' || fighter.moveId === null) {
    return true;
  }
  const current = getMove(fighter.moveId);
  if (fighter.connected.length === 0) {
    return false;
  }
  if (fighter.moveFrame > totalFrames(current)) {
    return true;
  }
  if (fighter.chain.includes(next.id)) {
    return false;
  }
  return resolveCancels(current, fighter.characterId).includes(next.id);
}

function inputMatches(fighter: Fighter, move: Move, current: PlayerInput): boolean {
  const required = move.input.button;
  if ((current.buttons & required) !== required) {
    return false;
  }
  if (!pressedWithin(fighter.inputHistory, required, INPUT_BUFFER_FRAMES)) {
    return false;
  }
  if (move.input.holdDir !== undefined && !matchesHold(current.dir, move.input.holdDir)) {
    return false;
  }
  return matchesMotion(recentDirs(fighter.inputHistory, MOTION_WINDOW), move.input.motion);
}

/** The highest-specificity legal move for this frame, or null. */
export function selectMove(fighter: Fighter, current: PlayerInput): Move | null {
  let best: Move | null = null;
  let bestScore = -1;

  for (const move of movesFor(fighter.characterId)) {
    if (!stanceAllows(fighter, move) || !unlocked(fighter, move) || !affordable(fighter, move)) {
      continue;
    }
    if (!cancelAllowed(fighter, move) || !inputMatches(fighter, move, current)) {
      continue;
    }
    const score = specificity(move);
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

/** Commit to a move: pay its costs, reset its counters, apply its travel. */
export function startMove(fighter: Fighter, move: Move, stats: CharacterStats): void {
  spendKi(fighter, move.cost.ki);
  if (move.cost.drive > 0) {
    spendDrive(fighter, move.cost.drive);
  }
  fighter.superMeter -= move.cost.superMeter;

  if (fighter.state === 'attack' && fighter.moveId !== null) {
    fighter.chain.push(fighter.moveId);
  } else {
    fighter.chain.length = 0;
  }

  fighter.state = 'attack';
  fighter.stateFrame = 0;
  fighter.moveId = move.id;
  fighter.moveFrame = 0;
  fighter.connected.length = 0;
  fighter.parryHold = 0;

  if (move.kind === 'fatal') {
    fighter.fatalUsed = true;
  }
  if (move.invuln?.kind === 'armor') {
    fighter.armor = move.invuln.armorHits ?? 1;
  }

  if (move.travel) {
    const forward = scale(forwardVector(fighter.facing), move.travel.forward * stats.dashMult);
    fighter.pos = add(fighter.pos, forward);
    if (move.travel.up !== 0) {
      fighter.vel = vec3(fighter.vel.x, move.travel.up, fighter.vel.z);
      fighter.grounded = false;
      fighter.flying = false;
    }
  }
}
