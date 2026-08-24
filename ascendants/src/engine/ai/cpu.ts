import { FATAL_HEALTH_RATIO, KI_VANISH_COST, THROW_RANGE } from '../data/constants';
import { getMove } from '../data/moves';
import { getCharacter } from '../data/characters';
import { nextFloat, seedRng } from '../math/rng';
import { distanceXZ } from '../math/vec3';
import { Button, NEUTRAL_INPUT, type PlayerInput } from '../types/input';
import type { Fighter } from '../types/fighter';
import type { MatchState } from '../types/match';

/**
 * The CPU opponent.
 *
 * Deterministic by construction: it reads only the current state and draws
 * randomness from a generator seeded by the frame number. That means the same
 * frame always yields the same decision, so a rolled-back frame replays
 * identically and the AI cannot desync a match.
 *
 * It plays by ranges rather than by scripts — what it does is chosen by how far
 * away you are and what you are currently doing, which is roughly how a human
 * decides too.
 */

export type Difficulty = 'rookie' | 'fighter' | 'herald';

type Profile = {
  /** Chance per frame of committing to an action at all. */
  readonly aggression: number;
  /** Chance of blocking a threat it has recognised. */
  readonly defense: number;
  /** Frames of deliberate delay before reacting, simulating human latency. */
  readonly reaction: number;
  readonly usesVanish: boolean;
  readonly usesSuper: boolean;
};

const PROFILES: Record<Difficulty, Profile> = {
  rookie: { aggression: 0.05, defense: 0.25, reaction: 16, usesVanish: false, usesSuper: false },
  fighter: { aggression: 0.11, defense: 0.6, reaction: 8, usesVanish: true, usesSuper: true },
  herald: { aggression: 0.2, defense: 0.9, reaction: 3, usesVanish: true, usesSuper: true },
};

const CLOSE_RANGE = 2.0;
const MID_RANGE = 5.5;

function rngFor(frame: number, index: number): ReturnType<typeof seedRng> {
  return seedRng(Math.imul(frame + 1, 2654435761) ^ Math.imul(index + 7, 40503));
}

/** Is the opponent committed to something the CPU could react to? */
function opponentThreatening(opponent: Fighter): boolean {
  if (opponent.state !== 'attack' || opponent.moveId === null) {
    return false;
  }
  const move = getMove(opponent.moveId);
  return opponent.moveFrame <= move.startup + move.active;
}

function pick(dir: number, buttons: number): PlayerInput {
  return { dir, buttons };
}

export function cpuInput(
  state: MatchState,
  index: 0 | 1,
  difficulty: Difficulty = 'fighter',
): PlayerInput {
  const self = state.fighters[index];
  const opponent = state.fighters[index === 0 ? 1 : 0];
  const profile = PROFILES[difficulty];

  if (state.phase !== 'fight' && state.phase !== 'finisher') {
    return NEUTRAL_INPUT;
  }

  const rng = rngFor(state.frame, index);
  const roll = nextFloat(rng);
  const distance = distanceXZ(self.pos, opponent.pos);

  // Escape a combo rather than sit in it, when the resource allows.
  if (profile.usesVanish && (self.state === 'hitstun' || self.state === 'launched')) {
    if (self.ki >= KI_VANISH_COST && self.vanishCooldown === 0 && roll < 0.4) {
      return pick(5, Button.Vanish);
    }
    return NEUTRAL_INPUT;
  }

  // Reaction delay: below the profile's threshold the CPU simply has not
  // noticed yet, which is what stops higher difficulties feeling precognitive.
  const noticed = state.frame % profile.reaction === 0;

  if (opponentThreatening(opponent) && distance < MID_RANGE && noticed) {
    if (roll < profile.defense) {
      // Occasionally parry instead of blocking, for the Drive reward.
      return roll < profile.defense * 0.25 ? pick(5, Button.Drive) : pick(4, Button.Guard);
    }
  }

  // Comeback tools take priority once they are available.
  const desperate = self.health <= self.maxHealth * FATAL_HEALTH_RATIO;
  if (desperate && !self.fatalUsed && distance < CLOSE_RANGE && roll < 0.25) {
    return pick(6, Button.Drive | Button.Ki);
  }

  if (profile.usesSuper && self.superMeter >= 3000 && distance < MID_RANGE && roll < 0.1) {
    return superInput(self, state.frame);
  }

  if (roll > profile.aggression) {
    // Idle behaviour: hold ground, or charge ki when there is space to do it.
    if (distance > MID_RANGE && nextFloat(rng) < 0.5) {
      return pick(5, Button.Charge);
    }
    return distance > CLOSE_RANGE ? pick(6, 0) : pick(5, 0);
  }

  if (distance <= THROW_RANGE && nextFloat(rng) < 0.15) {
    return pick(5, Button.Light | Button.Medium);
  }
  if (distance <= CLOSE_RANGE) {
    const choice = nextFloat(rng);
    if (choice < 0.4) {
      return pick(5, Button.Light);
    }
    if (choice < 0.7) {
      return pick(5, Button.Medium);
    }
    return pick(2, Button.Heavy);
  }
  if (distance <= MID_RANGE) {
    return nextFloat(rng) < 0.5 ? pick(6, Button.Dash) : pick(6, Button.Medium);
  }
  return nextFloat(rng) < 0.6 ? pick(5, Button.Ki) : pick(6, 0);
}

/**
 * Supers need their motion spread across several frames, so the CPU walks the
 * double quarter-circle deterministically off the frame counter.
 */
function superInput(self: Fighter, frame: number): PlayerInput {
  const sequence = [2, 3, 6, 2, 3, 6];
  const position = frame % (sequence.length + 1);
  if (position === sequence.length) {
    const character = getCharacter(self.characterId);
    return pick(6, getMove(character.superMove).input.button);
  }
  return pick(sequence[position] ?? 5, 0);
}
