/**
 * Economic + simulation constants for GRIDLOCK.
 *
 * WHY a single table: every tuning knob lives here so balance changes never
 * require touching simulation logic. The sim reads constants, it never invents
 * them. Changing a number here is a config change, not a code change.
 */

export const GRID = Object.freeze({ width: 32, height: 32 });

/** Real milliseconds per simulated month, indexed by speed setting. */
export const SPEED_MS = Object.freeze([Infinity, 2000, 900, 380]);
export const SPEED_LABEL = Object.freeze(['PAUSED', '1×', '2×', '3×']);

export const START = Object.freeze({
  credits: 30000,
  approval: 68,
  heat: 12,
  taxRate: 0.09,
});

export const TAX = Object.freeze({
  min: 0.0,
  max: 0.22,
  step: 0.01,
  /** Credits per resident per month at 100% tax. Scaled by taxRate. */
  perCapita: 19.5,
  /** Approval swing per percentage point away from the neutral rate. */
  neutral: 0.09,
  approvalSlope: 210,
});

export const LABOR = Object.freeze({
  /** Fraction of population that seeks work. */
  participation: 0.62,
  /** Population may exceed jobs by this factor before growth stalls. */
  slack: 1.18,
});

export const GROWTH = Object.freeze({
  /** Fraction of the gap to target population closed each month. */
  rate: 0.12,
  /** Minimum share of housing that fills even at rock-bottom approval. */
  floorShare: 0.4,
  /** Residents who leave per month when a utility is fully out. */
  exodusRate: 0.09,
});

export const APPROVAL = Object.freeze({
  base: 62,
  inertia: 0.16,
  unemploymentWeight: 46,
  pollutionWeight: 28,
  powerWeight: 34,
  waterWeight: 28,
  congestionWeight: 22,
  coverageWeight: 22,
  heatWeight: 26,
  appealCap: 26,
});

export const CLIMATE = Object.freeze({
  /** Heat index gained per unit of net thermal load per month. */
  gain: 0.05,
  /** Natural radiative decay per month, before emissions. */
  decay: 0.35,
  /** Heat index above which penalties begin. */
  threshold: 55,
  /** Heat index at which the city is in full crisis. */
  critical: 88,
  /** Extra power demand per point of heat above threshold, as a fraction. */
  coolingLoad: 0.006,
  max: 100,
});

export const TRAFFIC = Object.freeze({
  /** Commuters one road tile can carry per month. */
  roadCapacity: 26,
  /** Congestion above this level starts costing commerce and approval. */
  tolerance: 0.7,
});

export const SERVICE_KINDS = Object.freeze(['health', 'education', 'safety']);

export const TECH = Object.freeze({
  /** Research required to unlock each era, cumulative. */
  eraCost: [0, 120, 640],
});

export const EVENTS = Object.freeze({
  /** Months of quiet guaranteed after any crisis resolves. */
  cooldown: 7,
  /** Earliest month a crisis may fire. */
  graceMonths: 10,
  /** Per-month chance a crisis is drawn once off cooldown. */
  chance: 0.16,
});

export const SAVE_KEY = 'gridlock.save.v1';
export const SAVE_VERSION = 1;
