import test from 'node:test';
import assert from 'node:assert/strict';

import { previewSynergy, tileSynergy } from '../src/core/synergy.js';
import { TERRAIN } from '../src/core/grid.js';
import { newCity, centre, forceTile, tile, flatten } from './helpers.mjs';

test('commerce beside housing earns a revenue multiplier per neighbour', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  forceTile(state, x + 5, y + 5, 'market');
  forceTile(state, x + 5, y + 4, 'hab');
  forceTile(state, x + 6, y + 5, 'hab');
  const syn = tileSynergy(state.grid, tile(state, x + 5, y + 5));
  assert.ok(Math.abs(syn.revenueMul - 1.16) < 1e-9, `got ${syn.revenueMul}`);
  assert.equal(syn.hits[0].label, 'Foot Traffic');
  assert.equal(syn.hits[0].count, 2);
});

test('synergy counts are capped', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  forceTile(state, x + 5, y + 5, 'market');
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]]) {
    forceTile(state, x + 5 + dx, y + 5 + dy, 'hab');
  }
  const syn = tileSynergy(state.grid, tile(state, x + 5, y + 5));
  assert.equal(syn.hits[0].count, 4, 'Foot Traffic caps at four neighbours');
  assert.ok(Math.abs(syn.revenueMul - 1.32) < 1e-9);
});

test('housing beside industry loses appeal', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  forceTile(state, x + 7, y + 7, 'hab');
  forceTile(state, x + 7, y + 8, 'fab');
  const syn = tileSynergy(state.grid, tile(state, x + 7, y + 7));
  assert.ok(syn.appealAdd < 0, `expected a penalty, got ${syn.appealAdd}`);
});

test('waterfront data centres run cooler', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  tile(state, x + 7, y + 8).t = TERRAIN.WATER;
  forceTile(state, x + 7, y + 7, 'server');
  const syn = tileSynergy(state.grid, tile(state, x + 7, y + 7));
  assert.ok(syn.heatMul < 1, `expected cooling, got ${syn.heatMul}`);
});

test('a lone structure scores neutral', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  forceTile(state, x + 9, y + 9, 'market');
  const syn = tileSynergy(state.grid, tile(state, x + 9, y + 9));
  assert.equal(syn.revenueMul, 1);
  assert.equal(syn.hits.length, 0);
});

test('preview matches what the tile would score, without mutating the grid', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  forceTile(state, x + 5, y + 4, 'hab');
  const preview = previewSynergy(state.grid, x + 5, y + 5, 'market');
  assert.equal(preview.hits[0].label, 'Foot Traffic');
  assert.equal(tile(state, x + 5, y + 5).b, null, 'preview must not place anything');
});

test('empty tiles have no synergy', () => {
  const state = flatten(newCity());
  const { x, y } = centre(state);
  assert.equal(tileSynergy(state.grid, tile(state, x + 9, y + 9)).hits.length, 0);
});
