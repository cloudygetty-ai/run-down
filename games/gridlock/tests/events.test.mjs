import test from 'node:test';
import assert from 'node:assert/strict';

import { getCrisis, nextRoll, resolveCrisis } from '../src/core/events.js';
import { computeStats } from '../src/core/stats.js';
import { CRISIS_DECK } from '../src/config/events.js';
import { newCity, centre, forceTile } from './helpers.mjs';

const withCrisis = (id, credits = 50000) => {
  const state = newCity(credits);
  state.crisis = { ...state.crisis, active: id };
  return state;
};

test('every deck entry is well formed', () => {
  const ids = new Set();
  for (const card of CRISIS_DECK) {
    assert.ok(card.id && !ids.has(card.id), `duplicate or missing id: ${card.id}`);
    ids.add(card.id);
    assert.equal(typeof card.when, 'function');
    assert.ok(card.choices.length >= 2, `${card.id} needs a real trade-off`);
    for (const choice of card.choices) {
      assert.ok(choice.label && choice.detail, `${card.id} choice needs copy`);
      assert.ok(Array.isArray(choice.effects));
    }
  }
});

test('resolving applies credits, approval, and a timed modifier', () => {
  const state = withCrisis('grid-surge');
  const stats = computeStats(state);
  const result = resolveCrisis(state, stats, 0); // shed load
  assert.equal(result.ok, true);
  assert.ok(result.state.approval < state.approval);
  assert.equal(result.state.modifiers.length, 1);
  assert.equal(result.state.modifiers[0].id, 'surge-shed');
  assert.equal(result.state.crisis.active, null);
  assert.ok(result.state.crisis.seen.includes('grid-surge'));
});

test('resolving never mutates the state it was given', () => {
  const state = withCrisis('grid-surge');
  const snapshot = JSON.stringify({ ...state, stats: null });
  resolveCrisis(state, computeStats(state), 0);
  assert.equal(JSON.stringify({ ...state, stats: null }), snapshot);
});

test('a choice the treasury cannot cover is refused', () => {
  const state = withCrisis('breach', 100);
  const result = resolveCrisis(state, computeStats(state), 0); // 6,500 ransom
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Not enough credits.');
  assert.equal(result.state.crisis.active, 'breach', 'the crisis stays open');
});

test('costs are deducted exactly once', () => {
  const state = withCrisis('breach');
  const result = resolveCrisis(state, computeStats(state), 0);
  assert.equal(result.state.credits, state.credits - 6500);
});

test('unknown crises and options fail closed', () => {
  const state = withCrisis('grid-surge');
  assert.equal(resolveCrisis(state, computeStats(state), 99).ok, false);
  assert.equal(resolveCrisis(newCity(), computeStats(newCity()), 0).ok, false);
});

test('risk outcomes are seeded, not random', () => {
  const a = withCrisis('tremor');
  const b = withCrisis('tremor');
  const first = resolveCrisis(a, computeStats(a), 1).state;
  const second = resolveCrisis(b, computeStats(b), 1).state;
  assert.equal(first.rollCount, second.rollCount);
  assert.equal(first.approval, second.approval);
});

test('destruction never takes the Nexus', () => {
  const state = withCrisis('tremor');
  const { x, y } = centre(state);
  forceTile(state, x + 5, y + 5, 'fab');
  // Force the destructive branch by exhausting the risk roll many times.
  for (let i = 0; i < 40; i++) {
    const attempt = resolveCrisis({ ...state, rollCount: i }, computeStats(state), 1);
    const nexus = attempt.state.grid.tiles.find((t) => t.b === 'nexus');
    assert.ok(nexus, 'the Nexus must always survive');
  }
});

test('the roll stream advances deterministically', () => {
  const a = newCity();
  const b = newCity();
  assert.equal(nextRoll(a), nextRoll(b));
  assert.equal(a.rollCount, 1);
  assert.notEqual(nextRoll(a), nextRoll({ ...b, rollCount: 5 }));
});

test('deck conditions never throw on a fresh city', () => {
  const state = newCity();
  const stats = computeStats(state);
  for (const card of CRISIS_DECK) {
    assert.doesNotThrow(() => card.when(state, stats), `${card.id} condition threw`);
  }
  assert.ok(getCrisis('heatwave'));
});
