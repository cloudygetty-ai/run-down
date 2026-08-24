import {
  DRIVE_MAX,
  INTRO_FRAMES,
  ROUND_TIME_FRAMES,
  ROUNDS_TO_WIN,
  START_DISTANCE,
} from '../data/constants';
import { getCharacter } from '../data/characters';
import { seedRng } from '../math/rng';
import { vec3 } from '../math/vec3';
import { PI } from '../math/trig';
import type { Fighter } from '../types/fighter';
import type { MatchConfig, MatchState } from '../types/match';

/**
 * State construction.
 *
 * Everything the simulation touches is created here, in plain data. There is no
 * hidden initialisation elsewhere, which is what lets a rollback snapshot be a
 * simple structural copy rather than a bespoke serializer per subsystem.
 */

const STARTING_KI = 25;

export function createFighter(index: 0 | 1, characterId: string): Fighter {
  const character = getCharacter(characterId);
  const z = index === 0 ? -START_DISTANCE / 2 : START_DISTANCE / 2;
  return {
    index,
    characterId,
    pos: vec3(0, 0, z),
    vel: vec3(0, 0, 0),
    // Fighter 0 looks along +z, fighter 1 back along -z.
    facing: index === 0 ? 0 : PI,
    state: 'idle',
    stateFrame: 0,
    moveId: null,
    moveFrame: 0,
    chain: [],
    connected: [],
    health: character.stats.maxHealth,
    maxHealth: character.stats.maxHealth,
    ki: STARTING_KI,
    drive: DRIVE_MAX,
    superMeter: 0,
    burnout: 0,
    stun: 0,
    hitstop: 0,
    juggle: 0,
    comboHits: 0,
    comboDamage: 0,
    grounded: true,
    flying: false,
    transformed: false,
    transformFrames: 0,
    fatalUsed: false,
    vanishCooldown: 0,
    parryHold: 0,
    armor: 0,
    wins: 0,
    dashForward: 0,
    dashStrafe: 0,
    inputHistory: [],
  };
}

export function defaultConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    roundsToWin: ROUNDS_TO_WIN,
    roundTimeFrames: ROUND_TIME_FRAMES,
    stageId: 'crater',
    seed: 1,
    characterIds: ['vanta', 'korvath'],
    ...overrides,
  };
}

export function createMatch(config: MatchConfig): MatchState {
  return {
    frame: 0,
    phase: 'intro',
    phaseFrame: 0,
    round: 1,
    timer: config.roundTimeFrames,
    fighters: [
      createFighter(0, config.characterIds[0]),
      createFighter(1, config.characterIds[1]),
    ],
    projectiles: [],
    effects: [],
    rng: seedRng(config.seed),
    stageId: config.stageId,
    nextProjectileId: 1,
    lastRoundWinner: -1,
    finisher: { window: 0, performer: -1, performed: null },
  };
}

/**
 * Reset for the next round.
 *
 * Super meter and the spent Fatal Blow deliberately persist: both are
 * match-scoped comeback resources, and resetting them would erase the story a
 * long set is telling.
 */
export function resetRound(state: MatchState, config: MatchConfig): void {
  for (const index of [0, 1] as const) {
    const previous = state.fighters[index];
    const fresh = createFighter(index, previous.characterId);
    fresh.wins = previous.wins;
    fresh.superMeter = previous.superMeter;
    fresh.fatalUsed = previous.fatalUsed;
    state.fighters[index] = fresh;
  }
  state.projectiles = [];
  state.effects = [];
  state.timer = config.roundTimeFrames;
  state.phase = 'intro';
  state.phaseFrame = 0;
  state.finisher = { window: 0, performer: -1, performed: null };
}

export const INTRO_LENGTH = INTRO_FRAMES;
