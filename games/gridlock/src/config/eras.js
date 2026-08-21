/**
 * Era progression. Research (tech) is the only gate — population and credits
 * follow from it, so the player always has one clear thing to chase.
 */

import { TECH } from './balance.js';

export const ERAS = Object.freeze([
  {
    id: 1,
    name: 'Diesel Age',
    tagline: 'Smoke, scaffolding, and a grid held together by nerve.',
    techCost: TECH.eraCost[0],
    palette: '#ff7a3d',
  },
  {
    id: 2,
    name: 'Solar Age',
    tagline: 'The city learns to breathe. Data becomes the second economy.',
    techCost: TECH.eraCost[1],
    palette: '#38e1c8',
  },
  {
    id: 3,
    name: 'Fusion Age',
    tagline: 'Limitless power, one unfinished spire, and a planet running a fever.',
    techCost: TECH.eraCost[2],
    palette: '#a78bfa',
  },
]);

export const eraById = (id) => ERAS.find((e) => e.id === id) ?? ERAS[0];

/**
 * Highest era affordable at the given cumulative research.
 * @param {number} tech
 */
export const eraForTech = (tech) => {
  let era = ERAS[0].id;
  for (const e of ERAS) if (tech >= e.techCost) era = e.id;
  return era;
};

/** Research still required to reach the next era, or null at max era. */
export const techToNextEra = (tech) => {
  const next = ERAS.find((e) => e.techCost > tech);
  return next ? { era: next, remaining: next.techCost - tech } : null;
};
