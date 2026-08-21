/**
 * Deterministic utility rationing.
 *
 * When supply falls short, the shortfall must land somewhere specific and
 * repeatable — never on a random building. Consumers are served in a fixed
 * priority order, then by tile index, so the same shortfall always browns out
 * the same blocks and the player can reason about it.
 */

/** Lower rank is served first. Factories go dark before hospitals do. */
export const POWER_PRIORITY = Object.freeze({
  water: 0, civic: 1, special: 2, residential: 3, transit: 4,
  green: 5, commercial: 6, data: 7, industry: 8, road: 9, power: 9,
});

export const WATER_PRIORITY = Object.freeze({
  residential: 0, civic: 1, special: 2, green: 3, commercial: 4,
  data: 5, industry: 6, transit: 7, road: 9, power: 9, water: 9,
});

/**
 * @param {{i: number, cat: string, draw: number}[]} consumers
 * @param {number} supply
 * @param {Record<string, number>} priority
 * @returns {{served: Set<number>, demand: number, ratio: number}}
 */
export const ration = (consumers, supply, priority) => {
  const demand = consumers.reduce((sum, c) => sum + c.draw, 0);
  const served = new Set();
  if (demand === 0) return { served, demand: 0, ratio: 1 };

  const queue = [...consumers].sort(
    (a, b) => (priority[a.cat] ?? 9) - (priority[b.cat] ?? 9) || a.i - b.i,
  );
  let budget = supply;
  for (const consumer of queue) {
    if (consumer.draw > budget) continue; // Skip, don't stop: small loads still fit.
    budget -= consumer.draw;
    served.add(consumer.i);
  }
  return { served, demand, ratio: Math.min(1, supply / demand) };
};
