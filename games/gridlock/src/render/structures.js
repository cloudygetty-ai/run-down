/**
 * Structure rendering. Every building is drawn procedurally from its catalog
 * entry — no sprite sheet, no asset pipeline, and adding a building to the
 * catalog makes it appear on the map with no art task attached.
 */

import { TILE_W, TILE_H, LEVEL_H } from './iso.js';
import { alpha, mix, shade } from './theme.js';
import { diamondPath } from './terrain.js';

const facePaths = (ctx, sx, sy, halfW, halfH, hPx) => {
  ctx.beginPath(); // left
  ctx.moveTo(sx - halfW, sy - hPx);
  ctx.lineTo(sx, sy + halfH - hPx);
  ctx.lineTo(sx, sy + halfH);
  ctx.lineTo(sx - halfW, sy);
  ctx.closePath();
};

const rightPath = (ctx, sx, sy, halfW, halfH, hPx) => {
  ctx.beginPath();
  ctx.moveTo(sx + halfW, sy - hPx);
  ctx.lineTo(sx, sy + halfH - hPx);
  ctx.lineTo(sx, sy + halfH);
  ctx.lineTo(sx + halfW, sy);
  ctx.closePath();
};

/** Lit windows climbing both visible faces. The city's night-time signature. */
const drawWindows = (ctx, sx, sy, halfW, halfH, hPx, accent, glow, seed) => {
  if (glow <= 0.02 || hPx < 16) return;
  const rows = Math.max(1, Math.floor(hPx / 12));
  const cols = 3;
  ctx.save();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Deterministic per-window flicker keyed off the tile seed.
      const on = ((seed * 977 + r * 31 + c * 7) % 10) > 3;
      if (!on) continue;
      const t = (c + 0.5) / cols;
      const yOff = hPx - (r + 0.7) * 12;
      ctx.fillStyle = alpha(accent, 0.15 + glow * 0.75);
      ctx.fillRect(sx - halfW * (1 - t) - 2, sy - yOff + halfH * (1 - t) * 0.5 - 2, 3, 4);
      ctx.fillRect(sx + halfW * (1 - t) - 1, sy - yOff + halfH * (1 - t) * 0.5 - 2, 3, 4);
    }
  }
  ctx.restore();
};

const drawBox = (ctx, sx, sy, zoom, hPx, base, accent, glow, seed) => {
  const halfW = (TILE_W / 2) * zoom * 0.82;
  const halfH = (TILE_H / 2) * zoom * 0.82;

  ctx.fillStyle = shade(base, -0.32);
  facePaths(ctx, sx, sy, halfW, halfH, hPx);
  ctx.fill();

  ctx.fillStyle = shade(base, -0.14);
  rightPath(ctx, sx, sy, halfW, halfH, hPx);
  ctx.fill();

  ctx.fillStyle = shade(base, 0.14);
  diamondPath(ctx, sx, sy - hPx, zoom * 0.82);
  ctx.fill();

  drawWindows(ctx, sx, sy, halfW, halfH, hPx, accent, glow, seed);

  // Roof line picks up the accent so silhouettes stay readable at low zoom.
  ctx.strokeStyle = alpha(accent, 0.25 + glow * 0.5);
  ctx.lineWidth = 1;
  diamondPath(ctx, sx, sy - hPx, zoom * 0.82);
  ctx.stroke();
};

/** Edge-midpoint offsets keyed by the road connection bitmask. */
const ROAD_DIRS = [
  [0.5, 0.5],   // +x
  [-0.5, -0.5], // -x
  [-0.5, 0.5],  // +y
  [0.5, -0.5],  // -y
];

/**
 * Roads draw as asphalt with a neon spine running to each connected
 * neighbour, so junctions and dead ends are visible at a glance.
 * @param {number} mask bit i set when neighbour i (see ROAD_DIRS) is road
 */
const drawRoad = (ctx, sx, sy, zoom, base, accent, glow, mask) => {
  const halfW = (TILE_W / 2) * zoom;
  const halfH = (TILE_H / 2) * zoom;

  ctx.fillStyle = shade(base, 0.16);
  diamondPath(ctx, sx, sy, zoom, 0.5);
  ctx.fill();

  ctx.strokeStyle = alpha(accent, 0.35 + glow * 0.5);
  ctx.lineWidth = Math.max(1, 2 * zoom);
  ctx.lineCap = 'round';
  let drawn = 0;
  for (let dir = 0; dir < 4; dir++) {
    if ((mask & (1 << dir)) === 0) continue;
    drawn += 1;
    const [fx, fy] = ROAD_DIRS[dir];
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + fx * halfW * 2, sy + fy * halfH * 2);
    ctx.stroke();
  }
  if (drawn === 0) {
    ctx.beginPath();
    ctx.arc(sx, sy, 2.4 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = alpha(accent, 0.5);
    ctx.fill();
  }
};

/** Solar reads as a tilted panel array rather than an empty outline. */
const drawPanels = (ctx, sx, sy, zoom, base, accent, glow) => {
  ctx.fillStyle = shade(base, 0.1);
  diamondPath(ctx, sx, sy, zoom * 0.92);
  ctx.fill();
  const halfW = (TILE_W / 2) * zoom * 0.92;
  const halfH = (TILE_H / 2) * zoom * 0.92;
  ctx.strokeStyle = alpha(accent, 0.5 + glow * 0.4);
  ctx.lineWidth = Math.max(1, 1.4 * zoom);
  // Rows run along the +x axis, offset along the +y axis so they lie flat.
  for (const t of [-0.42, 0, 0.42]) {
    ctx.beginPath();
    ctx.moveTo(sx - halfW * 0.5 - t * halfW, sy - halfH * 0.5 + t * halfH);
    ctx.lineTo(sx + halfW * 0.5 - t * halfW, sy + halfH * 0.5 + t * halfH);
    ctx.stroke();
  }
};

const drawWind = (ctx, sx, sy, zoom, hPx, base, accent, time) => {
  ctx.strokeStyle = shade(base, 0.25);
  ctx.lineWidth = 2.5 * zoom;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - hPx);
  ctx.stroke();
  const spin = time / 260;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.6 * zoom;
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy - hPx);
    ctx.lineTo(sx + Math.cos(a) * 12 * zoom, sy - hPx + Math.sin(a) * 8 * zoom);
    ctx.stroke();
  }
};

const drawGreen = (ctx, sx, sy, zoom, base, accent, seed) => {
  ctx.fillStyle = shade(base, -0.05);
  diamondPath(ctx, sx, sy, zoom * 0.92);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const ox = ((seed * (i + 3) * 37) % 20) - 10;
    const oy = ((seed * (i + 5) * 17) % 10) - 5;
    ctx.fillStyle = alpha(accent, 0.55);
    ctx.beginPath();
    ctx.ellipse(sx + ox * zoom * 0.5, sy + oy * zoom * 0.4, 5 * zoom, 3.4 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} def catalog entry
 * @param {{sx, sy, zoom, glow, time, seed, live}} view
 */
export const drawStructure = (ctx, def, view) => {
  const { sx, sy, zoom, time, seed, live } = view;
  const glow = live ? view.glow : 0;
  const base = live ? def.color : mix(def.color, '#15121f', 0.55);
  const accent = live ? def.accent : '#6b6480';
  const hPx = def.h * LEVEL_H * zoom;

  if (def.id === 'road') return drawRoad(ctx, sx, sy, zoom, base, accent, glow, view.roadMask ?? 0);
  if (def.id === 'solar') return drawPanels(ctx, sx, sy, zoom, base, accent, glow);
  if (def.cat === 'green' && def.h < 0.5) return drawGreen(ctx, sx, sy, zoom, base, accent, seed);
  if (def.id === 'wind') return drawWind(ctx, sx, sy, zoom, hPx, base, accent, time);

  drawBox(ctx, sx, sy, zoom, hPx, base, accent, glow, seed);

  // Landmarks get a beacon so they read from across the map.
  if (def.cat === 'special' && live) {
    const pulse = 0.5 + Math.sin(time / 420) * 0.5;
    ctx.fillStyle = alpha(def.accent, 0.35 + pulse * 0.5);
    ctx.beginPath();
    ctx.arc(sx, sy - hPx - 6 * zoom, (3 + pulse * 2) * zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  return undefined;
};

/** Small red bolt over structures that are cut off from power or water. */
export const drawOutage = (ctx, sx, sy, zoom, hPx) => {
  if (zoom < 0.6) return;
  ctx.save();
  ctx.fillStyle = '#ff5470';
  ctx.font = `${Math.round(13 * zoom)}px "DM Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('!', sx, sy - hPx - 6 * zoom);
  ctx.restore();
};
