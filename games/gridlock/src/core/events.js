/**
 * Crisis engine — draws cards from the deck and interprets their effects.
 *
 * Every random decision routes through state.rollCount so a save replays
 * identically: the roll is a function of (seed, rollCount), never of wall
 * clock or Math.random.
 */

import { EVENTS } from '../config/balance.js';
import { CRISIS_DECK } from '../config/events.js';
import { getBuilding } from '../config/buildings.js';
import { makeRng, weightedPick } from './rng.js';
import { cloneState, pushLog } from './state.js';

/** Advance the deterministic stream and return the next value in [0,1). */
export const nextRoll = (state) => {
  state.rollCount += 1;
  return makeRng(state.seed + state.rollCount * 7919)();
};

const byId = new Map(CRISIS_DECK.map((c) => [c.id, c]));
export const getCrisis = (id) => byId.get(id);

/**
 * Decide whether a crisis fires this month. Mutates the draft state's roll
 * counter and returns the drawn card, or null.
 */
export const drawCrisis = (state, stats) => {
  if (state.crisis.active) return null;
  if (state.month < EVENTS.graceMonths || state.month < state.crisis.cooldownUntil) return null;
  if (nextRoll(state) > EVENTS.chance) return null;

  const eligible = CRISIS_DECK.filter((card) => {
    try {
      return card.when(state, stats);
    } catch {
      return false; // A malformed condition must never take the game down.
    }
  });
  if (eligible.length === 0) return null;

  // Unseen cards are three times as likely — the deck stays surprising longer.
  const weightOf = (card) => card.weight * (state.crisis.seen.includes(card.id) ? 1 : 3);
  return weightedPick(eligible, weightOf, nextRoll(state));
};

const destroyOne = (state, cat) => {
  const targets = state.grid.tiles.filter((t) => {
    if (t.b === null || t.b === 'nexus') return false;
    return cat ? getBuilding(t.b)?.cat === cat : true;
  });
  if (targets.length === 0) return null;
  const victim = targets[Math.floor(nextRoll(state) * targets.length) % targets.length];
  const name = getBuilding(victim.b)?.name ?? 'structure';
  victim.b = null;
  victim.on = false;
  return name;
};

const applyEffects = (state, stats, effects) => {
  for (const effect of effects ?? []) {
    switch (effect.kind) {
      case 'credits':
        state.credits += typeof effect.value === 'function' ? effect.value(state, stats) : effect.value;
        break;
      case 'approval':
        state.approval = Math.max(0, Math.min(100, state.approval + effect.value));
        break;
      case 'pop':
        state.population = effect.mul ? state.population * effect.mul : state.population + effect.value;
        break;
      case 'tech':
        state.tech += effect.value;
        break;
      case 'heat':
        state.heat = Math.max(0, Math.min(100, state.heat + effect.value));
        break;
      case 'modifier':
        state.modifiers = [
          ...state.modifiers.filter((m) => m.id !== effect.id),
          { id: effect.id, label: effect.label, months: effect.months, effects: effect.effects },
        ];
        break;
      case 'destroy': {
        for (let n = 0; n < (effect.count ?? 1); n++) {
          const lost = destroyOne(state, effect.cat);
          if (lost) pushLog(state, `${lost} lost.`, 'bad');
        }
        break;
      }
      case 'risk': {
        const hit = nextRoll(state) < effect.chance;
        applyEffects(state, stats, hit ? effect.then : effect.otherwise);
        break;
      }
      default:
        break;
    }
  }
};

/**
 * Resolve the active crisis with the chosen option.
 * @returns {{state: object, ok: boolean, reason?: string}}
 */
export const resolveCrisis = (state, stats, choiceIndex) => {
  const card = state.crisis.active ? getCrisis(state.crisis.active) : null;
  if (!card) return { state, ok: false, reason: 'No active crisis.' };
  const choice = card.choices[choiceIndex];
  if (!choice) return { state, ok: false, reason: 'Unknown option.' };

  const cost = typeof choice.cost === 'function' ? choice.cost(state, stats) : (choice.cost ?? 0);
  if (cost > state.credits) return { state, ok: false, reason: 'Not enough credits.' };

  const draft = cloneState(state);
  draft.credits -= cost;
  applyEffects(draft, stats, choice.effects);
  draft.crisis = {
    active: null,
    cooldownUntil: draft.month + EVENTS.cooldown,
    seen: draft.crisis.seen.includes(card.id) ? draft.crisis.seen : [...draft.crisis.seen, card.id],
  };
  pushLog(draft, `${card.title}: ${choice.label}.`, 'event');
  return { state: draft, ok: true };
};

/** Cost of an option right now, for the modal to render and disable buttons. */
export const choiceCost = (choice, state, stats) =>
  typeof choice.cost === 'function' ? choice.cost(state, stats) : (choice.cost ?? 0);
