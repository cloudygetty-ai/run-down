import test from 'node:test';
import assert from 'node:assert/strict';

import { tickMonth } from '../src/core/simulate.js';
import { computeStats } from '../src/core/stats.js';
import { nextHeat } from '../src/core/economy.js';
import { TERRAIN } from '../src/core/grid.js';
import { newCity, centre, placeAll, tile } from './helpers.mjs';

/** A minimal working city: road, housing, jobs, power, and a shoreline pump. */
const workingCity = () => {
  const state = newCity();
  const { x, y } = centre(state);
  state.grid.tiles.forEach((t) => { t.t = TERRAIN.LAND; }); // flat map, no terrain luck
  tile(state, x + 3, y + 4).t = TERRAIN.WATER; // shoreline for the pump below
  return placeAll(state, [
    [1, 1, 'hab'], [1, -1, 'hab'], [2, 1, 'hab'],
    [-1, 1, 'market'], [-1, -1, 'market'],
    [0, 3, 'diesel'], [0, -3, 'solar'],
    [3, 3, 'pump'],
  ]);
};

test('ticking is pure — the input state is untouched', () => {
  const before = workingCity();
  const snapshot = JSON.stringify({ ...before, stats: null });
  tickMonth(before);
  assert.equal(JSON.stringify({ ...before, stats: null }), snapshot);
});

test('ticking is deterministic for identical states', () => {
  const state = workingCity();
  const a = tickMonth(state);
  const b = tickMonth(state);
  assert.equal(
    JSON.stringify({ ...a, stats: null }),
    JSON.stringify({ ...b, stats: null }),
  );
});

test('a serviced city gains residents', () => {
  let state = newCity();
  state.grid.tiles.forEach((t) => { t.t = TERRAIN.LAND; });
  state.era = 3; // the condenser is the terrain-free water source
  state = placeAll(state, [
    [1, 1, 'hab'], [2, 1, 'hab'], [1, -1, 'hab'],
    [-1, 1, 'market'], [-2, 1, 'market'],
    [0, 3, 'solar'], [0, 4, 'solar'], [3, 0, 'condenser'],
  ]);
  for (let i = 0; i < 12; i++) state = tickMonth(state);
  assert.ok(state.population > 20, `expected growth, got ${state.population}`);
  assert.equal(Number.isFinite(state.credits), true);
});

test('housing beyond the Nexus supply browns out until utilities are built', () => {
  let state = newCity();
  state.grid.tiles.forEach((t) => { t.t = TERRAIN.LAND; });
  // Twelve habitat blocks draw 72MW against the Nexus's own 60MW.
  state = placeAll(state, [
    [1, 1, 'hab'], [1, -1, 'hab'], [2, 1, 'hab'], [2, -1, 'hab'],
    [-1, 1, 'hab'], [-1, -1, 'hab'], [-2, 1, 'hab'], [-2, -1, 'hab'],
    [3, 0, 'hab'], [-3, 0, 'hab'], [0, 2, 'hab'], [0, -2, 'hab'],
  ]);
  state = tickMonth(state);
  assert.ok(state.stats.power.ratio < 1, 'demand must exceed the Nexus supply');
  const dark = state.grid.tiles.filter((t) => t.b === 'hab' && !t.on);
  assert.ok(dark.length > 0, 'some blocks must be unpowered');

  // Adding generation lights the whole district back up.
  state = placeAll(state, [[0, 4, 'solar'], [0, 5, 'solar']]);
  state = tickMonth(state);
  assert.equal(state.stats.power.ratio, 1);
  assert.equal(state.grid.tiles.filter((t) => t.b === 'hab' && !t.on).length, 0);
});

test('the treasury moves by exactly the reported net', () => {
  const state = workingCity();
  const stats = computeStats(state);
  const next = tickMonth(state);
  assert.ok(Math.abs(next.credits - (state.credits + stats.net)) < 1e-9);
});

test('dirty generation raises the heat index, clean generation does not', () => {
  const dirty = nextHeat({ heat: 20 }, { heatLoad: 12 });
  const clean = nextHeat({ heat: 20 }, { heatLoad: 0 });
  assert.ok(dirty > 20, 'emissions must warm the city');
  assert.ok(clean < 20, 'with no load the index decays');
});

test('the heat index is bounded', () => {
  assert.equal(nextHeat({ heat: 99.9 }, { heatLoad: 5000 }), 100);
  assert.equal(nextHeat({ heat: 0 }, { heatLoad: 0 }), 0);
});

test('an empty city stays solvent long enough to build', () => {
  let state = newCity(30000);
  for (let i = 0; i < 24; i++) state = tickMonth(state);
  assert.equal(state.bankrupt, false);
  assert.equal(state.month, 24);
});
