/**
 * Adjacency scoring. Turns the map from a canvas into a puzzle: the same
 * building is worth materially more or less depending on what it touches.
 */

import { getBuilding } from '../config/buildings.js';
import { RULES_BY_SUBJECT } from '../config/synergy.js';
import { neighbors8, TERRAIN } from './grid.js';

export const NEUTRAL = Object.freeze({
  revenueMul: 1, capacityMul: 1, heatMul: 1, techMul: 1, appealAdd: 0, hits: [],
});

const TERRAIN_OF = { water: TERRAIN.WATER, hill: TERRAIN.HILL };

const matches = (rule, neighbor) => {
  if (rule.neighbor) {
    const def = neighbor.b ? getBuilding(neighbor.b) : null;
    return Boolean(def) && def.cat === rule.neighbor;
  }
  if (rule.terrain) return neighbor.t === TERRAIN_OF[rule.terrain];
  return false;
};

/**
 * Multipliers earned by one tile from its eight neighbours.
 * @returns {typeof NEUTRAL}
 */
export const tileSynergy = (grid, tile) => {
  const def = tile.b ? getBuilding(tile.b) : null;
  if (!def) return NEUTRAL;
  const rules = RULES_BY_SUBJECT[def.cat];
  if (!rules) return NEUTRAL;

  const ring = neighbors8(grid, tile.x, tile.y);
  const out = { revenueMul: 1, capacityMul: 1, heatMul: 1, techMul: 1, appealAdd: 0, hits: [] };

  for (const rule of rules) {
    let count = 0;
    for (const neighbor of ring) if (matches(rule, neighbor)) count++;
    count = Math.min(count, rule.cap);
    if (count === 0) continue;

    const { revenueMul = 0, capacityMul = 0, heatMul = 0, techMul = 0, appealAdd = 0 } = rule.per;
    out.revenueMul += revenueMul * count;
    out.capacityMul += capacityMul * count;
    out.heatMul += heatMul * count;
    out.techMul += techMul * count;
    out.appealAdd += appealAdd * count;
    out.hits.push({ id: rule.id, label: rule.label, count, cap: rule.cap, hint: rule.hint });
  }
  return out;
};

/**
 * What a candidate building *would* score at (x, y), for the placement preview.
 * Evaluates against a temporary tile so nothing is mutated.
 */
export const previewSynergy = (grid, x, y, buildingId) =>
  tileSynergy(grid, { x, y, b: buildingId, t: TERRAIN.LAND, i: -1 });
