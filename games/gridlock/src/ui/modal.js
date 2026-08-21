/**
 * Modal layer: crisis cards, the opening brief, and end states.
 * One node, one visibility flag, no stacking — a modal is always the only
 * thing the player can act on.
 */

import { choiceCost } from '../core/events.js';
import { clear, credits, el } from './dom.js';

export const createModal = (root) => {
  const card = el('div', 'modal-card');
  root.appendChild(card);

  const hide = () => {
    root.classList.remove('open');
    clear(card);
  };

  const open = () => root.classList.add('open');

  /**
   * @param {object} crisis deck entry
   * @param {(index:number)=>void} onChoose
   */
  const showCrisis = (crisis, state, stats, onChoose) => {
    clear(card);
    card.dataset.kind = 'crisis';
    card.appendChild(el('span', 'modal-eyebrow', 'Crisis'));
    card.appendChild(el('h2', 'modal-title', crisis.title));
    card.appendChild(el('p', 'modal-body', crisis.flavor));

    const options = el('div', 'modal-choices');
    crisis.choices.forEach((choice, index) => {
      const cost = choiceCost(choice, state, stats);
      const affordable = cost <= state.credits;
      const btn = el('button', 'choice');
      btn.appendChild(el('span', 'choice-label', choice.label));
      btn.appendChild(el('span', 'choice-detail', choice.detail));
      btn.appendChild(el('span', 'choice-cost', cost > 0 ? `Costs ${credits(cost)}` : 'No direct cost'));
      btn.disabled = !affordable;
      if (!affordable) btn.title = 'The treasury cannot cover this.';
      btn.addEventListener('click', () => onChoose(index));
      options.appendChild(btn);
    });
    card.appendChild(options);
    open();
  };

  /**
   * @param {{eyebrow?:string, title:string, body:string, kind?:string,
   *          actions:{label:string, onClick:()=>void, primary?:boolean}[]}} spec
   */
  const showMessage = (spec) => {
    clear(card);
    card.dataset.kind = spec.kind ?? 'info';
    if (spec.eyebrow) card.appendChild(el('span', 'modal-eyebrow', spec.eyebrow));
    card.appendChild(el('h2', 'modal-title', spec.title));
    for (const paragraph of spec.body.split('\n\n')) {
      card.appendChild(el('p', 'modal-body', paragraph));
    }
    const actions = el('div', 'modal-actions');
    for (const action of spec.actions) {
      const btn = el('button', action.primary ? 'btn primary' : 'btn');
      btn.textContent = action.label;
      btn.addEventListener('click', action.onClick);
      actions.appendChild(btn);
    }
    card.appendChild(actions);
    open();
  };

  const isOpen = () => root.classList.contains('open');

  return { showCrisis, showMessage, hide, isOpen };
};
