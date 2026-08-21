/**
 * Balance regression. Not unit tests — these build a fixed district and assert
 * the shape of the curve it produces over a decade. If a tuning change makes a
 * well-built city stall, starve, or go broke, this is what catches it.
 *
 * The fixtures are hand-placed rather than played by a scripted agent: the
 * point is to pin the economy, not to benchmark an AI.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { place } from '../src/core/commands.js';
import { tickMonth } from '../src/core/simulate.js';
import { TERRAIN } from '../src/core/grid.js';
import { newCity, centre, flatten, tile } from './helpers.mjs';

/** Build the given [dx, dy, id] offsets, asserting every one lands. */
const build = (state, entries) => {
  const { x, y } = centre(state);
  let next = state;
  for (const [dx, dy, id] of entries) {
    const result = place(next, x + dx, y + dy, id);
    assert.equal(result.ok, true, `fixture failed at ${dx},${dy} (${id}): ${result.reason}`);
    next = result.state;
  }
  return next;
};

const run = (state, months) => {
  let next = state;
  for (let i = 0; i < months; i++) {
    next = tickMonth(next);
    // Fixtures are about the economy, so crises are held off rather than
    // resolved — the crisis engine has its own tests.
    next = { ...next, crisis: { ...next.crisis, active: null, cooldownUntil: next.month + 24 } };
  }
  return next;
};

/**
 * A balanced era-1 district: twelve habitat blocks, six market rows, services,
 * four solar arrays, and two shoreline pumps, all on a road grid.
 */
const district = () => {
  const state = flatten(newCity(60000));
  const { x, y } = centre(state);
  // Carve a small bay to the south so the pumps have a shoreline.
  for (let d = -2; d <= 2; d++) tile(state, x + d, y + 7).t = TERRAIN.WATER;

  // Two arterials plus two cross streets. Deduped, and tiles the founding
  // stub already paved are skipped so the fixture never fights itself.
  const wanted = new Map();
  for (let d = -5; d <= 5; d++) {
    wanted.set(`${d},0`, [d, 0]);
    wanted.set(`0,${d}`, [0, d]);
  }
  for (let d = -4; d <= 4; d++) {
    wanted.set(`${d},3`, [d, 3]);
    wanted.set(`${d},-3`, [d, -3]);
  }
  const roads = [...wanted.values()]
    .filter(([dx, dy]) => tile(state, x + dx, y + dy).b === null)
    .map(([dx, dy]) => [dx, dy, 'road']);

  return build(state, [
    ...roads,
    // Housing along both cross streets.
    [-4, 2, 'hab'], [-3, 2, 'hab'], [-2, 2, 'hab'], [-1, 2, 'hab'],
    [1, 2, 'hab'], [2, 2, 'hab'], [3, 2, 'hab'], [4, 2, 'hab'],
    [-4, -2, 'hab'], [-3, -2, 'hab'], [3, -2, 'hab'], [4, -2, 'hab'],
    // Commerce facing the housing, which is where Foot Traffic pays.
    [-2, -2, 'market'], [-1, -2, 'market'], [1, -2, 'market'], [2, -2, 'market'],
    [-4, 4, 'market'], [-3, 4, 'market'],
    // Services and greenery.
    [1, 4, 'clinic'], [2, 4, 'academy'], [3, 4, 'security'], [4, 4, 'park'],
    // Utilities, off the road grid.
    [-7, 0, 'solar'], [-7, 1, 'solar'], [-8, 0, 'solar'], [-8, 1, 'solar'],
    [-1, 6, 'pump'], [1, 6, 'pump'],
  ]);
};

test('the fixture district starts fully serviced', () => {
  const state = run(district(), 1);
  assert.equal(state.stats.power.ratio, 1, 'power must be in surplus');
  assert.equal(state.stats.water.ratio, 1, 'water must be in surplus');
  assert.equal(state.stats.stranded, 0, 'every structure must reach the Nexus');
});

test('a balanced district fills up over a decade', () => {
  const state = run(district(), 120);
  const capacity = state.stats.capacity;
  assert.ok(capacity > 300, `expected real housing capacity, got ${Math.round(capacity)}`);
  // Migration targets a share of capacity scaled by approval — a healthy city
  // should settle in the upper half of what it built.
  assert.ok(
    state.population > capacity * 0.6,
    `population ${Math.round(state.population)} against capacity ${Math.round(capacity)}`,
  );
  assert.ok(state.approval > 55, `approval settled at ${Math.round(state.approval)}`);
});

test('a balanced district pays for itself', () => {
  const start = district();
  const state = run(start, 120);
  assert.equal(state.bankrupt, false);
  assert.ok(state.stats.net > 0, `net was ${Math.round(state.stats.net)}/mo at year 10`);
  assert.ok(state.credits > start.credits, 'a working city should accumulate reserves');
});

test('academies bank enough research to reach the next era', () => {
  const state = run(district(), 120);
  assert.ok(state.tech > 100, `only ${Math.round(state.tech)} research in ten years`);
});

test('a clean district does not overheat', () => {
  const state = run(district(), 120);
  assert.ok(state.heat < 30, `heat drifted to ${Math.round(state.heat)} with no dirty industry`);
});

test('swapping in dirty industry drives the heat index up', () => {
  let state = district();
  // Fabricators face the southern street; generators sit off the grid entirely.
  state = build(state, [[-1, 4, 'fab'], [-2, 4, 'fab'], [6, 1, 'diesel'], [6, 2, 'diesel']]);
  const dirty = run(state, 120);
  const clean = run(district(), 120);
  assert.ok(dirty.heat > clean.heat + 15, `dirty ${Math.round(dirty.heat)} vs clean ${Math.round(clean.heat)}`);
});

test('cutting the road to a district takes it offline', () => {
  const state = run(district(), 24);
  const { x, y } = centre(state);
  const severed = { ...state, grid: { ...state.grid, tiles: state.grid.tiles.map((t) => ({ ...t })) } };
  // Remove the entire southern cross street.
  for (let d = -4; d <= 4; d++) {
    const target = severed.grid.tiles[(y + 3) * severed.grid.w + (x + d)];
    if (target.b === 'road') target.b = null;
  }
  const after = run(severed, 1);
  assert.ok(after.stats.stranded > 0, 'severed structures must report as cut off');
  assert.ok(after.stats.capacity < state.stats.capacity, 'stranded housing must stop counting');
});

test('doing nothing for 20 years is survivable but goes nowhere', () => {
  let state = newCity(30000);
  for (let i = 0; i < 240; i++) state = tickMonth(state);
  assert.ok(state.population < 25, 'an unbuilt city must not grow on its own');
  assert.ok(state.credits > 0, 'the starting grant must outlast an idle player');
});

test('the simulation stays fast enough for 3× speed', () => {
  const state = run(district(), 24);
  const started = performance.now();
  for (let i = 0; i < 50; i++) tickMonth(state);
  const perTick = (performance.now() - started) / 50;
  // 3× speed ticks every 380ms; anything near that budget would stutter.
  assert.ok(perTick < 20, `tick cost ${perTick.toFixed(2)}ms on a built-out city`);
});
