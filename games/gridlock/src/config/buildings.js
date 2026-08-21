/**
 * The GRIDLOCK build catalog.
 *
 * Signed convention: `power` and `water` are positive when a structure supplies
 * the grid and negative when it draws from it. `pollution` and `heat` are
 * positive when emitted, negative when scrubbed. One field, one sign, no
 * special cases in the simulation.
 *
 * INVARIANT: every entry is 1×1. Footprint variety is expressed through height
 * and silhouette, which keeps placement, pathing, and demolition trivial.
 */

/** @typedef {'road'|'residential'|'commercial'|'industry'|'data'|'power'|'water'|'civic'|'green'|'transit'|'special'} Category */

const B = (def) => Object.freeze({
  era: 1,
  upkeep: 0,
  power: 0,
  water: 0,
  residents: 0,
  jobs: 0,
  revenue: 0,
  pollution: 0,
  heat: 0,
  tech: 0,
  appeal: 0,
  appealRadius: 0,
  traffic: 0,
  needs: null,
  ...def,
});

export const CATALOG = Object.freeze([
  B({
    id: 'nexus', name: 'The Nexus', cat: 'special', cost: 0, upkeep: 0, hidden: true,
    power: 60, water: 60, jobs: 10, appeal: 6, appealRadius: 5,
    h: 1.4, color: '#3a3160', accent: '#ffd97a',
    desc: 'Founding hub. Every road traces its power back here. It cannot be removed.',
  }),

  B({
    id: 'road', name: 'Neon Road', cat: 'road', cost: 14, upkeep: 0.25,
    h: 0.06, color: '#2a2740', accent: '#8b5cf6',
    desc: 'Carries commuters. Every zone must touch a road wired back to the Nexus.',
  }),

  // ── Residential ─────────────────────────────────────────────────────────
  B({
    id: 'hab', name: 'Habitat Block', cat: 'residential', cost: 300, upkeep: 4,
    residents: 26, power: -6, water: -5, pollution: 0.6, heat: 0.2,
    h: 0.9, color: '#3b3560', accent: '#c9a84c',
    desc: 'Stacked micro-housing. Cheap, dense, and the backbone of a young city.',
  }),
  B({
    id: 'loft', name: 'Sky Loft', cat: 'residential', era: 2, cost: 1100, upkeep: 12,
    residents: 84, power: -16, water: -13, pollution: 0.8, heat: 0.4, appeal: 1, appealRadius: 2,
    h: 1.9, color: '#453d78', accent: '#e6c76a',
    desc: 'Vertical living for citizens who can pay for altitude.',
  }),
  B({
    id: 'spire', name: 'Arcology Spire', cat: 'residential', era: 3, cost: 5200, upkeep: 46,
    residents: 360, power: -62, water: -48, pollution: 1.2, heat: 0.9, appeal: 3, appealRadius: 3,
    h: 3.6, color: '#4d4490', accent: '#ffd97a',
    desc: 'A self-contained district folded into a single tower.',
  }),

  // ── Commercial ──────────────────────────────────────────────────────────
  B({
    id: 'market', name: 'Market Row', cat: 'commercial', cost: 340, upkeep: 5,
    jobs: 20, revenue: 46, power: -7, water: -4, appeal: 1, appealRadius: 2,
    h: 0.7, color: '#2f4a55', accent: '#38e1c8',
    desc: 'Street-level trade. Thrives beside housing, starves in isolation.',
  }),
  B({
    id: 'plaza', name: 'Neon Plaza', cat: 'commercial', era: 2, cost: 1250, upkeep: 14,
    jobs: 68, revenue: 168, power: -18, water: -9, appeal: 3, appealRadius: 3,
    h: 1.5, color: '#2f5a6b', accent: '#4df0d6',
    desc: 'Night markets, holo-signage, and a permanent crowd.',
  }),
  B({
    id: 'tower', name: 'Corporate Tower', cat: 'commercial', era: 3, cost: 4800, upkeep: 44,
    jobs: 240, revenue: 620, power: -55, water: -26, appeal: 2, appealRadius: 3,
    h: 3.2, color: '#2c6478', accent: '#7ef7e2',
    desc: 'Where the city\'s money actually lives.',
  }),

  // ── Industry ────────────────────────────────────────────────────────────
  B({
    id: 'fab', name: 'Fabricator', cat: 'industry', cost: 520, upkeep: 7,
    jobs: 32, revenue: 92, power: -14, water: -10, pollution: 6, heat: 1.2,
    appeal: -4, appealRadius: 3,
    h: 0.8, color: '#5a3a2c', accent: '#ff7a3d',
    desc: 'Prints goods and grievances in equal measure.',
  }),
  B({
    id: 'robotics', name: 'Robotics Yard', cat: 'industry', era: 2, cost: 1700, upkeep: 18,
    jobs: 96, revenue: 320, power: -38, water: -20, pollution: 8, heat: 1.8,
    appeal: -5, appealRadius: 3,
    h: 1.3, color: '#66422f', accent: '#ff9147',
    desc: 'Automated assembly at district scale. Loud, hot, profitable.',
  }),
  B({
    id: 'foundry', name: 'Orbital Foundry', cat: 'industry', era: 3, cost: 6400, upkeep: 58,
    jobs: 300, revenue: 1150, power: -110, water: -60, pollution: 10, heat: 2.6,
    appeal: -6, appealRadius: 4,
    h: 2.2, color: '#6e4632', accent: '#ffa85c',
    desc: 'Feeds the launch corridor. Nobody wants to live downwind.',
  }),

  // ── Data ────────────────────────────────────────────────────────────────
  B({
    id: 'server', name: 'Server Farm', cat: 'data', era: 2, cost: 2200, upkeep: 22,
    jobs: 24, revenue: 430, power: -85, water: -30, heat: 3.2, tech: 1,
    h: 0.9, color: '#2b3350', accent: '#5ea9ff',
    desc: 'Enormous revenue, enormous thirst, enormous waste heat.',
  }),
  B({
    id: 'ailab', name: 'AI Lab', cat: 'data', era: 3, cost: 4000, upkeep: 38,
    jobs: 60, revenue: 260, power: -70, water: -24, heat: 1.4, tech: 4,
    appeal: 2, appealRadius: 3,
    h: 1.7, color: '#33305e', accent: '#a78bfa',
    desc: 'Converts electricity into research. The fastest road to a new era.',
  }),

  // ── Power ───────────────────────────────────────────────────────────────
  B({
    id: 'diesel', name: 'Diesel Generator', cat: 'power', cost: 600, upkeep: 14,
    power: 90, pollution: 12, heat: 3.0, appeal: -6, appealRadius: 4,
    h: 0.8, color: '#4a3b30', accent: '#ff5a3c',
    desc: 'Instant power at a filthy price. A crutch, never a plan.',
  }),
  B({
    id: 'solar', name: 'Solar Array', cat: 'power', cost: 900, upkeep: 4,
    power: 55, heat: -0.1,
    h: 0.25, color: '#1e2a4a', accent: '#ffd166',
    desc: 'Silent and clean. Output dips through the night cycle.',
  }),
  B({
    id: 'wind', name: 'Wind Spire', cat: 'power', era: 2, cost: 1400, upkeep: 6,
    power: 120, appeal: -1, appealRadius: 2,
    h: 2.8, color: '#38455e', accent: '#d8e6ff',
    desc: 'Tall, clean, and faintly resented by everyone beneath it.',
  }),
  B({
    id: 'geo', name: 'Geothermal Tap', cat: 'power', era: 2, cost: 2600, upkeep: 16,
    power: 230, heat: 0.6, needs: 'hill',
    h: 1.0, color: '#3f3348', accent: '#ff8ab0',
    desc: 'Must be sunk into rock. Steady baseload with no smoke.',
  }),
  B({
    id: 'fusion', name: 'Fusion Reactor', cat: 'power', era: 3, cost: 9000, upkeep: 60,
    power: 900, heat: 1.0, appeal: -2, appealRadius: 4,
    h: 1.6, color: '#2a4a4a', accent: '#5ff2c8',
    desc: 'One reactor ends the power question for good.',
  }),

  // ── Water ───────────────────────────────────────────────────────────────
  B({
    id: 'pump', name: 'Water Pump', cat: 'water', cost: 380, upkeep: 5,
    water: 90, power: -6, needs: 'water',
    h: 0.4, color: '#25415c', accent: '#5ec8ff',
    desc: 'Must sit on the shoreline. The cheapest litre in the city.',
  }),
  B({
    id: 'desal', name: 'Desalination Plant', cat: 'water', era: 2, cost: 2100, upkeep: 18,
    water: 340, power: -40, heat: 0.8, needs: 'water',
    h: 0.9, color: '#204a63', accent: '#7ad9ff',
    desc: 'Turns the coast into a reservoir, for a price in megawatts.',
  }),
  B({
    id: 'condenser', name: 'Atmospheric Condenser', cat: 'water', era: 3, cost: 3000, upkeep: 20,
    water: 260, power: -55,
    h: 1.4, color: '#2b4f66', accent: '#9fe8ff',
    desc: 'Pulls water from open air. Build it anywhere, run it forever.',
  }),

  // ── Civic ───────────────────────────────────────────────────────────────
  B({
    id: 'clinic', name: 'Med Bay', cat: 'civic', cost: 700, upkeep: 12,
    jobs: 14, power: -9, water: -8, appeal: 2, appealRadius: 3,
    service: 'health', serviceRadius: 6,
    h: 0.7, color: '#42324a', accent: '#ff6f91',
    desc: 'Keeps citizens alive and, more importantly, keeps them here.',
  }),
  B({
    id: 'academy', name: 'Academy', cat: 'civic', cost: 950, upkeep: 15,
    jobs: 20, power: -11, water: -9, tech: 1.5, appeal: 2, appealRadius: 3,
    service: 'education', serviceRadius: 7,
    h: 0.9, color: '#3a3457', accent: '#c9a84c',
    desc: 'Slow, steady research and a permanent lift in civic mood.',
  }),
  B({
    id: 'security', name: 'Watch Post', cat: 'civic', cost: 550, upkeep: 10,
    jobs: 12, power: -6, water: -4, appeal: 1, appealRadius: 2,
    service: 'safety', serviceRadius: 6,
    h: 0.6, color: '#3d3646', accent: '#8fa8ff',
    desc: 'Order on the block. Unloved until the night it is missing.',
  }),

  // ── Green ───────────────────────────────────────────────────────────────
  B({
    id: 'park', name: 'Bio Park', cat: 'green', cost: 180, upkeep: 2,
    appeal: 6, appealRadius: 4, heat: -0.6, pollution: -1.5,
    h: 0.14, color: '#1f3a2c', accent: '#5ee08a',
    desc: 'The cheapest approval in the game. Sprinkle liberally.',
  }),
  B({
    id: 'skygarden', name: 'Sky Garden', cat: 'green', era: 2, cost: 1300, upkeep: 9,
    appeal: 12, appealRadius: 5, heat: -1.8, pollution: -4, water: -6,
    h: 1.1, color: '#22463a', accent: '#7dfba8',
    desc: 'A terraced canopy that cools the district it crowns.',
  }),
  B({
    id: 'recycler', name: 'Recycler', cat: 'green', era: 2, cost: 1500, upkeep: 14,
    jobs: 18, power: -20, pollution: -12, appeal: -1, appealRadius: 2,
    h: 0.7, color: '#31432f', accent: '#a8e05e',
    desc: 'Eats the smog your factories exhale.',
  }),
  B({
    id: 'scrubber', name: 'Carbon Scrubber', cat: 'green', era: 3, cost: 3600, upkeep: 26,
    power: -60, heat: -4.5, pollution: -6,
    h: 1.5, color: '#28483f', accent: '#5ff2c8',
    desc: 'The only structure that meaningfully reverses the Heat Index.',
  }),

  // ── Transit + spectacle ─────────────────────────────────────────────────
  B({
    id: 'stadium', name: 'Pulse Arena', cat: 'transit', era: 2, cost: 3200, upkeep: 30,
    jobs: 40, revenue: 180, power: -30, water: -18, appeal: 18, appealRadius: 7,
    h: 1.2, color: '#4a2f56', accent: '#ff5ec4',
    desc: 'A city-wide mood swing you can build on purpose.',
  }),
  B({
    id: 'transit', name: 'Transit Hub', cat: 'transit', era: 2, cost: 1600, upkeep: 16,
    jobs: 22, power: -14, appeal: 2, appealRadius: 3, traffic: 0.14,
    h: 0.8, color: '#33395c', accent: '#8b5cf6',
    desc: 'Takes commuters off your roads. Congestion relief, city-wide.',
  }),
  B({
    id: 'maglev', name: 'Mag-Lev Loop', cat: 'transit', era: 3, cost: 5000, upkeep: 40,
    power: -60, appeal: 4, appealRadius: 5, traffic: 0.26,
    h: 2.0, color: '#39406b', accent: '#b39cff',
    desc: 'Frictionless transit. The road network stops being your ceiling.',
  }),

  // ── Landmark ────────────────────────────────────────────────────────────
  B({
    id: 'zeropoint', name: 'Zero Point', cat: 'special', era: 3, cost: 14000, upkeep: 80,
    power: -140, water: -20, appeal: 25, appealRadius: 12, tech: 6, traffic: 0.35,
    h: 4.4, color: '#3a2f5e', accent: '#ffe9a8',
    desc: 'The interchange that ends gridlock forever. Finishing it wins the city.',
  }),
]);

/** @type {Map<string, typeof CATALOG[number]>} */
const INDEX = new Map(CATALOG.map((b) => [b.id, b]));

/** @returns {typeof CATALOG[number]|undefined} */
export const getBuilding = (id) => INDEX.get(id);

/** Player-placeable entries available at or below the given era, in catalog order. */
export const unlockedAt = (era) => CATALOG.filter((b) => !b.hidden && b.era <= era);

/** Player-placeable entries locked behind a later era. */
export const lockedAbove = (era) => CATALOG.filter((b) => !b.hidden && b.era > era);

export const CATEGORY_LABEL = Object.freeze({
  road: 'Roads',
  residential: 'Residential',
  commercial: 'Commercial',
  industry: 'Industry',
  data: 'Data',
  power: 'Power',
  water: 'Water',
  civic: 'Civic',
  green: 'Green',
  transit: 'Transit',
  special: 'Landmark',
});

/** Categories that must touch a connected road to function. */
export const NEEDS_ROAD = Object.freeze(
  new Set(['residential', 'commercial', 'industry', 'data', 'civic', 'transit', 'special']),
);
