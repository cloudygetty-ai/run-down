/**
 * Transient feedback for rejected actions and small wins. Bounded queue:
 * spamming a blocked tile can never fill the screen with toasts.
 */

import { el } from './dom.js';

const MAX_VISIBLE = 3;
const LIFETIME_MS = 2200;

export const createToaster = (root) => {
  let lastMessage = '';
  let lastAt = 0;

  const push = (message, tone = 'info') => {
    const now = Date.now();
    // Collapse repeats: dragging across illegal tiles emits the same refusal.
    if (message === lastMessage && now - lastAt < LIFETIME_MS) return;
    lastMessage = message;
    lastAt = now;

    const node = el('div', 'toast', message);
    node.dataset.tone = tone;
    root.appendChild(node);
    while (root.childElementCount > MAX_VISIBLE) root.removeChild(root.firstChild);

    setTimeout(() => {
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 260);
    }, LIFETIME_MS);
  };

  return { push };
};
