import { describe, expect, it } from 'vitest';
import { INTRO_FRAMES } from '../data/constants';
import { vec3 } from '../math/vec3';
import { Button, NEUTRAL_INPUT, type FrameInputs, type PlayerInput } from '../types/input';
import type { MatchConfig, MatchState } from '../types/match';
import { cloneState } from './clone';
import { checksum } from './hash';
import { createMatch, defaultConfig } from './init';
import { step } from './step';

const config: MatchConfig = defaultConfig();

function press(dir: number, buttons: number): PlayerInput {
  return { dir, buttons };
}

function pair(a: PlayerInput, b: PlayerInput = NEUTRAL_INPUT): FrameInputs {
  return [a, b];
}

function run(
  state: MatchState,
  frames: number,
  script: (frame: number) => FrameInputs,
): MatchState {
  let current = state;
  for (let i = 0; i < frames; i++) {
    current = step(current, script(i), config);
  }
  return current;
}

/** Advance past the intro so fighters can act. */
function toFightPhase(state: MatchState): MatchState {
  return run(state, INTRO_FRAMES + 1, () => pair(NEUTRAL_INPUT));
}

/** A varied but reproducible input script that exercises most subsystems. */
function busyScript(frame: number): FrameInputs {
  const p1 = press(
    [5, 6, 6, 2, 3, 6, 5, 4][frame % 8] ?? 5,
    frame % 11 === 0 ? Button.Light : frame % 17 === 0 ? Button.Ki : frame % 23 === 0 ? Button.Heavy : 0,
  );
  const p2 = press(
    [5, 4, 5, 6, 8, 5, 2, 6][frame % 8] ?? 5,
    frame % 13 === 0 ? Button.Medium : frame % 19 === 0 ? Button.Guard : 0,
  );
  return [p1, p2];
}

describe('simulation step', () => {
  it('is a pure function — the input state is never mutated', () => {
    const state = toFightPhase(createMatch(config));
    const before = checksum(state);
    step(state, pair(press(6, Button.Heavy)), config);
    expect(checksum(state)).toBe(before);
  });

  it('produces identical results for identical inputs', () => {
    const a = run(createMatch(config), 900, busyScript);
    const b = run(createMatch(config), 900, busyScript);
    expect(checksum(a)).toBe(checksum(b));
  });

  it('diverges when a single frame of input differs', () => {
    const baseline = run(createMatch(config), 400, busyScript);
    const altered = run(createMatch(config), 400, (frame) =>
      frame === 150 ? pair(press(6, Button.Heavy), press(4, Button.Guard)) : busyScript(frame),
    );
    expect(checksum(altered)).not.toBe(checksum(baseline));
  });

  it('replays identically from a mid-match snapshot — the rollback guarantee', () => {
    // This is the property the whole netcode rests on: rewinding to a saved
    // frame and re-running the same inputs must land on the same state.
    let live = createMatch(config);
    live = run(live, 300, busyScript);

    const snapshot = cloneState(live);
    const straightThrough = run(live, 200, (f) => busyScript(f + 300));
    const fromSnapshot = run(snapshot, 200, (f) => busyScript(f + 300));

    expect(checksum(fromSnapshot)).toBe(checksum(straightThrough));
  });

  it('survives a long match without producing NaN or leaving the arena', () => {
    const final = run(createMatch(config), 3000, busyScript);
    for (const fighter of final.fighters) {
      expect(Number.isFinite(fighter.pos.x)).toBe(true);
      expect(Number.isFinite(fighter.pos.y)).toBe(true);
      expect(Number.isFinite(fighter.pos.z)).toBe(true);
      expect(Number.isFinite(fighter.health)).toBe(true);
      const radius = Math.hypot(fighter.pos.x, fighter.pos.z);
      expect(radius).toBeLessThanOrEqual(27);
      expect(fighter.health).toBeGreaterThanOrEqual(0);
      expect(fighter.ki).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps fighters from occupying the same space', () => {
    const final = run(createMatch(config), 600, () => pair(press(6, 0), press(4, 0)));
    const [a, b] = final.fighters;
    expect(Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z)).toBeGreaterThan(1);
  });

  it('lands a jab on an adjacent opponent and deals damage', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[0].pos = vec3(0, 0, -0.8);
    state.fighters[1].pos = vec3(0, 0, 0.8);
    const startingHealth = state.fighters[1].health;

    state = run(state, 14, () => pair(press(5, Button.Light)));
    expect(state.fighters[1].health).toBeLessThan(startingHealth);
  });

  it('deals no damage through a guarding opponent beyond chip', () => {
    let state = toFightPhase(createMatch(config));
    state.fighters[0].pos = vec3(0, 0, -0.8);
    state.fighters[1].pos = vec3(0, 0, 0.8);
    const startingHealth = state.fighters[1].health;

    state = run(state, 14, () => pair(press(5, Button.Light), press(5, Button.Guard)));
    // The universal jab has no chip damage, so a clean block costs nothing.
    expect(state.fighters[1].health).toBe(startingHealth);
    expect(state.fighters[1].drive).toBeLessThan(state.fighters[0].drive);
  });

  it('does not let fighters act during the intro', () => {
    const state = run(createMatch(config), 30, () => pair(press(6, Button.Heavy)));
    expect(state.fighters[0].state).toBe('idle');
    expect(state.phase).toBe('intro');
  });
});
