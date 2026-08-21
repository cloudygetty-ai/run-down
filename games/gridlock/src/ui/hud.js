/**
 * Top status bar. Binds once to the static markup in index.html and then only
 * writes values — no per-frame DOM construction.
 */

import { SPEED_LABEL, CLIMATE } from '../config/balance.js';
import { eraById, techToNextEra } from '../config/eras.js';
import { cityGrade } from '../core/economy.js';
import { formatDate } from '../core/state.js';
import { $, clear, compact, credits, el, percent, setClass, setText, signed } from './dom.js';

/**
 * The failures worth interrupting the player for. Ordered by how quickly they
 * kill a city — a district cut off from the road graph produces nothing at all,
 * which is the mistake players most often stare straight past.
 */
const alertsFor = (state, stats) => {
  const out = [];
  if (stats.stranded > 0) out.push({ text: `${stats.stranded} CUT OFF`, tone: 'bad', title: 'Structures with no road back to the Nexus. They produce nothing.' });
  if (stats.power.ratio < 1) out.push({ text: 'BROWNOUT', tone: 'bad', title: 'Power demand exceeds supply. Low-priority blocks are dark.' });
  if (stats.water.ratio < 1) out.push({ text: 'WATER SHORT', tone: 'bad', title: 'Water demand exceeds supply.' });
  if (stats.gridlock > 0.3) out.push({ text: 'GRIDLOCK', tone: 'warn', title: 'Congestion is eating business revenue. Build roads or transit.' });
  if (stats.net < 0) out.push({ text: 'DEFICIT', tone: 'warn', title: 'The city spends more than it earns.' });
  if (state.heat >= CLIMATE.threshold) out.push({ text: 'OVERHEATING', tone: 'warn', title: 'The Heat Index is past the threshold. Cooling costs are rising.' });
  return out;
};

const meter = (node, ratio, tone) => {
  if (!node) return;
  const fill = node.firstElementChild;
  if (fill) fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  node.dataset.tone = tone;
};

const utilityTone = (ratio) => (ratio >= 1 ? 'good' : ratio >= 0.85 ? 'warn' : 'bad');

export const createHud = (root) => {
  const nodes = {
    date: $('#hud-date', root),
    credits: $('#hud-credits', root),
    net: $('#hud-net', root),
    pop: $('#hud-pop', root),
    popNote: $('#hud-pop-note', root),
    approval: $('#hud-approval', root),
    approvalBar: $('#hud-approval-bar', root),
    power: $('#hud-power', root),
    powerBar: $('#hud-power-bar', root),
    water: $('#hud-water', root),
    waterBar: $('#hud-water-bar', root),
    heat: $('#hud-heat', root),
    heatBar: $('#hud-heat-bar', root),
    era: $('#hud-era', root),
    eraNote: $('#hud-era-note', root),
    grade: $('#hud-grade', root),
    speed: $('#hud-speed', root),
    alerts: $('#hud-alerts', root),
  };

  let lastAlertKey = null;
  const renderAlerts = (state, stats) => {
    const alerts = alertsFor(state, stats);
    const key = alerts.map((a) => a.text).join('|');
    if (key === lastAlertKey) return; // Rebuild only when the set changes.
    lastAlertKey = key;
    const host = clear(nodes.alerts);
    for (const alert of alerts) {
      const chip = el('span', 'alert-chip', alert.text);
      chip.dataset.tone = alert.tone;
      chip.title = alert.title;
      host.appendChild(chip);
    }
  };

  const update = (state) => {
    const stats = state.stats;
    setText(nodes.date, formatDate(state.month));
    setText(nodes.credits, credits(state.credits));
    setClass(nodes.credits, 'negative', state.credits < 0);
    setText(nodes.pop, compact(state.population));
    setText(nodes.speed, SPEED_LABEL[state.speed]);

    const grade = cityGrade(state.approval, state.heat);
    setText(nodes.grade, grade.label);
    if (nodes.grade) nodes.grade.dataset.tone = grade.tone;

    const era = eraById(state.era);
    setText(nodes.era, `ERA ${state.era} · ${era.name.toUpperCase()}`);
    const next = techToNextEra(state.tech);
    setText(nodes.eraNote, next
      ? `${Math.round(next.remaining)} research to ${next.era.name}`
      : 'Final era reached');

    setText(nodes.approval, `${Math.round(state.approval)}%`);
    meter(nodes.approvalBar, state.approval / 100,
      state.approval > 65 ? 'good' : state.approval > 40 ? 'warn' : 'bad');

    setText(nodes.heat, Math.round(state.heat));
    meter(nodes.heatBar, state.heat / CLIMATE.max,
      state.heat < CLIMATE.threshold ? 'good' : state.heat < CLIMATE.critical ? 'warn' : 'bad');

    if (!stats) return;
    setText(nodes.net, `${signed(stats.net)}/mo`);
    setClass(nodes.net, 'negative', stats.net < 0);
    setText(nodes.popNote, `${compact(stats.jobsFilled)} working · ${percent(stats.unemployment)} idle`);

    setText(nodes.power, `${compact(stats.power.supply)}/${compact(stats.power.demand)}`);
    meter(nodes.powerBar, stats.power.demand ? stats.power.supply / stats.power.demand : 1,
      utilityTone(stats.power.ratio));

    setText(nodes.water, `${compact(stats.water.supply)}/${compact(stats.water.demand)}`);
    meter(nodes.waterBar, stats.water.demand ? stats.water.supply / stats.water.demand : 1,
      utilityTone(stats.water.ratio));

    renderAlerts(state, stats);
  };

  return { update };
};
