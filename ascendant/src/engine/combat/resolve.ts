import { BURNOUT_BLOCKSTUN_BONUS, DRIVE_PARRY_GAIN, DRIVE_PARRY_STARTUP } from '../data/constants';
import { getMove } from '../data/moves';
import { dot, sub } from '../math/vec3';
import type { Fighter } from '../types/fighter';
import type { MatchState } from '../types/match';
import type { Move } from '../types/move';
import { applyArmor, applyBlock, applyHit, applyParry, type CombatContext } from './apply';
import { bodyCapsule, capsulesOverlap, forwardVector, hitboxCapsule } from './hitbox';

/**
 * Melee resolution: which active hitbox touched whom, and what that means.
 *
 * The outcome ladder is ordered by priority and is the same for every attack in
 * the game — invulnerability, then armor, then parry, then block, then the
 * counter-hit check. Keeping one ladder means a new move can never invent its
 * own defensive exception.
 */

export type HitOutcome = 'whiff' | 'hit' | 'counter' | 'block' | 'parry' | 'armor';

function isInvulnerable(fighter: Fighter, against: 'strike' | 'projectile'): boolean {
  if (!fighter.moveId) {
    return false;
  }
  const invuln = getMove(fighter.moveId).invuln;
  if (!invuln || fighter.moveFrame < invuln.start || fighter.moveFrame > invuln.end) {
    return false;
  }
  return invuln.kind === 'full' || invuln.kind === against;
}

/** You cannot block what you cannot see — crossups and teleports beat guard. */
function facingAttacker(defender: Fighter, attacker: Fighter): boolean {
  const toAttacker = sub(attacker.pos, defender.pos);
  return dot(forwardVector(defender.facing), toAttacker) > 0;
}

function canBlock(defender: Fighter, attacker: Fighter): boolean {
  const guarding = defender.state === 'guard' || defender.state === 'blockstun';
  return guarding && facingAttacker(defender, attacker);
}

function isInStartup(fighter: Fighter): boolean {
  if (fighter.state !== 'attack' || !fighter.moveId) {
    return false;
  }
  return fighter.moveFrame <= getMove(fighter.moveId).startup;
}

export function decideOutcome(attacker: Fighter, defender: Fighter, move: Move): HitOutcome {
  if (isInvulnerable(defender, 'strike')) {
    return 'whiff';
  }
  if (move.hit.guardBreak) {
    return isInStartup(defender) ? 'counter' : 'hit';
  }
  if (defender.armor > 0) {
    return 'armor';
  }
  if (defender.state === 'parry' && defender.parryHold >= DRIVE_PARRY_STARTUP) {
    return 'parry';
  }
  if (canBlock(defender, attacker)) {
    return 'block';
  }
  return isInStartup(defender) ? 'counter' : 'hit';
}

/**
 * Encode "this hitbox already touched this target" so multi-hit moves land once
 * per active window rather than once per frame.
 */
function connectionKey(defenderIndex: number, hitboxIndex: number): number {
  return defenderIndex * 100 + hitboxIndex;
}

export function resolveMelee(state: MatchState, ctx: CombatContext): void {
  for (const attacker of state.fighters) {
    if (attacker.state !== 'attack' || attacker.moveId === null || attacker.hitstop > 0) {
      continue;
    }
    const defender = state.fighters[attacker.index === 0 ? 1 : 0];
    // A dazed opponent is awaiting an Erasure, not a normal punish.
    if (defender.state === 'defeated' || defender.state === 'dazed' || defender.state === 'erased') {
      continue;
    }
    const move = getMove(attacker.moveId);
    const attackerCapsuleSource = attacker;

    for (let i = 0; i < move.hitboxes.length; i++) {
      const hb = move.hitboxes[i];
      if (!hb || attacker.moveFrame < hb.startFrame || attacker.moveFrame > hb.endFrame) {
        continue;
      }
      const key = connectionKey(defender.index, i);
      if (attacker.connected.includes(key)) {
        continue;
      }
      // Throws pass harmlessly under an airborne opponent.
      if (move.kind === 'throw' && !defender.grounded) {
        continue;
      }
      if (!capsulesOverlap(hitboxCapsule(attackerCapsuleSource, hb), bodyCapsule(defender))) {
        continue;
      }

      const outcome = decideOutcome(attacker, defender, move);
      if (outcome === 'whiff') {
        // Deliberately not recorded: the hitbox stays live and may connect on a
        // later frame once the defender's invulnerability lapses.
        continue;
      }

      attacker.connected.push(key);
      applyOutcome(attacker, defender, move, outcome, ctx);
    }
  }
}

export function applyOutcome(
  attacker: Fighter,
  defender: Fighter,
  move: Move,
  outcome: HitOutcome,
  ctx: CombatContext,
): void {
  switch (outcome) {
    case 'armor':
      applyArmor(attacker, defender, move.hit, ctx);
      return;
    case 'parry':
      applyParry(attacker, defender, move.hit, ctx, DRIVE_PARRY_GAIN);
      return;
    case 'block':
      applyBlock(
        attacker,
        defender,
        move.hit,
        ctx,
        defender.burnout > 0 ? BURNOUT_BLOCKSTUN_BONUS : 0,
      );
      return;
    case 'hit':
      applyHit(attacker, defender, move, move.hit, ctx, false);
      return;
    case 'counter':
      applyHit(attacker, defender, move, move.hit, ctx, true);
      return;
    default:
      return;
  }
}

export { isInvulnerable };
