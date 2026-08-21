/**
 * The monthly tick — the only place time moves.
 *
 * Pure: tickMonth(state) → new state. Nothing here reads the clock, the DOM,
 * or Math.random, which is what makes the whole simulation testable and a save
 * file replayable.
 */

import { eraForTech, eraById } from '../config/eras.js';
import { computeStats } from './stats.js';
import { nextApproval, nextHeat, nextPopulation } from './economy.js';
import { evaluateDirectives } from './directives.js';
import { drawCrisis } from './events.js';
import { cloneState, pushHistory, pushLog } from './state.js';

export const BANKRUPT_FLOOR = -2000;

/** Expire timed crisis modifiers, logging the ones that lapse. */
const ageModifiers = (draft) => {
  const survivors = [];
  for (const mod of draft.modifiers) {
    const months = mod.months - 1;
    if (months > 0) survivors.push({ ...mod, months });
    else pushLog(draft, `${mod.label} has lifted.`, 'info');
  }
  draft.modifiers = survivors;
};

/** Mirror the live set onto tiles so the renderer needs no simulation logic. */
const syncTiles = (draft, stats) => {
  for (const tile of draft.grid.tiles) {
    if (tile.b === null) continue;
    tile.on = stats.live.has(tile.i);
    tile.age += 1;
  }
};

const advanceEra = (draft) => {
  const era = eraForTech(draft.tech);
  if (era <= draft.era) return;
  draft.era = era;
  const info = eraById(era);
  pushLog(draft, `Era ${era} — ${info.name}. New structures unlocked.`, 'good');
};

const recordHistory = (draft, stats) => {
  pushHistory(draft.history.population, Math.round(draft.population));
  pushHistory(draft.history.credits, Math.round(draft.credits));
  pushHistory(draft.history.approval, Math.round(draft.approval));
  pushHistory(draft.history.heat, Math.round(draft.heat));
  pushHistory(draft.history.net, Math.round(stats.net));
};

/**
 * @param {object} state
 * @returns {object} the next state, with `stats` holding this month's snapshot
 */
export const tickMonth = (state) => {
  const stats = computeStats(state);
  const draft = cloneState(state);

  draft.month += 1;
  draft.credits += stats.net;
  draft.population = nextPopulation(state, stats);
  draft.approval = nextApproval(state, stats);
  draft.heat = nextHeat(state, stats);
  draft.tech += stats.techGain;

  advanceEra(draft);
  ageModifiers(draft);
  syncTiles(draft, stats);
  evaluateDirectives(draft, stats);

  const card = drawCrisis(draft, stats);
  if (card) {
    draft.crisis = { ...draft.crisis, active: card.id };
    draft.speed = 0; // A crisis stops the world until the player answers it.
    for (const effect of card.onFire ?? []) {
      draft.modifiers = [
        ...draft.modifiers.filter((m) => m.id !== effect.id),
        { id: effect.id, label: effect.label, months: effect.months, effects: effect.effects },
      ];
    }
    pushLog(draft, `${card.title} — a decision is required.`, 'event');
  }

  if (draft.credits < BANKRUPT_FLOOR && !draft.bankrupt) {
    draft.bankrupt = true;
    draft.speed = 0;
    pushLog(draft, 'The treasury is empty. The city is in receivership.', 'bad');
  } else if (draft.credits >= 0 && draft.bankrupt) {
    draft.bankrupt = false;
  }

  recordHistory(draft, stats);
  draft.stats = stats;
  return draft;
};

/** Recompute the stats snapshot without advancing time (used after edits). */
export const refreshStats = (state) => ({ ...state, stats: computeStats(state) });
