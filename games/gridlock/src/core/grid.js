/**
 * Tile grid: terrain generation, indexing, and neighbourhood queries.
 * Knows nothing about economics — it is pure geometry.
 */

import { GRID } from '../config/balance.js';
import { noise2, hash2 } from './rng.js';

export const TERRAIN = Object.freeze({ LAND: 0, WATER: 1, HILL: 2 });

export const idx = (grid, x, y) => y * grid.w + x;
export const inBounds = (grid, x, y) => x >= 0 && y >= 0 && x < grid.w && y < grid.h;
export const tileAt = (grid, x, y) => (inBounds(grid, x, y) ? grid.tiles[idx(grid, x, y)] : null);

const NEIGHBORS_4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const NEIGHBORS_8 = [...NEIGHBORS_4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Orthogonal neighbours — used for road networks and terrain requirements. */
export const neighbors4 = (grid, x, y) =>
  NEIGHBORS_4.map(([dx, dy]) => tileAt(grid, x + dx, y + dy)).filter(Boolean);

/** Full ring — used for adjacency synergy. */
export const neighbors8 = (grid, x, y) =>
  NEIGHBORS_8.map(([dx, dy]) => tileAt(grid, x + dx, y + dy)).filter(Boolean);

const makeTile = (i, w, terrain, seed) => ({
  i,
  x: i % w,
  y: Math.floor(i / w),
  t: terrain,
  b: null,
  age: 0,
  on: false,
  variant: hash2(i % w, Math.floor(i / w), seed + 77),
});

/**
 * Generate a bay-and-ridge map. The centre 6×6 is forced to buildable land so
 * the opening move is never blocked by terrain.
 */
export const createGrid = (seed, w = GRID.width, h = GRID.height) => {
  const grid = { w, h, tiles: new Array(w * h) };
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;

  for (let i = 0; i < w * h; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    const coast = noise2(x, y, 9, seed) * 0.75 + noise2(x, y, 3.5, seed + 1) * 0.25;
    // Push water toward the south-east corner so the bay reads as a coastline.
    const bay = (x / w) * 0.28 + (y / h) * 0.34;
    const ridge = noise2(x, y, 6, seed + 400);

    let terrain = TERRAIN.LAND;
    if (coast + bay > 0.86) terrain = TERRAIN.WATER;
    else if (ridge > 0.78) terrain = TERRAIN.HILL;

    const nearCentre = Math.abs(x - cx) < 3 && Math.abs(y - cy) < 3;
    grid.tiles[i] = makeTile(i, w, nearCentre ? TERRAIN.LAND : terrain, seed);
  }
  return grid;
};

/** Shallow-copies every tile so a simulation pass never mutates prior state. */
export const cloneGrid = (grid) => ({
  w: grid.w,
  h: grid.h,
  tiles: grid.tiles.map((t) => ({ ...t })),
});

/** True when any orthogonal neighbour has the given terrain type. */
export const touchesTerrain = (grid, x, y, terrain) =>
  neighbors4(grid, x, y).some((t) => t.t === terrain);

/** Every built tile, in index order. */
export const builtTiles = (grid) => grid.tiles.filter((t) => t.b !== null);

/** Iterate tiles inside a square radius without allocating an array. */
export const forEachInRadius = (grid, x, y, radius, fn) => {
  const x0 = Math.max(0, x - radius);
  const x1 = Math.min(grid.w - 1, x + radius);
  const y0 = Math.max(0, y - radius);
  const y1 = Math.min(grid.h - 1, y + radius);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const dist = Math.hypot(tx - x, ty - y);
      if (dist <= radius) fn(grid.tiles[idx(grid, tx, ty)], dist);
    }
  }
};
