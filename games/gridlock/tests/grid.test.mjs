import test from 'node:test';
import assert from 'node:assert/strict';

import { createGrid, TERRAIN, neighbors4, neighbors8, touchesTerrain, idx } from '../src/core/grid.js';
import { makeRng, weightedPick } from '../src/core/rng.js';

test('terrain generation is deterministic for a seed', () => {
  const a = createGrid(1234);
  const b = createGrid(1234);
  assert.deepEqual(a.tiles.map((t) => t.t), b.tiles.map((t) => t.t));
});

test('different seeds produce different maps', () => {
  const a = createGrid(1).tiles.map((t) => t.t).join('');
  const b = createGrid(2).tiles.map((t) => t.t).join('');
  assert.notEqual(a, b);
});

test('the founding centre is always buildable land', () => {
  for (const seed of [1, 77, 4242, 999999]) {
    const grid = createGrid(seed);
    const cx = Math.floor(grid.w / 2);
    const cy = Math.floor(grid.h / 2);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        assert.equal(grid.tiles[idx(grid, cx + dx, cy + dy)].t, TERRAIN.LAND, `seed ${seed}`);
      }
    }
  }
});

test('every map has land, and water is generated for coastal builds', () => {
  const grid = createGrid(4242);
  const kinds = new Set(grid.tiles.map((t) => t.t));
  assert.ok(kinds.has(TERRAIN.LAND));
  assert.ok(kinds.has(TERRAIN.WATER), 'expected a bay on this seed');
});

test('neighbour queries clip at the map edge', () => {
  const grid = createGrid(7);
  assert.equal(neighbors4(grid, 0, 0).length, 2);
  assert.equal(neighbors8(grid, 0, 0).length, 3);
  assert.equal(neighbors4(grid, 5, 5).length, 4);
  assert.equal(neighbors8(grid, 5, 5).length, 8);
});

test('touchesTerrain only looks orthogonally', () => {
  const grid = createGrid(7);
  grid.tiles.forEach((t) => { t.t = TERRAIN.LAND; });
  grid.tiles[idx(grid, 4, 3)].t = TERRAIN.WATER;
  assert.equal(touchesTerrain(grid, 4, 4, TERRAIN.WATER), true);
  assert.equal(touchesTerrain(grid, 5, 4, TERRAIN.WATER), false, 'diagonal must not count');
});

test('rng is reproducible and bounded', () => {
  const a = makeRng(99);
  const b = makeRng(99);
  for (let i = 0; i < 50; i++) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
  }
});

test('weightedPick respects weights and handles a zero-weight set', () => {
  const items = [{ w: 0 }, { w: 10 }];
  assert.equal(weightedPick(items, (i) => i.w, 0.5), items[1]);
  assert.equal(weightedPick(items, () => 0, 0.5), null);
});
