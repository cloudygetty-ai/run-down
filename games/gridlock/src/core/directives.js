/**
 * Directive queue evaluation. Runs once per month against a draft state.
 */

import { DIRECTIVES, MAX_ACTIVE_DIRECTIVES, directiveById } from '../config/directives.js';
import { pushLog } from './state.js';

/** Fill the active slots from the queue, in order, skipping finished ones. */
export const refillDirectives = (state) => {
  const { active, done } = state.directives;
  for (const directive of DIRECTIVES) {
    if (active.length >= MAX_ACTIVE_DIRECTIVES) break;
    if (done.includes(directive.id) || active.includes(directive.id)) continue;
    active.push(directive.id);
  }
  return state;
};

/** True when the directive's condition is met right now. */
export const isComplete = (directive, state, stats) => {
  if (directive.test) return Boolean(directive.test(state, stats));
  if (directive.streak) return (state.directives.progress[directive.id] ?? 0) >= directive.streak;
  return false;
};

/** Current/goal pair for the progress bar, or null when not measurable. */
export const directiveProgress = (directive, state, stats) => {
  if (directive.streak) {
    return [state.directives.progress[directive.id] ?? 0, directive.streak];
  }
  if (directive.progress) {
    const [current, goal] = directive.progress(state, stats);
    return [Math.min(current, goal), goal];
  }
  return null;
};

/**
 * Advance streaks, pay out completions, and pull in replacements.
 * Mutates the draft state — called only from the tick.
 */
export const evaluateDirectives = (state, stats) => {
  refillDirectives(state);

  for (const id of [...state.directives.active]) {
    const directive = directiveById(id);
    if (!directive) continue;

    if (directive.streak) {
      const held = directive.holds(state, stats);
      const current = state.directives.progress[id] ?? 0;
      state.directives.progress[id] = held ? current + 1 : 0;
    }
    if (!isComplete(directive, state, stats)) continue;

    state.directives.active = state.directives.active.filter((a) => a !== id);
    state.directives.done.push(id);
    state.credits += directive.reward.credits ?? 0;
    state.tech += directive.reward.tech ?? 0;

    const reward = directive.reward.credits
      ? ` +₡${directive.reward.credits.toLocaleString()}`
      : '';
    pushLog(state, `Directive complete — ${directive.title}.${reward}`, 'good');
    if (directive.victory) state.won = true;
  }

  return refillDirectives(state);
};
