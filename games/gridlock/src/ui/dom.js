/**
 * DOM and formatting helpers. Every UI module builds nodes through these, so
 * text formatting is consistent and nothing anywhere concatenates HTML from
 * user-controlled strings.
 */

export const $ = (selector, root = document) => root.querySelector(selector);

export const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};

export const clear = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

/** 1234 → "1.2k", 1234567 → "1.2M". Keeps the HUD from reflowing. */
export const compact = (value) => {
  const n = Math.round(value);
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString('en-US');
};

export const credits = (value) => `₡${compact(value)}`;

export const signed = (value) => `${value >= 0 ? '+' : '−'}₡${compact(Math.abs(value))}`;

export const percent = (value, digits = 0) => `${(value * 100).toFixed(digits)}%`;

/** Set text only when it changed — avoids per-frame layout thrash. */
export const setText = (node, text) => {
  const next = String(text);
  if (node && node.textContent !== next) node.textContent = next;
};

export const setClass = (node, className, on) => {
  if (node) node.classList.toggle(className, Boolean(on));
};

/** Inline SVG sparkline from a numeric series. */
export const sparkline = (series, width = 132, height = 30, color = '#c9a84c') => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'spark');
  if (series.length < 2) return svg;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = width / (series.length - 1);
  const points = series
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`)
    .join(' ');

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('points', points);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '1.5');
  svg.appendChild(line);
  return svg;
};
