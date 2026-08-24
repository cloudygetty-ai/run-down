import { describe, expect, it } from 'vitest';
import { FINISHER_WINDOW_FRAMES, INTRO_FRAMES, ROUND_END_FRAMES } from '../data/constants';
import { finisherCallout } from '../data/finishers';
import { vec3 } from '../math/vec3';
import { Button, NEUTRAL_INPUT, type FrameInputs, type PlayerInput } from '../types/input';
import type { MatchConfig, MatchState } from '../types/match';
import { createMatch, defaultConfig } from '../sim/init';
import { step } from '../sim/step';

const config: MatchConfig = defaultConfig();

function press(dir: number, buttons = 0): PlayerInput {
  return { dir, buttons };
}

function pair(a: PlayerInput = NEUTRAL_INPUT, b: PlayerInput = NEUTRAL_INPUT): FrameInputs {
  return [a, b];
}

function run(state: MatchState, frames: number, script: (f: number) => FrameInputs): MatchState {
  let current = state;
  for (let i = 0; i < frames; i++) {
    current = step(current, script(i), config);
  }
  return current;
}

function toFightPhase(state: MatchState): MatchState {
  return run(state, INTRO_FRAMES + 1, () => pair());
}

describe('round flow', () => {
  it('leaves the intro and starts the round', () => {
    const state = toFightPhase(createMatch(config));
    expect(state.phase).toBe('fight');
  });

  it('counts the round timer down while fighting', () => {
    const state = run(toFightPhase(createMatch(config)), 60, () => pair());
    expect(state.timer).toBeLessThan(config.roundTimeFrames);
  });

  it('awards a round on a knockout without ending the match', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[1].health = 0;
    state = run(state, 1, () => pair());

    expect(state.phase).toBe('roundEnd');
    expect(state.fighters[0].wins).toBe(1);
    expect(state.finisher.window).toBe(0);
  });

  it('starts the next round after the round-end pause', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[1].health = 0;
    state = run(state, ROUND_END_FRAMES + 2, () => pair());

    expect(state.round).toBe(2);
    expect(state.phase).toBe('intro');
    expect(state.fighters[1].health).toBe(state.fighters[1].maxHealth);
  });

  it('carries wins and a spent Fatal Blow across rounds', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[0].fatalUsed = true;
    state.fighters[1].health = 0;
    state = run(state, ROUND_END_FRAMES + 2, () => pair());

    expect(state.fighters[0].wins).toBe(1);
    expect(state.fighters[0].fatalUsed).toBe(true);
  });

  it('opens the finisher window on a match-ending blow', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[0].wins = 1;
    state.fighters[1].health = 0;
    state = run(state, 1, () => pair());

    expect(state.phase).toBe('finisher');
    expect(state.finisher.performer).toBe(0);
    expect(state.finisher.window).toBeGreaterThan(0);
    // The loser is left standing, not dropped.
    expect(state.fighters[1].state).toBe('dazed');
    expect(state.fighters[1].health).toBe(1);
  });

  it('ends the match normally when the finisher window lapses', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[0].wins = 1;
    state.fighters[1].health = 0;
    state = run(state, FINISHER_WINDOW_FRAMES + 3, () => pair());

    expect(state.phase).toBe('matchEnd');
    expect(state.finisher.performed).toBeNull();
  });

  it('performs an Erasure when the motion lands in range', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[0].wins = 1;
    state.fighters[1].health = 0;
    state = run(state, 1, () => pair());
    expect(state.phase).toBe('finisher');

    // Close the distance, then enter Vanta's Erasure: quarter-circle back + Ki.
    state.fighters[0].pos = vec3(0, 0, -0.9);
    state.fighters[1].pos = vec3(0, 0, 0.9);
    const script: PlayerInput[] = [
      press(2),
      press(1),
      press(4),
      press(4, Button.Ki),
    ];
    state = run(state, script.length, (f) => pair(script[f] ?? NEUTRAL_INPUT));

    expect(state.phase).toBe('erasure');
    expect(state.finisher.performed).toBe('erasure.vanta');
    expect(state.fighters[1].state).toBe('erased');
    expect(state.fighters[1].health).toBe(0);
  });

  it('refuses the Erasure from out of range', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[0].wins = 1;
    state.fighters[1].health = 0;
    state = run(state, 1, () => pair());

    state.fighters[0].pos = vec3(0, 0, -9);
    state.fighters[1].pos = vec3(0, 0, 9);
    const script: PlayerInput[] = [press(2), press(1), press(4), press(4, Button.Ki)];
    state = run(state, script.length, (f) => pair(script[f] ?? NEUTRAL_INPUT));

    expect(state.phase).toBe('finisher');
    expect(state.finisher.performed).toBeNull();
  });

  it('addresses each fighter with their own pronoun', () => {
    expect(finisherCallout('vanta')).toBe('PUT HER UNDER.');
    expect(finisherCallout('korvath')).toBe('PUT HIM UNDER.');
    expect(finisherCallout('marrow')).toBe('PUT THEM UNDER.');
  });

  it('awards a timeout round to the healthier fighter', () => {
    let state = toFightPhase(createMatch(config));
    state.timer = 1;
    state.fighters[0].health = 500;
    state.fighters[1].health = 200;
    state = run(state, 2, () => pair());

    expect(state.lastRoundWinner).toBe(0);
    expect(state.fighters[0].wins).toBe(1);
  });

  it('awards nobody the round on an exactly tied timeout', () => {
    let state = toFightPhase(createMatch(config));
    state.timer = 1;
    state.fighters[0].health = state.fighters[0].maxHealth;
    state.fighters[1].health = state.fighters[1].maxHealth;
    state = run(state, 2, () => pair());

    expect(state.lastRoundWinner).toBe(-1);
    expect(state.fighters[0].wins).toBe(0);
    expect(state.fighters[1].wins).toBe(0);
  });
});
