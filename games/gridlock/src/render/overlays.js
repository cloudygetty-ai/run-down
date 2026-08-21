/**
 * Data views. The map is the dashboard: each overlay washes the ground with a
 * single legible signal instead of hiding it in a side panel.
 */

import { SERVICE_KINDS } from '../config/balance.js';
import { getBuilding } from '../config/buildings.js';

export const OVERLAYS = Object.freeze([
  { id: 'none', label: 'City', hint: 'The skyline as it stands.' },
  { id: 'appeal', label: 'Desirability', hint: 'Where citizens want to live.' },
  { id: 'utilities', label: 'Utilities', hint: 'What is powered, watered, and wired.' },
  { id: 'services', label: 'Services', hint: 'Clinic, academy, and watch coverage.' },
  { id: 'emissions', label: 'Emissions', hint: 'Who is heating the planet.' },
]);

const ramp = (t, negative, positive) => {
  const clamped = Math.max(-1, Math.min(1, t));
  return clamped >= 0
    ? `rgba(${positive},${0.08 + clamped * 0.42})`
    : `rgba(${negative},${0.08 + -clamped * 0.42})`;
};

const GOOD = '94,224,138';
const BAD = '255,84,112';
const COOL = '94,169,255';
const WARM = '255,140,60';

/**
 * @returns {string|null} an rgba wash for this tile, or null for no tint
 */
export const overlayWash = (mode, stats, tile) => {
  if (!stats || mode === 'none') return null;

  switch (mode) {
    case 'appeal':
      return ramp(stats.fields.appeal[tile.i] / 12, BAD, GOOD);

    case 'utilities': {
      if (tile.b === null) return null;
      const def = getBuilding(tile.b);
      if (!def) return null;
      if (stats.live.has(tile.i)) return `rgba(${GOOD},0.3)`;
      if (stats.network.connected.has(tile.i)) return `rgba(${WARM},0.36)`;
      return `rgba(${BAD},0.4)`;
    }

    case 'services': {
      let sum = 0;
      for (const kind of SERVICE_KINDS) sum += stats.fields.services[kind][tile.i];
      const coverage = sum / SERVICE_KINDS.length;
      return coverage <= 0.02 ? `rgba(${BAD},0.2)` : `rgba(${COOL},${0.1 + coverage * 0.4})`;
    }

    case 'emissions': {
      if (tile.b === null) return null;
      const def = getBuilding(tile.b);
      if (!def) return null;
      const load = def.heat + def.pollution * 0.3;
      if (Math.abs(load) < 0.05) return null;
      return ramp(-load / 8, WARM, GOOD);
    }

    default:
      return null;
  }
};

export const nextOverlay = (current) => {
  const i = OVERLAYS.findIndex((o) => o.id === current);
  return OVERLAYS[(i + 1) % OVERLAYS.length].id;
};
