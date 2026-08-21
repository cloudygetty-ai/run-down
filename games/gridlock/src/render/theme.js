/**
 * Palette and lighting. Every colour the renderer uses resolves here so the
 * whole city can be re-lit — day, night, or overlay mode — from one place.
 */

export const PALETTE = Object.freeze({
  void: '#08060f',
  ground: '#1b1830',
  groundAlt: '#221d3a',
  hill: '#2d2743',
  water: '#0e2038',
  waterLit: '#1b3f63',
  grid: 'rgba(139,92,246,0.16)',
  gold: '#c9a84c',
  violet: '#8b5cf6',
  mint: '#38e1c8',
  ember: '#ff7a3d',
  rose: '#ff5ec4',
  ink: '#f2ecff',
});

const hex = (h) => {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

const toHex = (r, g, b) =>
  `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;

/** Linear blend between two hex colours. */
export const mix = (a, b, t) => {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
};

/** Positive amount lightens, negative darkens. */
export const shade = (color, amount) =>
  amount >= 0 ? mix(color, '#ffffff', amount) : mix(color, '#000000', -amount);

export const alpha = (color, a) => {
  const [r, g, b] = hex(color);
  return `rgba(${r},${g},${b},${a})`;
};

/** Real-time day cycle, 96 seconds per full day. 0 = midnight, 0.5 = noon. */
export const DAY_MS = 96000;
export const dayPhase = (nowMs) => (nowMs % DAY_MS) / DAY_MS;

/** 0 in full daylight, 1 in deep night. Smooth, so dusk reads as dusk. */
export const nightFactor = (phase) => {
  const daylight = Math.sin(phase * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  return 1 - Math.max(0, Math.min(1, (daylight - 0.15) / 0.6));
};

/** Ambient wash applied over the whole map for the current time of day. */
export const ambient = (night) => ({
  tint: mix('#3d4f8a', '#0a0718', night),
  strength: 0.16 + night * 0.34,
  windowGlow: Math.max(0, night - 0.15),
});

/** Heat-stressed cities take on a visible red cast. */
export const heatCast = (heat) => Math.max(0, Math.min(0.4, (heat - 45) / 140));
