import {
  ERASURE_FRAMES,
  FINISHER_RANGE,
  FINISHER_WINDOW_FRAMES,
  INTRO_FRAMES,
  MATCH_END_FRAMES,
  ROUND_END_FRAMES,
} from '../data/constants';
import { erasureFor } from '../data/finishers';
import { recentDirs, pressedWithin } from '../input/buffer';
import { matchesMotion } from '../input/motion';
import { MOTION_WINDOW } from '../input/motion';
import { distanceXZ } from '../math/vec3';
import type { Fighter } from '../types/fighter';
import type { MatchConfig, MatchState } from '../types/match';
import { latestInput } from '../input/buffer';
import { resetRound } from '../sim/init';

/**
 * Round flow and the Erasure window.
 *
 * A match-ending blow does not end the match. It leaves the loser dazed and
 * upright while the announcer calls PUT HER/HIM/THEM UNDER, and the winner gets
 * a window to land their Erasure. Letting the window lapse ends the match
 * normally — the finisher is an option the player takes, never a cutscene the
 * game plays at them.
 */

function loserOf(state: MatchState): number {
  const [a, b] = state.fighters;
  if (a.health <= 0) {
    return 0;
  }
  return b.health <= 0 ? 1 : -1;
}

/** On timeout the healthier fighter takes the round; equal health is a draw. */
function timeoutWinner(state: MatchState): number {
  const [a, b] = state.fighters;
  const ratioA = a.health / a.maxHealth;
  const ratioB = b.health / b.maxHealth;
  if (ratioA === ratioB) {
    return -1;
  }
  return ratioA > ratioB ? 0 : 1;
}

function matchPointFor(state: MatchState, winner: number, config: MatchConfig): boolean {
  const fighter = state.fighters[winner === 0 ? 0 : 1];
  return fighter.wins + 1 >= config.roundsToWin;
}

function beginRoundEnd(state: MatchState, winner: number): void {
  state.lastRoundWinner = winner;
  if (winner >= 0) {
    state.fighters[winner === 0 ? 0 : 1].wins += 1;
  }
  state.phase = 'roundEnd';
  state.phaseFrame = 0;
}

/** Open the Erasure window: the loser is left standing rather than dropped. */
function beginFinisherWindow(state: MatchState, winner: number, loser: number): void {
  state.lastRoundWinner = winner;
  state.fighters[winner === 0 ? 0 : 1].wins += 1;

  const victim = state.fighters[loser === 0 ? 0 : 1];
  victim.state = 'dazed';
  victim.stateFrame = 0;
  victim.stun = 0;
  victim.moveId = null;
  victim.vel = { x: 0, y: 0, z: 0 };
  victim.health = 1;

  state.phase = 'finisher';
  state.phaseFrame = 0;
  state.finisher = { window: FINISHER_WINDOW_FRAMES, performer: winner, performed: null };
  state.effects.push({ kind: 'daze', pos: victim.pos, power: 1, owner: victim.index });
}

function tryErasure(state: MatchState, performer: Fighter, victim: Fighter): boolean {
  const erasure = erasureFor(performer.characterId);
  if (!erasure) {
    return false;
  }
  if (distanceXZ(performer.pos, victim.pos) > FINISHER_RANGE || !performer.grounded) {
    return false;
  }
  const current = latestInput(performer.inputHistory);
  if ((current.buttons & erasure.button) !== erasure.button) {
    return false;
  }
  if (!pressedWithin(performer.inputHistory, erasure.button, 4)) {
    return false;
  }
  if (!matchesMotion(recentDirs(performer.inputHistory, MOTION_WINDOW), erasure.motion)) {
    return false;
  }

  victim.state = 'erased';
  victim.stateFrame = 0;
  victim.health = 0;
  state.finisher = { window: 0, performer: performer.index, performed: erasure.id };
  state.phase = 'erasure';
  state.phaseFrame = 0;
  state.effects.push({ kind: 'erasure', pos: victim.pos, power: 2, owner: performer.index });
  return true;
}

function matchOver(state: MatchState, config: MatchConfig): boolean {
  return state.fighters.some((f) => f.wins >= config.roundsToWin);
}

/** Advance whichever phase the match is in. Returns true if the round is live. */
export function tickMatchFlow(state: MatchState, config: MatchConfig): boolean {
  state.phaseFrame += 1;

  switch (state.phase) {
    case 'intro':
      if (state.phaseFrame >= INTRO_FRAMES) {
        state.phase = 'fight';
        state.phaseFrame = 0;
        state.lastRoundWinner = -1;
      }
      return false;

    case 'fight': {
      state.timer = Math.max(0, state.timer - 1);
      const loser = loserOf(state);
      if (loser >= 0) {
        const winner = loser === 0 ? 1 : 0;
        state.fighters[loser === 0 ? 0 : 1].state = 'defeated';
        if (matchPointFor(state, winner, config)) {
          state.fighters[loser === 0 ? 0 : 1].state = 'dazed';
          beginFinisherWindow(state, winner, loser);
        } else {
          beginRoundEnd(state, winner);
        }
        return false;
      }
      if (state.timer <= 0) {
        const winner = timeoutWinner(state);
        if (winner >= 0 && matchPointFor(state, winner, config)) {
          beginFinisherWindow(state, winner, winner === 0 ? 1 : 0);
        } else {
          beginRoundEnd(state, winner);
        }
        return false;
      }
      return true;
    }

    case 'finisher': {
      state.finisher.window -= 1;
      const performerIndex = state.finisher.performer;
      if (performerIndex >= 0) {
        const performer = state.fighters[performerIndex === 0 ? 0 : 1];
        const victim = state.fighters[performerIndex === 0 ? 1 : 0];
        if (tryErasure(state, performer, victim)) {
          return false;
        }
      }
      if (state.finisher.window <= 0) {
        state.phase = 'matchEnd';
        state.phaseFrame = 0;
      }
      // The winner may still move during the window, so the round stays live.
      return true;
    }

    case 'erasure':
      if (state.phaseFrame >= ERASURE_FRAMES) {
        state.phase = 'matchEnd';
        state.phaseFrame = 0;
      }
      return false;

    case 'roundEnd':
      if (state.phaseFrame >= ROUND_END_FRAMES) {
        if (matchOver(state, config)) {
          state.phase = 'matchEnd';
          state.phaseFrame = 0;
        } else {
          state.round += 1;
          resetRound(state, config);
        }
      }
      return false;

    case 'matchEnd':
      return false;

    default:
      return false;
  }
}

export const MATCH_END_LENGTH = MATCH_END_FRAMES;
