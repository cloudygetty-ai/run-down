/**
 * Particles and traffic. Pure eye-candy, hard-capped so it can never become a
 * performance problem: the pool is bounded and old particles are recycled.
 */

import { getBuilding } from '../config/buildings.js';
import { LEVEL_H } from './iso.js';
import { alpha } from './theme.js';

const MAX_PARTICLES = 180;

export const createEffects = () => {
  const pool = [];

  const spawn = (tile, def) => {
    if (pool.length >= MAX_PARTICLES) return;
    const smoke = def.pollution > 2 || def.heat > 1.5;
    pool.push({
      x: tile.x, y: tile.y,
      life: 0,
      ttl: smoke ? 2600 : 1600,
      rise: def.h * LEVEL_H + 6,
      drift: (Math.random() - 0.5) * 10,
      color: smoke ? '#8a7f9c' : def.accent,
      size: smoke ? 4.5 : 2,
    });
  };

  return {
    /** Emit from live emitters once per simulated month. */
    emit(state, stats) {
      if (!stats) return;
      for (const tile of state.grid.tiles) {
        if (tile.b === null || !stats.live.has(tile.i)) continue;
        const def = getBuilding(tile.b);
        if (!def) continue;
        if (def.pollution > 2 || def.heat > 1.5 || def.cat === 'special') spawn(tile, def);
      }
    },

    update(dtMs) {
      for (let i = pool.length - 1; i >= 0; i--) {
        pool[i].life += dtMs;
        if (pool[i].life >= pool[i].ttl) pool.splice(i, 1);
      }
    },

    /** @param {(x:number,y:number)=>{sx:number,sy:number}} project */
    draw(ctx, project, zoom) {
      for (const p of pool) {
        const t = p.life / p.ttl;
        const { sx, sy } = project(p.x, p.y);
        ctx.fillStyle = alpha(p.color, (1 - t) * 0.5);
        ctx.beginPath();
        ctx.arc(
          sx + p.drift * t * zoom,
          sy - (p.rise + t * 34) * zoom,
          (p.size + t * 3) * zoom,
          0, Math.PI * 2,
        );
        ctx.fill();
      }
    },

    count: () => pool.length,
  };
};

/**
 * Commuter lights running along the road graph. Density and colour follow
 * congestion, so a jammed city visibly clots.
 */
export const drawTraffic = (ctx, tile, sx, sy, zoom, time, congestion) => {
  if (zoom < 0.55) return;
  const density = Math.min(2, 1 + Math.floor(congestion * 2));
  const jam = Math.min(1, congestion);
  const color = jam > 0.75 ? '#ff5470' : jam > 0.45 ? '#ffb347' : '#7ef7e2';
  const speed = 1 - jam * 0.7;
  for (let i = 0; i < density; i++) {
    const phase = ((time * 0.00035 * speed) + (tile.i * 0.37) + i * 0.5) % 1;
    const ox = (phase - 0.5) * 30 * zoom;
    ctx.fillStyle = alpha(color, 0.75);
    ctx.fillRect(sx + ox, sy - 1.5 * zoom, 2.4 * zoom, 2 * zoom);
  }
};
