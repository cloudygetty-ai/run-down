// Single source of truth for all balance numbers.
// Tune here — nowhere else.

// ── Engine timing ─────────────────────────────────────────────────────────────
export const TICK_RATE_MS = 50; // 20 ticks per second

// ── Player movement ───────────────────────────────────────────────────────────
export const PLAYER_SPEED = 4; // units per tick at full joystick deflection

// ── Fracture Core system ──────────────────────────────────────────────────────
export const FRACTURE_CORE_PICKUP_RANGE = 60;     // units — auto-pickup radius
export const FRACTURE_CORE_DAMAGE_AMP = 1.4;      // outgoing damage multiplier when held
export const FRACTURE_CORE_CDR_CHARGE_RATE = 2;   // ability charges 2× faster while held

// ── Meteor type distribution (must sum to 1.0) ────────────────────────────────
export const METEOR_ECHO_CHANCE = 0.05;
export const METEOR_GRAVITY_CHANCE = 0.20;        // roll < this → gravity (after echo check)
// explosive is the remainder (0.80)

// ── Meteor impact ─────────────────────────────────────────────────────────────
export const METEOR_BLAST_RADIUS = 45;            // crater radius in units
export const IMPACT_MAX_AGE_MS = 2500;            // ms before crater fades
export const METEOR_WARNING_MS = 2000;            // incoming warning duration before impact

// ── Gravity zone ──────────────────────────────────────────────────────────────
export const GRAVITY_ZONE_RADIUS = 180;
export const GRAVITY_ZONE_PULL_STRENGTH = 60;     // units per second pulled toward center
export const GRAVITY_ZONE_SPEED_MULT = 0.6;       // movement inside zone
export const GRAVITY_ZONE_MAX_AGE_MS = 30_000;

// ── Time Echo zone ────────────────────────────────────────────────────────────
export const ECHO_ZONE_RADIUS = 200;
export const ECHO_ZONE_MAX_AGE_MS = 20_000;
export const ECHO_ZONE_CHARGE_RATE_MULT = 0.5;    // ability charges at half speed inside
export const ECHO_ZONE_SPEED_MULT = 0.85;         // movement inside zone

// ── Character abilities ───────────────────────────────────────────────────────
export const JAX_HP_DRAIN_DPS = 5;               // HP drained per second during Adrenal Override
export const ABILITY_DAMAGE_BOOST_MULT = 1.5;    // outgoing damage while damage_boost active
export const ABILITY_SPEED_BOOST_MULT = 2;       // movement speed while speed_boost active

// ── Helix Relay ───────────────────────────────────────────────────────────────
export const HELIX_RELAY_CAPTURE_RATE = 1 / 5000;   // progress per ms (captures in 5s)
export const HELIX_RELAY_DECAY_RATE = 1 / 10000;    // progress lost per ms when unoccupied
export const HELIX_RELAY_REWARD_LOOT_RADIUS = 80;

// ── Supply Drop ───────────────────────────────────────────────────────────────
export const SUPPLY_DROP_INTERVAL_MS = 3 * 60 * 1000; // one drop every 3 minutes
export const SUPPLY_DROP_LAND_DELAY_MS = 8000;        // 8-second descent
export const SUPPLY_DROP_PICKUP_RADIUS = 100;

// ── Bounty system ─────────────────────────────────────────────────────────────
export const BOUNTY_KILL_THRESHOLD = 3; // ≥ this many kills to become bounty target

// ── HUD ───────────────────────────────────────────────────────────────────────
export const QUIP_DISPLAY_MS = 3500; // ms a character quip remains on screen

// ── Map ───────────────────────────────────────────────────────────────────────
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1600;
export const BOT_COUNT = 99;

// ── Bot AI ────────────────────────────────────────────────────────────────────
export const BOT_SPEED = 3;          // units per tick — ~75% of base PLAYER_SPEED, threatening but beatable
export const BOT_AGGRO_RANGE = 400;  // units — bot notices and chases enemies within this distance
export const BOT_SHOOT_RANGE = 300;  // units — bot fires when target is closer than this
export const BOT_LOOT_RANGE = 60;    // units — bot auto-picks up loot within this radius
