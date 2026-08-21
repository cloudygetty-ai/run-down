import { createInitialState } from '../src/core/state.js';
import { idx, TERRAIN } from '../src/core/grid.js';
import { place } from '../src/core/commands.js';
import { refreshStats } from '../src/core/simulate.js';

export const FIXED_SEED = 20870101;

/** A deterministic starting city for every test. */
export const newCity = (credits = 1e6) => {
  const state = createInitialState(FIXED_SEED);
  state.credits = credits;
  return state;
};

/**
 * Flatten the whole map to buildable land. Terrain is seeded, so any test
 * about placement rules must remove terrain luck first.
 */
export const flatten = (state) => {
  state.grid.tiles.forEach((t) => { t.t = TERRAIN.LAND; });
  return state;
};

export const centre = (state) => ({
  x: Math.floor(state.grid.w / 2),
  y: Math.floor(state.grid.h / 2),
});

export const tile = (state, x, y) => state.grid.tiles[idx(state.grid, x, y)];

/** Force a tile's contents, bypassing validation — for building fixtures. */
export const forceTile = (state, x, y, buildingId) => {
  tile(state, x, y).b = buildingId;
  return state;
};

/** Place a list of [dx, dy, id] offsets relative to the Nexus. */
export const placeAll = (state, entries) => {
  const { x, y } = centre(state);
  let next = state;
  for (const [dx, dy, id] of entries) {
    const result = place(next, x + dx, y + dy, id);
    if (!result.ok) throw new Error(`fixture placement failed at ${dx},${dy} (${id}): ${result.reason}`);
    next = result.state;
  }
  return refreshStats(next);
};
