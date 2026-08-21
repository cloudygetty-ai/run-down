import test from 'node:test';
import assert from 'node:assert/strict';

import { DIRECTIVES, MAX_ACTIVE_DIRECTIVES, directiveById } from '../src/config/directives.js';
import { directiveProgress, evaluateDirectives, refillDirectives } from '../src/core/directives.js';
import { computeStats } from '../src/core/stats.js';
import { newCity } from './helpers.mjs';

const withStats = (mutate = () => {}) => {
  const state = newCity();
  mutate(state);
  return { state, stats: computeStats(state) };
};

test('the queue fills to the active limit and no further', () => {
  const { state } = withStats();
  refillDirectives(state);
  assert.equal(state.directives.active.length, MAX_ACTIVE_DIRECTIVES);
  refillDirectives(state);
  assert.equal(state.directives.active.length, MAX_ACTIVE_DIRECTIVES);
});

test('completing a directive pays out and pulls in the next one', () => {
  const { state, stats } = withStats((s) => { s.population = 400; });
  const credits = state.credits;
  evaluateDirectives(state, stats);
  assert.ok(state.directives.done.includes('first-roots'));
  assert.equal(state.credits, credits + directiveById('first-roots').reward.credits);
  assert.equal(state.directives.active.length, MAX_ACTIVE_DIRECTIVES);
  assert.equal(state.directives.active.includes('first-roots'), false);
});

test('streak directives require consecutive months and reset on a break', () => {
  const { state, stats } = withStats((s) => { s.population = 400; });
  state.directives.active = ['keep-the-lights-on'];
  const held = { ...stats, power: { ratio: 1 }, water: { ratio: 1 } };

  for (let i = 0; i < 3; i++) evaluateDirectives(state, held);
  assert.equal(state.directives.progress['keep-the-lights-on'], 3);

  evaluateDirectives(state, { ...held, power: { ratio: 0.4 } });
  assert.equal(state.directives.progress['keep-the-lights-on'], 0, 'a blackout resets the streak');

  for (let i = 0; i < 6; i++) evaluateDirectives(state, held);
  assert.ok(state.directives.done.includes('keep-the-lights-on'));
});

test('progress is reported as current/goal and never exceeds the goal', () => {
  const { state, stats } = withStats((s) => { s.population = 9999; });
  const [current, goal] = directiveProgress(directiveById('first-roots'), state, stats);
  assert.equal(goal, 250);
  assert.equal(current, 250, 'progress is clamped for the bar');
});

test('the victory directive flags a win once Zero Point is running', () => {
  const state = newCity();
  const cx = Math.floor(state.grid.w / 2);
  const cy = Math.floor(state.grid.h / 2);
  const at = (x, y, id) => { state.grid.tiles[y * state.grid.w + x].b = id; };
  at(cx + 1, cy + 1, 'zeropoint'); // beside the starting road stub
  for (let i = 0; i < 3; i++) at(cx + 5 + i, cy + 5, 'solar'); // enough generation

  state.directives.active = ['zero-point'];
  evaluateDirectives(state, computeStats(state));
  assert.equal(state.won, true);
});

test('an unpowered Zero Point does not win the game', () => {
  const state = newCity();
  const cx = Math.floor(state.grid.w / 2);
  const cy = Math.floor(state.grid.h / 2);
  state.grid.tiles[(cy + 1) * state.grid.w + (cx + 1)].b = 'zeropoint';

  state.directives.active = ['zero-point'];
  evaluateDirectives(state, computeStats(state));
  assert.equal(state.won, false, 'the Nexus alone cannot carry a 140MW draw');
});

test('every directive is measurable and uniquely named', () => {
  const ids = new Set();
  for (const directive of DIRECTIVES) {
    assert.ok(!ids.has(directive.id), `duplicate directive: ${directive.id}`);
    ids.add(directive.id);
    assert.ok(directive.title && directive.detail);
    assert.ok(directive.test || directive.holds, `${directive.id} has no completion condition`);
    if (directive.streak) assert.equal(typeof directive.holds, 'function');
  }
});
