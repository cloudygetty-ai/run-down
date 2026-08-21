/**
 * The crisis deck.
 *
 * Crises are the difference between a city-painter and a game: they pause the
 * world and force a trade with no clean answer. Every card is data — the
 * engine in core/events.js interprets the effect kinds and never hard-codes a
 * specific crisis.
 *
 * Effect kinds:
 *   credits  {value}            — signed, may be a fn(state, stats)
 *   approval {value}            — signed points, applied immediately
 *   pop      {mul} | {value}    — migration shock
 *   tech     {value}            — research grant
 *   heat     {value}            — instant heat index shift
 *   modifier {id,label,months,effects} — timed multiplier, see core/stats.js
 *   destroy  {count, cat?}      — level structures, seeded-random pick
 *   risk     {chance, then, otherwise} — a gamble the player opts into
 */

const mod = (id, label, months, effects) => ({ kind: 'modifier', id, label, months, effects });

export const CRISIS_DECK = Object.freeze([
  {
    id: 'grid-surge',
    title: 'Grid Surge',
    flavor: 'Load is running ahead of generation. Engineering wants a decision before the transformers make one for them.',
    weight: 3,
    // WHY not power.ratio: that value is clamped at 1, so it can never express
    // "supply is only just keeping up". Compare the raw figures instead.
    when: (s, st) => (st.counts.power ?? 0) >= 1
      && st.power.demand > 0
      && st.power.supply < st.power.demand * 1.15,
    choices: [
      {
        label: 'Shed load city-wide',
        detail: 'Rolling brownouts for four months. Nobody will thank you.',
        effects: [
          mod('surge-shed', 'Rolling Brownouts', 4, { powerSupplyMul: 0.78 }),
          { kind: 'approval', value: -5 },
        ],
      },
      {
        label: 'Run the plants hot',
        detail: 'Hold full output and hope the hardware holds with it.',
        effects: [
          {
            kind: 'risk', chance: 0.45,
            then: [{ kind: 'destroy', count: 1, cat: 'power' }, { kind: 'approval', value: -8 }],
            otherwise: [{ kind: 'approval', value: 3 }],
          },
        ],
      },
    ],
  },
  {
    id: 'heatwave',
    title: 'Heatwave',
    flavor: 'Six straight weeks above record. Water draw is spiking and the grid is carrying every cooling unit in the city.',
    weight: 3,
    when: (s) => s.heat > 38,
    onFire: [mod('heatwave-base', 'Heatwave', 5, { waterDemandMul: 1.35, powerDemandMul: 1.12 })],
    choices: [
      {
        label: 'Ration water',
        detail: 'Cut consumption by a quarter. Expect anger.',
        effects: [
          mod('heatwave-ration', 'Water Rationing', 5, { waterDemandMul: 0.72 }),
          { kind: 'approval', value: -9 },
        ],
      },
      {
        label: 'Buy emergency reserves',
        detail: 'Truck it in at spot price.',
        cost: (s) => Math.round(1200 + s.population * 3.5),
        effects: [{ kind: 'approval', value: 2 }],
      },
    ],
  },
  {
    id: 'corp-bid',
    title: 'Corporate Bid',
    flavor: 'Helion Group wants tax-free siting rights for a compute campus. The cheque is enormous. So is the waste heat.',
    weight: 2,
    when: (s) => s.era >= 2,
    choices: [
      {
        label: 'Take the deal',
        detail: 'Cash now, a decade of thermal load later.',
        effects: [
          { kind: 'credits', value: 18000 },
          mod('corp-heat', 'Helion Campus', 14, { heatAdd: 4.5, upkeepMul: 1.06 }),
          { kind: 'approval', value: -6 },
        ],
      },
      { label: 'Refuse the siting rights', detail: 'Keep the skyline yours.', effects: [{ kind: 'approval', value: 4 }] },
    ],
  },
  {
    id: 'influx',
    title: 'Arrival Wave',
    flavor: 'Three coastal cities went under this season. Their people are at your perimeter.',
    weight: 2,
    when: (s, st) => st.capacity > s.population * 1.05,
    choices: [
      {
        label: 'Open the gates',
        detail: 'Instant population, instant strain on every service you have.',
        effects: [{ kind: 'pop', mul: 1.16 }, { kind: 'approval', value: -4 },
          mod('influx-strain', 'Service Strain', 6, { waterDemandMul: 1.1 })],
      },
      { label: 'Seal the perimeter', detail: 'The city stays as it is. So does its conscience.', effects: [{ kind: 'approval', value: -11 }] },
    ],
  },
  {
    id: 'transit-strike',
    title: 'Transit Strike',
    flavor: 'Operators walked at midnight. Every arterial is a parking lot.',
    weight: 3,
    when: (s, st) => st.congestion > 0.55,
    choices: [
      {
        label: 'Meet their terms',
        detail: 'Expensive, immediate, and quietly popular.',
        cost: (s, st) => Math.round(st.expenses * 6 + 800),
        effects: [{ kind: 'approval', value: 5 }],
      },
      {
        label: 'Break the strike',
        detail: 'Trains run tomorrow. The city remembers for years.',
        effects: [{ kind: 'approval', value: -13 }, mod('strike-fallout', 'Labour Fallout', 5, { revenueMul: 0.86 })],
      },
    ],
  },
  {
    id: 'breach',
    title: 'Data Breach',
    flavor: 'Someone walked out of your compute district with the resident registry.',
    weight: 2,
    when: (s, st) => (st.counts.data ?? 0) >= 1,
    choices: [
      { label: 'Pay the ransom', detail: 'Quiet, fast, and never truly over.', cost: 6500, effects: [{ kind: 'approval', value: -2 }] },
      {
        label: 'Go public',
        detail: 'Full disclosure. Take the hit in daylight.',
        effects: [{ kind: 'approval', value: -9 }, mod('breach-fallout', 'Investor Flight', 6, { revenueMul: 0.82 })],
      },
    ],
  },
  {
    id: 'windfall',
    title: 'Sovereign Grant',
    flavor: 'Your approval numbers reached the capital. They would like to be associated with success.',
    weight: 2,
    when: (s) => s.approval > 72,
    choices: [
      {
        label: 'Accept the grant',
        detail: 'Enormous capital, permanent oversight overhead.',
        effects: [{ kind: 'credits', value: 12000 }, mod('grant-admin', 'Federal Oversight', 12, { upkeepMul: 1.12 })],
      },
      { label: 'Decline politely', detail: 'Independence has its own value.', effects: [{ kind: 'approval', value: 4 }] },
    ],
  },
  {
    id: 'tremor',
    title: 'Ground Tremor',
    flavor: 'The fault under the ridge moved four centimetres. Structural is calling it a warning shot.',
    weight: 2,
    when: (s) => s.month > 24,
    choices: [
      { label: 'Emergency retrofit', detail: 'Brace the district before the next one.', cost: 5200, effects: [] },
      {
        label: 'Ride it out',
        detail: 'Spend nothing. Risk a building.',
        effects: [{
          kind: 'risk', chance: 0.55,
          then: [{ kind: 'destroy', count: 1 }, { kind: 'approval', value: -6 }],
          otherwise: [],
        }],
      },
    ],
  },
  {
    id: 'smog',
    title: 'Smog Alert',
    flavor: 'Particulate is off the scale. The clinics are full of people who did nothing but breathe.',
    weight: 3,
    when: (s, st) => st.pollution > 24,
    choices: [
      {
        label: 'Idle the factories',
        detail: 'Clean air, empty ledgers.',
        effects: [mod('smog-idle', 'Industrial Shutdown', 4, { revenueMul: 0.72 }), { kind: 'approval', value: 6 }],
      },
      { label: 'Dispute the readings', detail: 'Production continues. So does the coughing.', effects: [{ kind: 'approval', value: -14 }] },
    ],
  },
  {
    id: 'breakthrough',
    title: 'Fusion Breakthrough',
    flavor: 'A lab team has containment holding past nine minutes. They need funding tonight, not next quarter.',
    weight: 2,
    when: (s, st) => (st.counts.data ?? 0) >= 1 && s.era >= 2,
    choices: [
      { label: 'Fund it', detail: 'A generational leap in research.', cost: 8000, effects: [{ kind: 'tech', value: 110 }, { kind: 'approval', value: 3 }] },
      { label: 'Shelve the programme', detail: 'The money stays in the treasury.', effects: [] },
    ],
  },
  {
    id: 'unrest',
    title: 'Blackout Riots',
    flavor: 'Four districts went dark and stayed dark. The crowd outside city hall is not a protest any more.',
    weight: 4,
    when: (s) => s.approval < 34,
    choices: [
      { label: 'Impose curfew', detail: 'Order tonight, resentment for a year.', effects: [{ kind: 'approval', value: 7 }, mod('curfew', 'Curfew', 6, { growthMul: 0.55 })] },
      { label: 'Emergency spending package', detail: 'Buy back the city\'s goodwill.', cost: 9000, effects: [{ kind: 'approval', value: 15 }] },
    ],
  },
  {
    id: 'festival',
    title: 'The Pulse Festival',
    flavor: 'Promoters want the whole waterfront for a week. It would be the loudest thing this city has ever done.',
    weight: 2,
    when: (s) => s.credits > 6000 && s.approval > 40,
    choices: [
      {
        label: 'Fund the festival',
        detail: 'A citywide high and a tourism spike.',
        cost: 4200,
        effects: [{ kind: 'approval', value: 11 }, mod('festival-boom', 'Festival Boom', 4, { revenueMul: 1.18 })],
      },
      { label: 'Deny the permit', detail: 'Quiet streets, quiet ledger.', effects: [{ kind: 'approval', value: -3 }] },
    ],
  },
]);
