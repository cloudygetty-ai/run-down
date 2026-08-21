/**
 * Build palette. Renders the full catalog once, then only toggles state —
 * locked, unaffordable, selected — so switching tools never rebuilds the DOM.
 */

import { CATALOG, CATEGORY_LABEL } from '../config/buildings.js';
import { clear, credits, el, setClass } from './dom.js';

export const BULLDOZE = 'bulldoze';

const statLine = (def) => {
  const parts = [];
  if (def.residents) parts.push(`${def.residents} res`);
  if (def.jobs) parts.push(`${def.jobs} jobs`);
  if (def.revenue) parts.push(`₡${def.revenue}/mo`);
  if (def.power > 0) parts.push(`+${def.power}MW`);
  if (def.power < 0) parts.push(`${def.power}MW`);
  if (def.water > 0) parts.push(`+${def.water}L`);
  if (def.water < 0) parts.push(`${def.water}L`);
  if (def.tech) parts.push(`${def.tech} res/mo`);
  return parts.join(' · ');
};

export const createBuildBar = (root, { onSelect, onHoverDef }) => {
  const buttons = new Map();
  let tool = null;

  const bulldozeBtn = el('button', 'build-btn bulldoze');
  bulldozeBtn.appendChild(el('span', 'bb-name', 'Bulldoze'));
  bulldozeBtn.appendChild(el('span', 'bb-cost', '35% back'));
  bulldozeBtn.addEventListener('click', () => select(tool === BULLDOZE ? null : BULLDOZE));
  bulldozeBtn.title = 'Demolish a structure and recover part of its cost. [X]';

  const render = () => {
    clear(root);
    const group = el('div', 'build-group');
    group.appendChild(el('h3', 'build-cat', 'Tools'));
    group.appendChild(bulldozeBtn);
    root.appendChild(group);

    let current = null;
    let container = null;
    for (const def of CATALOG) {
      if (def.hidden) continue;
      if (def.cat !== current) {
        current = def.cat;
        container = el('div', 'build-group');
        container.appendChild(el('h3', 'build-cat', CATEGORY_LABEL[def.cat] ?? def.cat));
        root.appendChild(container);
      }
      const btn = el('button', 'build-btn');
      btn.appendChild(el('span', 'bb-name', def.name));
      btn.appendChild(el('span', 'bb-cost', credits(def.cost)));
      btn.appendChild(el('span', 'bb-stats', statLine(def)));
      btn.style.setProperty('--accent', def.accent);
      btn.addEventListener('click', () => select(tool === def.id ? null : def.id));
      btn.addEventListener('pointerenter', () => onHoverDef?.(def));
      btn.addEventListener('pointerleave', () => onHoverDef?.(null));
      container.appendChild(btn);
      buttons.set(def.id, btn);
    }
  };

  const select = (id) => {
    tool = id;
    for (const [key, btn] of buttons) setClass(btn, 'selected', key === id);
    setClass(bulldozeBtn, 'selected', id === BULLDOZE);
    onSelect(id);
  };

  /** Reflect era locks and affordability against the current state. */
  const update = (state) => {
    for (const def of CATALOG) {
      const btn = buttons.get(def.id);
      if (!btn) continue;
      const locked = def.era > state.era;
      const poor = def.cost > state.credits;
      setClass(btn, 'locked', locked);
      setClass(btn, 'poor', !locked && poor);
      btn.disabled = locked;
      btn.title = locked ? `Unlocks in Era ${def.era}` : `${def.desc}`;
    }
  };

  render();
  return { update, select, getTool: () => tool };
};
