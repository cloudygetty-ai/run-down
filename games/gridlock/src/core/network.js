/**
 * Road connectivity.
 *
 * A structure is live only when it touches a road that traces back to the
 * Nexus. This is what makes roads a real decision instead of decoration.
 */

import { NEEDS_ROAD, getBuilding } from '../config/buildings.js';
import { idx, inBounds } from './grid.js';

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * @returns {{roads: Set<number>, connected: Set<number>, roadCount: number}}
 *   `roads` — road tiles wired to the Nexus.
 *   `connected` — every tile whose structure is legally serviced.
 */
export const computeNetwork = (grid) => {
  const roads = new Set();
  const connected = new Set();
  const origin = grid.tiles.find((t) => t.b === 'nexus');
  if (!origin) return { roads, connected, roadCount: 0 };

  connected.add(origin.i);

  // Flood the road graph outward from the tiles orthogonal to the Nexus.
  const queue = [];
  for (const [dx, dy] of STEPS) {
    const nx = origin.x + dx;
    const ny = origin.y + dy;
    if (!inBounds(grid, nx, ny)) continue;
    const t = grid.tiles[idx(grid, nx, ny)];
    if (t.b === 'road' && !roads.has(t.i)) {
      roads.add(t.i);
      queue.push(t);
    }
  }
  while (queue.length) {
    const tile = queue.pop();
    for (const [dx, dy] of STEPS) {
      const nx = tile.x + dx;
      const ny = tile.y + dy;
      if (!inBounds(grid, nx, ny)) continue;
      const next = grid.tiles[idx(grid, nx, ny)];
      if (next.b === 'road' && !roads.has(next.i)) {
        roads.add(next.i);
        queue.push(next);
      }
    }
  }

  for (const i of roads) connected.add(i);

  // Any structure orthogonally touching the live road graph is serviced.
  // Structures outside NEEDS_ROAD (power, water, parks) run standalone.
  for (const tile of grid.tiles) {
    if (tile.b === null || connected.has(tile.i)) continue;
    const def = getBuilding(tile.b);
    if (!def) continue;
    if (!NEEDS_ROAD.has(def.cat)) {
      connected.add(tile.i);
      continue;
    }
    for (const [dx, dy] of STEPS) {
      const nx = tile.x + dx;
      const ny = tile.y + dy;
      if (inBounds(grid, nx, ny) && roads.has(idx(grid, nx, ny))) {
        connected.add(tile.i);
        break;
      }
    }
  }

  let roadCount = 0;
  for (const tile of grid.tiles) if (tile.b === 'road') roadCount++;

  return { roads, connected, roadCount };
};
