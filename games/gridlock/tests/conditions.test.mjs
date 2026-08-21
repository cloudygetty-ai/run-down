import test from 'node:test';
import assert from 'node:assert/strict';

import { CRISIS_DECK } from '../src/config/events.js';
import { computeStats } from '../src/core/stats.js';
import { drawCrisis } from '../src/core/events.js';
import { EVENTS } from '../src/config/balance.js';
import { newCity } from './helpers.mjs';

const fire = (id, state, stats) => CRISIS_DECK.find((c) => c.id === id).when(state, stats);

test('a comfortably over-supplied grid does not raise a surge', () => {
  const state = newCity();
  const stats = { ...computeStats(state), counts: { power: 2 } };
  stats.power = { supply: 400, demand: 100, ratio: 1 };
  assert.equal(fire('grid-surge', state, stats), false);
});

test('a grid running at the margin does raise a surge', () => {
  const state = newCity();
  const stats = { ...computeStats(state), counts: { power: 2 } };
  stats.power = { supply: 104, demand: 100, ratio: 1 };
  assert.equal(fire('grid-surge', state, stats), true);
});

test('an idle grid with no draw never raises a surge', () => {
  const state = newCity();
  const stats = { ...computeStats(state), counts: { power: 1 } };
  stats.power = { supply: 60, demand: 0, ratio: 1 };
  assert.equal(fire('grid-surge', state, stats), false);
});

test('no condition depends on the clamped utility ratio being above 1', () => {
  // power.ratio and water.ratio are min(1, supply/demand): a condition of the
  // form `ratio < k` for k > 1 is always true and would fire every month.
  const source = CRISIS_DECK.map((c) => c.when.toString()).join('\n');
  assert.equal(/ratio\s*<\s*(1\.\d+|[2-9])/.test(source), false);
});

test('crises never fire during the grace period', () => {
  const state = newCity();
  state.month = EVENTS.graceMonths - 1;
  const stats = computeStats(state);
  for (let i = 0; i < 200; i++) assert.equal(drawCrisis(state, stats), null);
});

test('crises respect the cooldown after one resolves', () => {
  const state = newCity();
  state.month = 40;
  state.crisis = { active: null, cooldownUntil: 50, seen: [] };
  const stats = computeStats(state);
  for (let i = 0; i < 200; i++) assert.equal(drawCrisis(state, stats), null);
});

test('only one crisis is open at a time', () => {
  const state = newCity();
  state.month = 40;
  state.crisis = { active: 'heatwave', cooldownUntil: 0, seen: [] };
  assert.equal(drawCrisis(state, computeStats(state)), null);
});
