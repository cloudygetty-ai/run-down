/**
 * Adjacency synergy rules — the placement puzzle at the heart of GRIDLOCK.
 *
 * A rule reads: "for each 8-neighbour of `subject` that matches `neighbor`
 * (a build category) or `terrain`, apply `per`, up to `cap` neighbours."
 *
 * Multipliers are additive fractions applied to the subject's own output:
 *   revenueMul +0.08 × 3 neighbours → ×1.24 revenue
 *   appealAdd  -3    × 2 neighbours → -6 appeal
 *
 * WHY data, not code: a designer can retune the entire spatial meta-game here
 * without touching the aggregation pass in core/synergy.js.
 */

export const SYNERGY_RULES = Object.freeze([
  {
    id: 'foot-traffic', subject: 'commercial', neighbor: 'residential',
    per: { revenueMul: 0.08 }, cap: 4, label: 'Foot Traffic',
    hint: 'Commerce next to housing sells more.',
  },
  {
    id: 'retail-cluster', subject: 'commercial', neighbor: 'commercial',
    per: { revenueMul: 0.05 }, cap: 2, label: 'Retail Cluster',
    hint: 'Shops draw crowds to each other.',
  },
  {
    id: 'supply-chain', subject: 'industry', neighbor: 'industry',
    per: { revenueMul: 0.07 }, cap: 3, label: 'Supply Chain',
    hint: 'Factories that share a fence share a pipeline.',
  },
  {
    id: 'direct-feed', subject: 'data', neighbor: 'power',
    per: { revenueMul: 0.09 }, cap: 2, label: 'Direct Feed',
    hint: 'Server farms wired straight to a plant lose nothing in transit.',
  },
  {
    id: 'coolant-draw', subject: 'data', terrain: 'water',
    per: { heatMul: -0.18 }, cap: 3, label: 'Coolant Draw',
    hint: 'Waterfront data centres dump heat into the bay.',
  },
  {
    id: 'green-outlook', subject: 'residential', neighbor: 'green',
    per: { appealAdd: 2.5 }, cap: 3, label: 'Green Outlook',
    hint: 'A window onto a park is worth real approval.',
  },
  {
    id: 'downwind', subject: 'residential', neighbor: 'industry',
    per: { appealAdd: -3.5 }, cap: 3, label: 'Downwind',
    hint: 'Nobody wants to sleep beside a foundry.',
  },
  {
    id: 'connected', subject: 'residential', neighbor: 'transit',
    per: { capacityMul: 0.06 }, cap: 2, label: 'Connected',
    hint: 'Housing beside transit packs in more residents.',
  },
  {
    id: 'canopy', subject: 'green', neighbor: 'green',
    per: { heatMul: 0.12 }, cap: 3, label: 'Canopy',
    hint: 'Contiguous greenery cools harder than scattered planters.',
  },
  {
    id: 'campus', subject: 'data', neighbor: 'civic',
    per: { techMul: 0.15 }, cap: 2, label: 'Campus',
    hint: 'Labs beside academies research faster.',
  },
  {
    id: 'shoreline', subject: 'residential', terrain: 'water',
    per: { appealAdd: 1.5 }, cap: 3, label: 'Shoreline',
    hint: 'A view of the water lifts a whole block.',
  },
]);

/** Rules indexed by subject category — the sim only scans what can apply. */
export const RULES_BY_SUBJECT = SYNERGY_RULES.reduce((acc, rule) => {
  (acc[rule.subject] ||= []).push(rule);
  return acc;
}, /** @type {Record<string, typeof SYNERGY_RULES[number][]>} */ ({}));
