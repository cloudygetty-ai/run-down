import { getCharacter } from '../data/characters';
import { getMove } from '../data/moves';
import { spawnProjectile, tickProjectiles } from '../combat/projectiles';
import { resolveMelee } from '../combat/resolve';
import type { CombatContext } from '../combat/apply';
import { selectMove, startMove } from '../fighter/actions';
import { tickLocomotion, tryVanish } from '../fighter/locomotion';
import { faceOpponent, separate, tickPhysics } from '../fighter/movement';
import { advanceState, tickTimers } from '../fighter/timers';
import { pushInput, latestInput } from '../input/buffer';
import { tickMatchFlow } from '../match/rounds';
import type { Fighter } from '../types/fighter';
import type { FrameInputs } from '../types/input';
import type { MatchConfig, MatchState } from '../types/match';
import { cloneState } from './clone';

/**
 * The tick.
 *
 * `step` is pure: it copies the incoming state, mutates the copy, and returns
 * it. Rollback depends on that contract absolutely — the same state and the
 * same inputs must always produce the same result, no matter how many times the
 * frame is replayed. Nothing in here may read a clock, call Math.random, or
 * touch anything outside the arguments.
 *
 * Order is load-bearing and is documented step by step below; swapping two
 * stages changes the game's feel even when nothing desyncs.
 */

function statsOf(fighter: Fighter) {
  return getCharacter(fighter.characterId).stats;
}

/** Fire a move's projectile on the exact frame its startup completes. */
function spawnPending(state: MatchState, fighter: Fighter): void {
  if (fighter.state !== 'attack' || fighter.moveId === null || fighter.hitstop > 0) {
    return;
  }
  const move = getMove(fighter.moveId);
  if (move.projectile && fighter.moveFrame === move.startup) {
    spawnProjectile(state, fighter, move.projectile);
  }
}

export function step(previous: MatchState, inputs: FrameInputs, config: MatchConfig): MatchState {
  const state = cloneState(previous);
  state.frame += 1;

  const ctx: CombatContext = {
    stats: [statsOf(state.fighters[0]), statsOf(state.fighters[1])],
    effects: state.effects,
  };

  // 1. Record inputs first: everything downstream reads motion history, and a
  //    move entered this frame must be visible to this frame's selection.
  for (const index of [0, 1] as const) {
    pushInput(state.fighters[index].inputHistory, inputs[index]);
  }

  // 2. Round flow decides whether fighters may act at all.
  const live = tickMatchFlow(state, config);

  for (const index of [0, 1] as const) {
    const fighter = state.fighters[index];
    const opponent = state.fighters[index === 0 ? 1 : 0];
    const stats = ctx.stats[index];

    // 3. Timers always run, even between rounds, so meters and stun drain
    //    while the announcer is talking.
    tickTimers(fighter, stats);

    if (!live) {
      continue;
    }

    const input = latestInput(fighter.inputHistory);

    // 4. The Vanish escape is checked before state resolution: it is the one
    //    action legal from inside hitstun, and it must beat the stun timer.
    if (!tryVanish(fighter, opponent, input, state.effects)) {
      advanceState(fighter);
      const chosen = selectMove(fighter, input);
      if (chosen) {
        startMove(fighter, chosen, stats);
      }
      tickLocomotion(fighter, input, stats);
    }

    spawnPending(state, fighter);
  }

  // 5. Physics after intent, so a launch applied this frame moves this frame.
  for (const fighter of state.fighters) {
    tickPhysics(fighter);
  }

  // 6. Lock-on. Attacks keep their committed angle so a hitbox cannot be
  //    steered onto a target mid-active.
  for (const index of [0, 1] as const) {
    const fighter = state.fighters[index];
    const opponent = state.fighters[index === 0 ? 1 : 0];
    if (fighter.state !== 'attack' && fighter.state !== 'dazed') {
      faceOpponent(fighter, opponent.pos.x, opponent.pos.z);
    }
  }

  // 7. Resolve contact, then projectiles, then push bodies apart last so no
  //    hitbox check ever runs against an interpenetrated pair.
  if (live) {
    resolveMelee(state, ctx);
  }
  tickProjectiles(state, ctx);
  separate(state.fighters[0], state.fighters[1]);

  return state;
}
