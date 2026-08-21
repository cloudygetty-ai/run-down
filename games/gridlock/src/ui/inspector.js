/**
 * Context panel. Answers exactly one question at a time: "what happens if I
 * click here?" — or, with no tool held, "what is this thing doing?"
 */

import { getBuilding } from '../config/buildings.js';
import { canPlace } from '../core/commands.js';
import { idx, TERRAIN } from '../core/grid.js';
import { previewSynergy, tileSynergy } from '../core/synergy.js';
import { clear, credits, el } from './dom.js';
import { BULLDOZE } from './build.js';

const TERRAIN_NAME = { [TERRAIN.LAND]: 'Open ground', [TERRAIN.WATER]: 'Open water', [TERRAIN.HILL]: 'Ridge' };

const synergyList = (syn) => {
  const wrap = el('div', 'insp-syn');
  if (syn.hits.length === 0) {
    wrap.appendChild(el('p', 'insp-dim', 'No adjacency bonuses here.'));
    return wrap;
  }
  for (const hit of syn.hits) {
    const row = el('div', 'syn-row');
    const positive = !hit.label.includes('Downwind');
    row.dataset.tone = positive ? 'good' : 'bad';
    row.appendChild(el('span', 'syn-label', hit.label));
    row.appendChild(el('span', 'syn-count', `×${hit.count}${hit.count >= hit.cap ? ' max' : ''}`));
    row.appendChild(el('span', 'syn-hint', hit.hint));
    wrap.appendChild(row);
  }
  return wrap;
};

const multipliers = (syn) => {
  const out = [];
  if (syn.revenueMul !== 1) out.push(`revenue ×${syn.revenueMul.toFixed(2)}`);
  if (syn.capacityMul !== 1) out.push(`housing ×${syn.capacityMul.toFixed(2)}`);
  if (syn.heatMul !== 1) out.push(`heat ×${syn.heatMul.toFixed(2)}`);
  if (syn.techMul !== 1) out.push(`research ×${syn.techMul.toFixed(2)}`);
  if (syn.appealAdd) out.push(`appeal ${syn.appealAdd > 0 ? '+' : ''}${syn.appealAdd.toFixed(1)}`);
  return out.join(' · ');
};

const statusOf = (state, tile) => {
  const stats = state.stats;
  if (!stats) return { label: 'Starting up', tone: 'warn' };
  if (stats.live.has(tile.i)) return { label: 'Operating', tone: 'good' };
  if (!stats.network.connected.has(tile.i)) return { label: 'No road connection', tone: 'bad' };
  if (!stats.powered.has(tile.i)) return { label: 'No power', tone: 'bad' };
  return { label: 'No water', tone: 'bad' };
};

export const createInspector = (root) => {
  const show = (state, hover, tool, hoverDef) => {
    clear(root);

    // Palette hover wins: the player is asking about a building, not a tile.
    const def = hoverDef ?? (tool && tool !== BULLDOZE ? getBuilding(tool) : null);

    if (def && hover) {
      const check = canPlace(state, hover.x, hover.y, def.id);
      root.appendChild(el('h2', 'insp-title', def.name));
      root.appendChild(el('p', 'insp-desc', def.desc));
      const verdict = el('p', check.ok ? 'insp-ok' : 'insp-bad',
        check.ok ? `Build here — ${credits(def.cost)}` : check.reason);
      root.appendChild(verdict);
      root.appendChild(synergyList(previewSynergy(state.grid, hover.x, hover.y, def.id)));
      return;
    }
    if (def) {
      root.appendChild(el('h2', 'insp-title', def.name));
      root.appendChild(el('p', 'insp-desc', def.desc));
      root.appendChild(el('p', 'insp-dim', `${credits(def.cost)} · upkeep ₡${def.upkeep}/mo`));
      return;
    }
    if (!hover) {
      root.appendChild(el('h2', 'insp-title', 'The Nexus City'));
      root.appendChild(el('p', 'insp-desc',
        'Pick a structure on the left, then drag on the map to build. Right-drag pans, wheel zooms.'));
      return;
    }

    const tile = state.grid.tiles[idx(state.grid, hover.x, hover.y)];
    if (tile.b === null) {
      root.appendChild(el('h2', 'insp-title', TERRAIN_NAME[tile.t] ?? 'Ground'));
      root.appendChild(el('p', 'insp-dim', `Tile ${hover.x},${hover.y}`));
      if (state.stats) {
        const appeal = state.stats.fields.appeal[tile.i];
        root.appendChild(el('p', 'insp-desc', `Desirability ${appeal >= 0 ? '+' : ''}${appeal.toFixed(1)}`));
      }
      return;
    }

    const built = getBuilding(tile.b);
    const status = statusOf(state, tile);
    root.appendChild(el('h2', 'insp-title', built?.name ?? 'Structure'));
    const badge = el('p', 'insp-status', status.label);
    badge.dataset.tone = status.tone;
    root.appendChild(badge);
    root.appendChild(el('p', 'insp-desc', built?.desc ?? ''));

    const syn = tileSynergy(state.grid, tile);
    const mults = multipliers(syn);
    if (mults) root.appendChild(el('p', 'insp-mult', mults));
    root.appendChild(synergyList(syn));
    root.appendChild(el('p', 'insp-dim', `Upkeep ₡${built?.upkeep ?? 0}/mo · standing ${tile.age} months`));
  };

  return { show };
};
