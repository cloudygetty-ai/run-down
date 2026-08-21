/**
 * The three feedback loops that make a city feel alive: approval, migration,
 * and heat. Each is a pure function of (state, stats) so they can be tested
 * in isolation and reasoned about one at a time.
 */

import { APPROVAL, CLIMATE, GROWTH, LABOR, TAX } from '../config/balance.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Pollution normalised against city size — a big city tolerates more smoke. */
export const pollutionPressure = (stats) =>
  clamp(stats.pollution / Math.max(14, stats.housingCount * 2.2), 0, 1.4);

/** 0 below the threshold, 1 at the critical index. */
export const heatPressure = (heat) =>
  clamp((heat - CLIMATE.threshold) / (CLIMATE.critical - CLIMATE.threshold), 0, 1);

/**
 * Where approval is heading. Approval itself chases this with inertia, so a
 * single bad month never collapses a city and a single park never saves one.
 */
export const approvalTarget = (state, stats) => {
  const target = APPROVAL.base
    + clamp(stats.appeal, -APPROVAL.appealCap, APPROVAL.appealCap)
    - stats.unemployment * APPROVAL.unemploymentWeight
    - pollutionPressure(stats) * APPROVAL.pollutionWeight
    - (1 - stats.power.ratio) * APPROVAL.powerWeight
    - (1 - stats.water.ratio) * APPROVAL.waterWeight
    - stats.gridlock * APPROVAL.congestionWeight
    + (stats.coverage - 0.5) * APPROVAL.coverageWeight
    - heatPressure(state.heat) * APPROVAL.heatWeight
    - (state.taxRate - TAX.neutral) * TAX.approvalSlope
    + stats.mods.approvalAdd;
  return clamp(target, 0, 100);
};

export const nextApproval = (state, stats) => {
  const target = approvalTarget(state, stats);
  return clamp(state.approval + (target - state.approval) * APPROVAL.inertia, 0, 100);
};

/**
 * Migration. Housing sets the ceiling, approval sets how full it gets, and
 * jobs cap the whole thing — a city with no work sheds people no matter how
 * pretty it is.
 */
export const nextPopulation = (state, stats) => {
  const desired = stats.capacity * (GROWTH.floorShare + (1 - GROWTH.floorShare) * (state.approval / 100));
  const jobCeiling = (stats.jobs / LABOR.participation) * LABOR.slack;
  const target = Math.min(desired, jobCeiling);
  let pop = state.population + (target - state.population) * GROWTH.rate * stats.mods.growthMul;

  // Utility failure drives people out faster than approval alone would.
  const outage = Math.max(1 - stats.power.ratio, 1 - stats.water.ratio);
  if (outage > 0) pop -= pop * GROWTH.exodusRate * outage;

  return Math.max(0, pop);
};

export const nextHeat = (state, stats) => {
  const delta = stats.heatLoad * CLIMATE.gain - CLIMATE.decay * (state.heat / 40);
  return clamp(state.heat + delta, 0, CLIMATE.max);
};

/** Grade shown on the HUD. Purely cosmetic, but players chase it. */
export const cityGrade = (approval, heat) => {
  const score = approval - heatPressure(heat) * 25;
  if (score >= 88) return { label: 'UTOPIAN', tone: 'good' };
  if (score >= 74) return { label: 'THRIVING', tone: 'good' };
  if (score >= 58) return { label: 'STABLE', tone: 'ok' };
  if (score >= 42) return { label: 'STRAINED', tone: 'warn' };
  if (score >= 25) return { label: 'FAILING', tone: 'bad' };
  return { label: 'COLLAPSING', tone: 'bad' };
};
