/**
 * Player commands. Each returns a new state — the caller never mutates.
 * Validation lives here and nowhere else, so the UI, the tests, and any future
 * scripted agent all get identical rules.
 */

import { TAX } from '../config/balance.js';
import { getBuilding } from '../config/buildings.js';
import { TERRAIN, idx, inBounds, touchesTerrain } from './grid.js';
import { cloneState, pushLog } from './state.js';

export const REFUND_RATE = 0.35;

/** Structures that may sit on a ridge; everything else needs flat ground. */
const HILL_OK = new Set(['geo', 'park', 'road', 'wind']);

/** @returns {{ok: boolean, reason?: string}} */
export const canPlace = (state, x, y, buildingId) => {
  if (!inBounds(state.grid, x, y)) return { ok: false, reason: 'Outside the map.' };
  const def = getBuilding(buildingId);
  if (!def || def.hidden) return { ok: false, reason: 'Unknown structure.' };
  if (def.era > state.era) return { ok: false, reason: `Locked until Era ${def.era}.` };

  const tile = state.grid.tiles[idx(state.grid, x, y)];
  if (tile.b !== null) return { ok: false, reason: 'Tile occupied.' };
  if (tile.t === TERRAIN.WATER) return { ok: false, reason: 'Cannot build on water.' };
  if (tile.t === TERRAIN.HILL && !HILL_OK.has(def.id)) return { ok: false, reason: 'Ridge is too steep.' };

  if (def.needs === 'water' && !touchesTerrain(state.grid, x, y, TERRAIN.WATER)) {
    return { ok: false, reason: 'Must touch open water.' };
  }
  if (def.needs === 'hill' && tile.t !== TERRAIN.HILL) {
    return { ok: false, reason: 'Must be sunk into a ridge.' };
  }
  if (def.cost > state.credits) return { ok: false, reason: 'Not enough credits.' };
  return { ok: true };
};

/** @returns {{state: object, ok: boolean, reason?: string}} */
export const place = (state, x, y, buildingId) => {
  const check = canPlace(state, x, y, buildingId);
  if (!check.ok) return { state, ...check };

  const def = getBuilding(buildingId);
  const draft = cloneState(state);
  const tile = draft.grid.tiles[idx(draft.grid, x, y)];
  tile.b = buildingId;
  tile.age = 0;
  draft.credits -= def.cost;
  if (def.cost >= 2000) pushLog(draft, `${def.name} under construction.`, 'info');
  return { state: draft, ok: true };
};

/** @returns {{state: object, ok: boolean, reason?: string}} */
export const demolish = (state, x, y) => {
  if (!inBounds(state.grid, x, y)) return { state, ok: false, reason: 'Outside the map.' };
  const tile = state.grid.tiles[idx(state.grid, x, y)];
  if (tile.b === null) return { state, ok: false, reason: 'Nothing here.' };
  if (tile.b === 'nexus') return { state, ok: false, reason: 'The Nexus cannot be removed.' };

  const def = getBuilding(tile.b);
  const draft = cloneState(state);
  const target = draft.grid.tiles[idx(draft.grid, x, y)];
  target.b = null;
  target.on = false;
  draft.credits += Math.round((def?.cost ?? 0) * REFUND_RATE);
  return { state: draft, ok: true };
};

export const setTax = (state, rate) => ({
  ...state,
  taxRate: Math.max(TAX.min, Math.min(TAX.max, Math.round(rate * 100) / 100)),
});

export const setSpeed = (state, speed) => ({
  ...state,
  speed: Math.max(0, Math.min(3, speed | 0)),
});
