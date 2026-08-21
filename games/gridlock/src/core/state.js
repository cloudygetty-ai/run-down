/**
 * State construction and cloning.
 *
 * INVARIANT: state is plain, serialisable data. No class instances, no
 * functions, no DOM references — so a save file is `JSON.stringify(state)` and
 * a replay is exact.
 */

import { GRID, START } from '../config/balance.js';
import { createGrid, cloneGrid, idx } from './grid.js';

export const LOG_LIMIT = 40;
export const HISTORY_LIMIT = 72;

export const createInitialState = (seed = (Date.now() & 0xffffff)) => {
  const grid = createGrid(seed);
  const cx = Math.floor(GRID.width / 2);
  const cy = Math.floor(GRID.height / 2);
  const nexus = grid.tiles[idx(grid, cx, cy)];
  nexus.b = 'nexus';
  nexus.on = true;

  // Seed a short road stub so the first zone has somewhere legal to sit.
  for (const [dx, dy] of [[1, 0], [2, 0], [-1, 0], [-2, 0], [0, 1], [0, -1]]) {
    grid.tiles[idx(grid, cx + dx, cy + dy)].b = 'road';
  }

  const state = {
    version: 1,
    seed,
    month: 0,
    credits: START.credits,
    population: 0,
    approval: START.approval,
    heat: START.heat,
    taxRate: START.taxRate,
    tech: 0,
    era: 1,
    speed: 1,
    won: false,
    bankrupt: false,
    grid,
    stats: null,
    crisis: { active: null, cooldownUntil: 0, seen: [] },
    modifiers: [],
    directives: { active: [], done: [], progress: {} },
    history: { population: [], credits: [], approval: [], heat: [], net: [] },
    log: [],
    rollCount: 0,
  };
  return pushLog(state, 'The Nexus is online. Build outward.', 'good');
};

/**
 * Structural clone. Cheap enough to run per command and per tick (1024 shallow
 * tile copies ≈ tens of microseconds) and it removes every aliasing bug class.
 */
export const cloneState = (state) => ({
  ...state,
  grid: cloneGrid(state.grid),
  crisis: { ...state.crisis, seen: [...state.crisis.seen] },
  modifiers: state.modifiers.map((m) => ({ ...m })),
  directives: {
    active: [...state.directives.active],
    done: [...state.directives.done],
    progress: { ...state.directives.progress },
  },
  history: {
    population: [...state.history.population],
    credits: [...state.history.credits],
    approval: [...state.history.approval],
    heat: [...state.history.heat],
    net: [...state.history.net],
  },
  log: [...state.log],
});

/** Append a dated line to the city log, newest first, bounded. */
export const pushLog = (state, text, kind = 'info') => {
  state.log = [{ month: state.month, text, kind }, ...state.log].slice(0, LOG_LIMIT);
  return state;
};

/** Append to a bounded history series. */
export const pushHistory = (series, value) => {
  series.push(value);
  if (series.length > HISTORY_LIMIT) series.shift();
  return series;
};

/** Month index → in-world date. Month 0 is Jan 2087. */
export const formatDate = (month) => {
  const names = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${names[month % 12]} ${2087 + Math.floor(month / 12)}`;
};
