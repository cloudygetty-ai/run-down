import test from 'node:test';
import assert from 'node:assert/strict';

import { canPlace, demolish, place, setSpeed, setTax, REFUND_RATE } from '../src/core/commands.js';
import { getBuilding } from '../src/config/buildings.js';
import { TERRAIN } from '../src/core/grid.js';
import { TAX } from '../src/config/balance.js';
import { newCity, centre, tile, flatten } from './helpers.mjs';

test('placing deducts the cost and marks the tile', () => {
  const state = newCity();
  const { x, y } = centre(state);
  const result = place(state, x + 1, y + 1, 'hab');
  assert.equal(result.ok, true);
  assert.equal(tile(result.state, x + 1, y + 1).b, 'hab');
  assert.equal(result.state.credits, state.credits - getBuilding('hab').cost);
});

test('commands never mutate the state they were given', () => {
  const state = newCity();
  const { x, y } = centre(state);
  const before = state.credits;
  place(state, x + 1, y + 1, 'hab');
  assert.equal(state.credits, before);
  assert.equal(tile(state, x + 1, y + 1).b, null);
});

test('occupied tiles are refused', () => {
  const state = newCity();
  const { x, y } = centre(state);
  const first = place(state, x + 1, y + 1, 'hab').state;
  assert.equal(canPlace(first, x + 1, y + 1, 'hab').ok, false);
});

test('water and ridges block the wrong structures', () => {
  const state = newCity();
  const { x, y } = centre(state);
  tile(state, x + 3, y).t = TERRAIN.WATER;
  tile(state, x + 4, y).t = TERRAIN.HILL;
  assert.equal(canPlace(state, x + 3, y, 'hab').reason, 'Cannot build on water.');
  assert.equal(canPlace(state, x + 4, y, 'hab').reason, 'Ridge is too steep.');
  assert.equal(canPlace(state, x + 4, y, 'road').ok, true, 'roads may cross a ridge');
});

test('shoreline structures require adjacent water', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  assert.equal(canPlace(state, x + 2, y + 2, 'pump').ok, false);
  tile(state, x + 2, y + 3).t = TERRAIN.WATER;
  assert.equal(canPlace(state, x + 2, y + 2, 'pump').ok, true);
});

test('geothermal must be sunk into a ridge', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  state.era = 2;
  assert.equal(canPlace(state, x + 2, y + 2, 'geo').ok, false);
  tile(state, x + 2, y + 2).t = TERRAIN.HILL;
  assert.equal(canPlace(state, x + 2, y + 2, 'geo').ok, true);
});

test('era locks and affordability are enforced', () => {
  const state = newCity(100);
  const { x, y } = centre(state);
  assert.equal(canPlace(state, x + 1, y + 1, 'spire').reason, 'Locked until Era 3.');
  assert.equal(canPlace(state, x + 1, y + 1, 'hab').reason, 'Not enough credits.');
});

test('demolishing refunds a share and cannot remove the Nexus', () => {
  const state = newCity();
  const { x, y } = centre(state);
  const built = place(state, x + 1, y + 1, 'fab').state;
  const razed = demolish(built, x + 1, y + 1);
  assert.equal(razed.ok, true);
  assert.equal(tile(razed.state, x + 1, y + 1).b, null);
  assert.equal(
    razed.state.credits,
    built.credits + Math.round(getBuilding('fab').cost * REFUND_RATE),
  );
  assert.equal(demolish(built, x, y).reason, 'The Nexus cannot be removed.');
  assert.equal(demolish(built, x + 6, y + 6).reason, 'Nothing here.');
});

test('tax and speed settings are clamped', () => {
  const state = newCity();
  assert.equal(setTax(state, 5).taxRate, TAX.max);
  assert.equal(setTax(state, -1).taxRate, TAX.min);
  assert.equal(setSpeed(state, 9).speed, 3);
  assert.equal(setSpeed(state, -4).speed, 0);
});
