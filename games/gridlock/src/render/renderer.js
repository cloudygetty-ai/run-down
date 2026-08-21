/**
 * Canvas draw loop. Painter's algorithm over the tile diagonal, with viewport
 * culling so map size costs nothing when zoomed in.
 *
 * The renderer reads state and never writes it.
 */

import { getBuilding } from '../config/buildings.js';
import { LEVEL_H, TILE_H, tileToScreen } from './iso.js';
import { PALETTE, ambient, alpha, dayPhase, heatCast, nightFactor } from './theme.js';
import { drawCursor, drawGround, drawHalo } from './terrain.js';
import { drawOutage, drawStructure } from './structures.js';
import { drawTraffic } from './effects.js';
import { overlayWash } from './overlays.js';

const CULL_MARGIN = 160;

/** Bitmask of orthogonal neighbours a road should visually connect to. */
const LINKS = ['road', 'nexus', 'transit', 'maglev'];
const connectionMask = (grid, x, y) => {
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let mask = 0;
  steps.forEach(([dx, dy], bit) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) return;
    if (LINKS.includes(grid.tiles[ny * grid.w + nx].b)) mask |= 1 << bit;
  });
  return mask;
};

export const createRenderer = (canvas, effects) => {
  const ctx = canvas.getContext('2d');
  const view = { width: 0, height: 0, dpr: 1 };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    view.width = rect.width;
    view.height = rect.height;
    view.dpr = dpr;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawBackdrop = (night) => {
    const sky = ctx.createLinearGradient(0, 0, 0, view.height);
    sky.addColorStop(0, night > 0.5 ? '#0a0716' : '#161334');
    sky.addColorStop(1, PALETTE.void);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.width, view.height);
  };

  const draw = (state, opts) => {
    const started = performance.now();
    const { cam, hover, tool, overlay, time } = opts;
    const { grid, stats } = state;
    const night = nightFactor(dayPhase(time));
    const air = ambient(night);
    const glow = air.windowGlow;

    resizeIfNeeded();
    drawBackdrop(night);

    const project = (x, y) => tileToScreen(x, y, cam, view);
    const congestion = stats ? stats.congestion : 0;

    for (let d = 0; d <= grid.w + grid.h - 2; d++) {
      const xStart = Math.max(0, d - grid.h + 1);
      const xEnd = Math.min(grid.w - 1, d);
      for (let x = xStart; x <= xEnd; x++) {
        const y = d - x;
        const tile = grid.tiles[y * grid.w + x];
        const { sx, sy } = project(x, y);
        if (sx < -CULL_MARGIN || sx > view.width + CULL_MARGIN) continue;
        if (sy < -CULL_MARGIN * 3 || sy > view.height + CULL_MARGIN) continue;

        drawGround(ctx, tile, { sx, sy, zoom: cam.zoom, night, time }, overlayWash(overlay, stats, tile));

        if (tile.b === null) continue;
        const def = getBuilding(tile.b);
        if (!def) continue;
        const live = tile.on || stats === null;

        const roadMask = def.id === 'road' ? connectionMask(grid, x, y) : 0;
        drawStructure(ctx, def, { sx, sy, zoom: cam.zoom, glow, time, seed: tile.i, live, roadMask });
        if (def.id === 'road') {
          drawTraffic(ctx, tile, sx, sy, cam.zoom, time, congestion);
          continue;
        }
        if (!live) drawOutage(ctx, sx, sy, cam.zoom, def.h * LEVEL_H * cam.zoom);
      }
    }

    effects.draw(ctx, project, cam.zoom);
    drawPointer(state, opts, project);

    // Time-of-day wash and, above the heat threshold, a red planetary cast.
    ctx.fillStyle = alpha(air.tint, air.strength * 0.55);
    ctx.fillRect(0, 0, view.width, view.height);
    const cast = heatCast(state.heat);
    if (cast > 0) {
      ctx.fillStyle = `rgba(255,90,40,${cast})`;
      ctx.fillRect(0, 0, view.width, view.height);
    }

    return performance.now() - started;
  };

  /** Cursor diamond plus dashed halos on the neighbours a placement would use. */
  const drawPointer = (state, { hover, tool, canPlaceHere, cam }, project) => {
    if (!hover) return;
    const { sx, sy } = project(hover.x, hover.y);
    drawCursor(ctx, sx, sy, cam.zoom, canPlaceHere);
    if (!tool || tool === 'bulldoze') return;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = hover.x + dx;
        const ny = hover.y + dy;
        if (nx < 0 || ny < 0 || nx >= state.grid.w || ny >= state.grid.h) continue;
        if (state.grid.tiles[ny * state.grid.w + nx].b === null) continue;
        const p = project(nx, ny);
        drawHalo(ctx, p.sx, p.sy, cam.zoom, 'rgba(201,168,76,0.35)');
      }
    }
  };

  let lastW = 0;
  let lastH = 0;
  const resizeIfNeeded = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== lastW || rect.height !== lastH) {
      lastW = rect.width;
      lastH = rect.height;
      resize();
    }
  };

  return { draw, resize, view, ctx };
};

/** Screen height in pixels of a structure, used for hit-testing tooltips. */
export const structureHeight = (def, zoom) => (def?.h ?? 0) * LEVEL_H * zoom + TILE_H * zoom;
