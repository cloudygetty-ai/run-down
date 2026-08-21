import test from 'node:test';
import assert from 'node:assert/strict';

import { computeNetwork } from '../src/core/network.js';
import { ration, POWER_PRIORITY } from '../src/core/rationing.js';
import { idx } from '../src/core/grid.js';
import { newCity, centre, forceTile } from './helpers.mjs';

test('the starting road stub is wired to the Nexus', () => {
  const state = newCity();
  const { x, y } = centre(state);
  const net = computeNetwork(state.grid);
  assert.ok(net.roads.has(idx(state.grid, x + 1, y)));
  assert.ok(net.roads.has(idx(state.grid, x + 2, y)));
  assert.equal(net.roadCount, 6);
});

test('a structure touching a live road is connected', () => {
  const state = newCity();
  const { x, y } = centre(state);
  forceTile(state, x + 1, y + 1, 'hab'); // orthogonal to the road at (x+1, y)
  const net = computeNetwork(state.grid);
  assert.ok(net.connected.has(idx(state.grid, x + 1, y + 1)));
});

test('a structure on an orphan road island is not connected', () => {
  const state = newCity();
  const { x, y } = centre(state);
  forceTile(state, x + 8, y + 8, 'road');
  forceTile(state, x + 8, y + 9, 'hab');
  const net = computeNetwork(state.grid);
  assert.equal(net.roads.has(idx(state.grid, x + 8, y + 8)), false);
  assert.equal(net.connected.has(idx(state.grid, x + 8, y + 9)), false);
});

test('utilities and parks run without a road', () => {
  const state = newCity();
  const { x, y } = centre(state);
  forceTile(state, x + 9, y + 9, 'solar');
  forceTile(state, x + 9, y + 10, 'park');
  const net = computeNetwork(state.grid);
  assert.ok(net.connected.has(idx(state.grid, x + 9, y + 9)));
  assert.ok(net.connected.has(idx(state.grid, x + 9, y + 10)));
});

test('extending the road graph reaches further structures', () => {
  const state = newCity();
  const { x, y } = centre(state);
  for (let i = 3; i <= 6; i++) forceTile(state, x + i, y, 'road');
  forceTile(state, x + 6, y + 1, 'hab');
  const net = computeNetwork(state.grid);
  assert.ok(net.connected.has(idx(state.grid, x + 6, y + 1)));
});

test('rationing serves by priority then index, and is deterministic', () => {
  const consumers = [
    { i: 5, cat: 'industry', draw: 60 },
    { i: 1, cat: 'residential', draw: 30 },
    { i: 9, cat: 'civic', draw: 20 },
  ];
  const first = ration(consumers, 55, POWER_PRIORITY);
  const second = ration(consumers, 55, POWER_PRIORITY);
  assert.deepEqual([...first.served].sort(), [...second.served].sort());
  assert.ok(first.served.has(9), 'civic is served before residential');
  assert.ok(first.served.has(1), 'residential fits in the remaining budget');
  assert.equal(first.served.has(5), false, 'industry browns out first');
  assert.equal(first.demand, 110);
});

test('rationing with no consumers reports a healthy ratio', () => {
  const result = ration([], 0, POWER_PRIORITY);
  assert.equal(result.ratio, 1);
  assert.equal(result.demand, 0);
});
