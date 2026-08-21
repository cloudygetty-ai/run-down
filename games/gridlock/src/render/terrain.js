/**
 * Ground rendering: one diamond per tile, plus the overlay wash used by the
 * data views (appeal, power, heat).
 */

import { TILE_W, TILE_H } from './iso.js';
import { PALETTE, mix, shade } from './theme.js';
import { TERRAIN } from '../core/grid.js';

/** Trace the tile diamond centred on (sx, sy). */
export const diamondPath = (ctx, sx, sy, zoom, inset = 0) => {
  const halfW = (TILE_W / 2) * zoom - inset;
  const halfH = (TILE_H / 2) * zoom - inset * 0.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy - halfH);
  ctx.lineTo(sx + halfW, sy);
  ctx.lineTo(sx, sy + halfH);
  ctx.lineTo(sx - halfW, sy);
  ctx.closePath();
};

const groundColor = (tile, night, time) => {
  if (tile.t === TERRAIN.WATER) {
    const wave = Math.sin(time / 900 + tile.x * 0.7 + tile.y * 0.5) * 0.5 + 0.5;
    return mix(PALETTE.water, PALETTE.waterLit, 0.25 + wave * 0.35 * (1 - night * 0.5));
  }
  if (tile.t === TERRAIN.HILL) return shade(PALETTE.hill, -0.05 + tile.variant * 0.12);
  return mix(PALETTE.ground, PALETTE.groundAlt, tile.variant);
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} tile
 * @param {{sx:number, sy:number, zoom:number, night:number, time:number}} ctxInfo
 * @param {string|null} overlay rgba wash from an active data view
 */
export const drawGround = (ctx, tile, { sx, sy, zoom, night, time }, overlay) => {
  ctx.fillStyle = shade(groundColor(tile, night, time), -night * 0.22);
  diamondPath(ctx, sx, sy, zoom);
  ctx.fill();

  if (overlay) {
    ctx.fillStyle = overlay;
    ctx.fill();
  }

  if (zoom > 0.7) {
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};

/** Cursor ring under the pointer — green when legal, red when not. */
export const drawCursor = (ctx, sx, sy, zoom, ok) => {
  const color = ok ? '#5ee08a' : '#ff5470';
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}22`;
  diamondPath(ctx, sx, sy, zoom, 1);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

/** Highlight ring used to show synergy neighbours during placement. */
export const drawHalo = (ctx, sx, sy, zoom, color) => {
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.setLineDash([4, 4]);
  diamondPath(ctx, sx, sy, zoom, 3);
  ctx.stroke();
  ctx.restore();
};
