/**
 * Spatial fields: desirability and service coverage.
 *
 * Both are radial and linearly falling off, computed once per tick and reused
 * by the economy, the renderer overlays, and the tile inspector.
 */

import { getBuilding } from '../config/buildings.js';
import { SERVICE_KINDS } from '../config/balance.js';
import { forEachInRadius, TERRAIN } from './grid.js';
import { tileSynergy } from './synergy.js';

/**
 * @param {object} grid
 * @param {Set<number>} live tiles that are road-connected and utility-fed
 * @returns {{appeal: Float32Array, services: Record<string, Float32Array>}}
 */
export const computeFields = (grid, live) => {
  const size = grid.w * grid.h;
  const appeal = new Float32Array(size);
  const services = Object.fromEntries(SERVICE_KINDS.map((k) => [k, new Float32Array(size)]));

  for (const tile of grid.tiles) {
    // Open water is pleasant to look at even where nothing is built.
    if (tile.t === TERRAIN.WATER) appeal[tile.i] += 1.5;
    if (tile.b === null) continue;
    const def = getBuilding(tile.b);
    if (!def || !live.has(tile.i)) continue;

    if (def.appeal && def.appealRadius) {
      const bonus = def.appeal + tileSynergy(grid, tile).appealAdd;
      forEachInRadius(grid, tile.x, tile.y, def.appealRadius, (t, dist) => {
        appeal[t.i] += bonus * (1 - dist / (def.appealRadius + 1));
      });
    }
    if (def.service) {
      const field = services[def.service];
      forEachInRadius(grid, tile.x, tile.y, def.serviceRadius, (t, dist) => {
        field[t.i] = Math.max(field[t.i], 1 - (dist / (def.serviceRadius + 1)) * 0.5);
      });
    }
  }
  return { appeal, services };
};

/**
 * Mean service coverage across housing, 0–1. Empty cities read as fully
 * covered so a brand-new map is not punished for having no citizens yet.
 */
export const housingCoverage = (grid, fields, housingTiles) => {
  if (housingTiles.length === 0) return 1;
  let total = 0;
  for (const tile of housingTiles) {
    let sum = 0;
    for (const kind of SERVICE_KINDS) sum += fields.services[kind][tile.i];
    total += sum / SERVICE_KINDS.length;
  }
  return total / housingTiles.length;
};

/** Mean desirability across housing, used for approval and growth. */
export const housingAppeal = (grid, fields, housingTiles) => {
  if (housingTiles.length === 0) return 0;
  let total = 0;
  for (const tile of housingTiles) total += fields.appeal[tile.i];
  return total / housingTiles.length;
};
