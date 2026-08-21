/**
 * Right-hand column: directives, active crisis modifiers, trend lines, and the
 * city log. Rebuilt on month boundaries only — never per frame.
 */

import { directiveById } from '../config/directives.js';
import { directiveProgress } from '../core/directives.js';
import { formatDate } from '../core/state.js';
import { $, clear, compact, el, sparkline } from './dom.js';

const progressBar = (current, goal) => {
  const bar = el('div', 'dir-bar');
  const fill = el('i');
  fill.style.width = `${Math.max(0, Math.min(1, current / goal)) * 100}%`;
  bar.appendChild(fill);
  return bar;
};

export const createPanels = (root) => {
  const nodes = {
    directives: $('#panel-directives', root),
    modifiers: $('#panel-modifiers', root),
    trends: $('#panel-trends', root),
    log: $('#panel-log', root),
  };

  const renderDirectives = (state, stats) => {
    const host = clear(nodes.directives);
    for (const id of state.directives.active) {
      const directive = directiveById(id);
      if (!directive) continue;
      const card = el('div', 'dir-card');
      card.appendChild(el('h4', 'dir-title', directive.title));
      card.appendChild(el('p', 'dir-detail', directive.detail));
      const progress = directiveProgress(directive, state, stats);
      if (progress) {
        card.appendChild(progressBar(progress[0], progress[1]));
        card.appendChild(el('span', 'dir-count',
          directive.streak
            ? `${progress[0]}/${progress[1]} months`
            : `${compact(progress[0])} / ${compact(progress[1])}`));
      }
      if (directive.reward.credits) {
        card.appendChild(el('span', 'dir-reward', `Reward ₡${directive.reward.credits.toLocaleString()}`));
      }
      host.appendChild(card);
    }
    if (state.directives.active.length === 0) {
      host.appendChild(el('p', 'insp-dim', 'Every directive complete. The city is yours.'));
    }
  };

  const renderModifiers = (state) => {
    const host = clear(nodes.modifiers);
    if (state.modifiers.length === 0) {
      host.appendChild(el('p', 'insp-dim', 'No active pressures.'));
      return;
    }
    for (const mod of state.modifiers) {
      const row = el('div', 'mod-row');
      row.appendChild(el('span', 'mod-label', mod.label));
      row.appendChild(el('span', 'mod-months', `${mod.months}mo`));
      host.appendChild(row);
    }
  };

  const renderTrends = (state) => {
    const host = clear(nodes.trends);
    const series = [
      { label: 'Population', data: state.history.population, color: '#8b5cf6' },
      { label: 'Treasury', data: state.history.credits, color: '#c9a84c' },
      { label: 'Approval', data: state.history.approval, color: '#38e1c8' },
      { label: 'Heat Index', data: state.history.heat, color: '#ff7a3d' },
    ];
    for (const s of series) {
      const row = el('div', 'trend-row');
      const head = el('div', 'trend-head');
      head.appendChild(el('span', 'trend-label', s.label));
      head.appendChild(el('span', 'trend-value', s.data.length ? compact(s.data[s.data.length - 1]) : '—'));
      row.appendChild(head);
      row.appendChild(sparkline(s.data, 150, 26, s.color));
      host.appendChild(row);
    }
  };

  const renderLog = (state) => {
    const host = clear(nodes.log);
    for (const entry of state.log.slice(0, 14)) {
      const row = el('div', 'log-row');
      row.dataset.tone = entry.kind;
      row.appendChild(el('span', 'log-date', formatDate(entry.month)));
      row.appendChild(el('span', 'log-text', entry.text));
      host.appendChild(row);
    }
    if (state.log.length === 0) host.appendChild(el('p', 'insp-dim', 'Nothing to report.'));
  };

  const update = (state) => {
    const stats = state.stats;
    if (!stats) return;
    renderDirectives(state, stats);
    renderModifiers(state);
    renderTrends(state);
    renderLog(state);
  };

  return { update };
};
