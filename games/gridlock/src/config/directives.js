/**
 * Directives — the ordered objective queue. Three are active at a time; each
 * completion pays out and pulls the next one in, so there is always a concrete
 * next thing to build.
 *
 * `test` is instantaneous. `streak` requires the condition to hold for N
 * consecutive months, which is how the hard ones (stability, climate control)
 * are expressed.
 */

export const DIRECTIVES = Object.freeze([
  {
    id: 'first-roots', title: 'First Roots', detail: 'Grow the city to 250 residents.',
    reward: { credits: 1800 },
    test: (s) => s.population >= 250,
    progress: (s) => [s.population, 250],
  },
  {
    id: 'keep-the-lights-on', title: 'Keep the Lights On', detail: 'Hold full power and water supply for 6 straight months.',
    reward: { credits: 2400 },
    streak: 6,
    holds: (s, st) => st.power.ratio >= 1 && st.water.ratio >= 1 && s.population > 100,
  },
  {
    id: 'green-belt', title: 'Green Belt', detail: 'Operate 6 green structures.',
    reward: { credits: 2000, tech: 20 },
    test: (s, st) => (st.counts.green ?? 0) >= 6,
    progress: (s, st) => [st.counts.green ?? 0, 6],
  },
  {
    id: 'trade-district', title: 'Trade District', detail: 'Reach ₡700 per month in business revenue.',
    reward: { credits: 3000 },
    test: (s, st) => st.business >= 700,
    progress: (s, st) => [st.business, 700],
  },
  {
    id: 'second-era', title: 'The Solar Age', detail: 'Bank enough research to reach Era 2.',
    reward: { credits: 3500 },
    test: (s) => s.era >= 2,
    progress: (s) => [s.tech, 120],
  },
  {
    id: 'metropolis', title: 'Metropolis', detail: 'Grow the city to 2,000 residents.',
    reward: { credits: 5000, tech: 30 },
    test: (s) => s.population >= 2000,
    progress: (s) => [s.population, 2000],
  },
  {
    id: 'cool-head', title: 'Cool Head', detail: 'Hold the Heat Index under 45 for 8 months at 1,500+ residents.',
    reward: { credits: 6000, tech: 40 },
    streak: 8,
    holds: (s) => s.heat < 45 && s.population >= 1500,
  },
  {
    id: 'free-flowing', title: 'Free Flowing', detail: 'Keep congestion under 50% with 2,500+ residents.',
    reward: { credits: 6000 },
    streak: 5,
    holds: (s, st) => st.congestion < 0.5 && s.population >= 2500,
  },
  {
    id: 'beloved', title: 'Beloved', detail: 'Hold approval above 80 for 6 months.',
    reward: { credits: 8000, tech: 50 },
    streak: 6,
    holds: (s) => s.approval > 80,
  },
  {
    id: 'third-era', title: 'The Fusion Age', detail: 'Bank enough research to reach Era 3.',
    reward: { credits: 10000 },
    test: (s) => s.era >= 3,
    progress: (s) => [s.tech, 640],
  },
  {
    id: 'zero-point', title: 'Zero Point', detail: 'Build and power the Zero Point interchange.',
    reward: { credits: 0 },
    victory: true,
    test: (s, st) => s.grid.tiles.some((t) => t.b === 'zeropoint' && st.live.has(t.i)),
  },
]);

export const MAX_ACTIVE_DIRECTIVES = 3;
export const directiveById = (id) => DIRECTIVES.find((d) => d.id === id);
