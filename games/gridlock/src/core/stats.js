/**
 * The aggregation pass: one grid scan per month producing every number the
 * rest of the game reads. Pure — takes state, returns a stats snapshot.
 *
 * Resolution order matters and flows one way:
 *   roads → power → water → live structures → output → traffic
 * Water plants that lost power cannot pump; that dependency is expressed by
 * ordering, not by special-casing.
 */

import { CLIMATE, LABOR, TRAFFIC } from '../config/balance.js';
import { getBuilding } from '../config/buildings.js';
import { computeNetwork } from './network.js';
import { ration, POWER_PRIORITY, WATER_PRIORITY } from './rationing.js';
import { computeFields, housingAppeal, housingCoverage } from './fields.js';
import { tileSynergy } from './synergy.js';

/** Collapse active crisis modifiers into one multiplier set. */
export const aggregateModifiers = (modifiers) => {
  const acc = {
    powerSupplyMul: 1, powerDemandMul: 1, waterSupplyMul: 1, waterDemandMul: 1,
    revenueMul: 1, upkeepMul: 1, growthMul: 1, approvalAdd: 0, heatAdd: 0,
  };
  for (const mod of modifiers) {
    for (const [key, value] of Object.entries(mod.effects ?? {})) {
      if (key === 'approvalAdd' || key === 'heatAdd') acc[key] += value;
      else if (key in acc) acc[key] *= value;
    }
  }
  return acc;
};

const emptyBreakdown = () => ({ tax: 0, commercial: 0, industry: 0, data: 0, civic: 0 });

export const computeStats = (state) => {
  const { grid } = state;
  const mods = aggregateModifiers(state.modifiers);
  const network = computeNetwork(grid);
  const built = grid.tiles.filter((t) => t.b !== null);

  // ── Power ────────────────────────────────────────────────────────────────
  const coolingMul = 1 + Math.max(0, state.heat - CLIMATE.threshold) * CLIMATE.coolingLoad;
  let powerSupply = 0;
  const powerConsumers = [];
  for (const tile of built) {
    const def = getBuilding(tile.b);
    if (!def || !network.connected.has(tile.i)) continue;
    if (def.power > 0) powerSupply += def.power;
    else if (def.power < 0) {
      powerConsumers.push({
        i: tile.i, cat: def.cat, draw: -def.power * coolingMul * mods.powerDemandMul,
      });
    }
  }
  powerSupply *= mods.powerSupplyMul;
  const power = ration(powerConsumers, powerSupply, POWER_PRIORITY);
  const isPowered = (tile, def) =>
    network.connected.has(tile.i) && (def.power >= 0 || power.served.has(tile.i));

  // ── Water (depends on power) ─────────────────────────────────────────────
  let waterSupply = 0;
  const waterConsumers = [];
  for (const tile of built) {
    const def = getBuilding(tile.b);
    if (!def || !isPowered(tile, def)) continue;
    if (def.water > 0) waterSupply += def.water;
    else if (def.water < 0) {
      waterConsumers.push({ i: tile.i, cat: def.cat, draw: -def.water * mods.waterDemandMul });
    }
  }
  waterSupply *= mods.waterSupplyMul;
  const water = ration(waterConsumers, waterSupply, WATER_PRIORITY);

  // ── Live structures ──────────────────────────────────────────────────────
  const live = new Set();
  const housing = [];
  let stranded = 0;
  for (const tile of built) {
    const def = getBuilding(tile.b);
    if (!def) continue;
    const ok = isPowered(tile, def) && (def.water >= 0 || water.served.has(tile.i));
    if (ok) live.add(tile.i);
    // Cut off from the road graph — the failure players most often miss.
    else if (def.cat !== 'road' && !network.connected.has(tile.i)) stranded += 1;
    if (def.cat === 'residential') housing.push(tile);
  }

  const fields = computeFields(grid, live);

  // ── Output ───────────────────────────────────────────────────────────────
  let capacity = 0, jobs = 0, pollution = 0, heatLoad = 0, techGain = 0;
  let upkeep = 0, trafficRelief = 0;
  const gross = emptyBreakdown();
  const counts = {};

  for (const tile of built) {
    const def = getBuilding(tile.b);
    if (!def) continue;
    counts[def.cat] = (counts[def.cat] ?? 0) + 1;
    upkeep += def.upkeep; // Infrastructure costs money whether or not it runs.
    if (!live.has(tile.i)) continue;

    const syn = tileSynergy(grid, tile);
    capacity += def.residents * syn.capacityMul;
    jobs += def.jobs;
    pollution += def.pollution;
    heatLoad += def.heat * syn.heatMul;
    techGain += def.tech * syn.techMul;
    trafficRelief += def.traffic;
    if (def.revenue) gross[def.cat] = (gross[def.cat] ?? 0) + def.revenue * syn.revenueMul;
  }

  // ── Labour + traffic ─────────────────────────────────────────────────────
  const workforce = state.population * LABOR.participation;
  const jobsFilled = Math.min(workforce, jobs);
  const employment = workforce > 0 ? jobsFilled / workforce : 1;
  const staffing = jobs > 0 ? jobsFilled / jobs : 1;

  const roadCapacity = Math.max(1, network.roadCount * TRAFFIC.roadCapacity);
  const congestion = (jobsFilled / roadCapacity) * Math.max(0.2, 1 - trafficRelief);
  const gridlock = Math.max(0, Math.min(1, (congestion - TRAFFIC.tolerance) / (1 - TRAFFIC.tolerance)));

  // ── Money ────────────────────────────────────────────────────────────────
  const business = (gross.commercial + gross.industry + gross.data + gross.civic) * staffing;
  const taxIncome = state.population * state.taxRate * 19.5;
  const revenue = (taxIncome + business * (1 - gridlock * 0.3)) * mods.revenueMul;
  const expenses = upkeep * mods.upkeepMul;

  return {
    network, fields, live, powered: power.served, watered: water.served,
    power: { supply: powerSupply, demand: power.demand, ratio: power.ratio },
    water: { supply: waterSupply, demand: water.demand, ratio: water.ratio },
    capacity, jobs, jobsFilled, workforce, employment, staffing,
    unemployment: Math.max(0, 1 - employment),
    congestion, gridlock, roadCapacity,
    pollution, heatLoad: heatLoad + mods.heatAdd, techGain,
    appeal: housingAppeal(grid, fields, housing),
    coverage: housingCoverage(grid, fields, housing),
    revenue, expenses, net: revenue - expenses, taxIncome, business, gross, upkeep,
    counts, housingCount: housing.length, stranded, mods,
  };
};
