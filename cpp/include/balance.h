#pragma once

// Single source of truth for all balance constants.
// Mirrors src/core/balance/constants.ts exactly.

// ── Engine timing ──────────────────────────────────────────────────────────────
constexpr float TICK_RATE_MS = 50.f; // 20 ticks per second

// ── Player movement ────────────────────────────────────────────────────────────
constexpr float PLAYER_SPEED = 4.f;  // units per tick at full joystick deflection

// ── Fracture Core system ───────────────────────────────────────────────────────
constexpr float FRACTURE_CORE_PICKUP_RANGE   = 60.f;
constexpr float FRACTURE_CORE_DAMAGE_AMP     = 1.4f;
constexpr float FRACTURE_CORE_CDR_CHARGE_RATE = 2.f;

// ── Meteor type distribution ───────────────────────────────────────────────────
constexpr float METEOR_ECHO_CHANCE    = 0.05f;
constexpr float METEOR_GRAVITY_CHANCE = 0.20f; // roll < this after echo check

// ── Meteor impact ──────────────────────────────────────────────────────────────
constexpr float METEOR_BLAST_RADIUS = 45.f;
constexpr float IMPACT_MAX_AGE_MS   = 2500.f;
constexpr float METEOR_WARNING_MS   = 2000.f;

// ── Gravity zone ───────────────────────────────────────────────────────────────
constexpr float GRAVITY_ZONE_RADIUS       = 180.f;
constexpr float GRAVITY_ZONE_PULL_STRENGTH = 60.f;
constexpr float GRAVITY_ZONE_SPEED_MULT   = 0.6f;
constexpr float GRAVITY_ZONE_MAX_AGE_MS   = 30000.f;

// ── Time Echo zone ─────────────────────────────────────────────────────────────
constexpr float ECHO_ZONE_RADIUS           = 200.f;
constexpr float ECHO_ZONE_MAX_AGE_MS       = 20000.f;
constexpr float ECHO_ZONE_CHARGE_RATE_MULT = 0.5f;
constexpr float ECHO_ZONE_SPEED_MULT       = 0.85f;

// ── Character abilities ────────────────────────────────────────────────────────
constexpr float JAX_HP_DRAIN_DPS         = 5.f;
constexpr float ABILITY_DAMAGE_BOOST_MULT = 1.5f;
constexpr float ABILITY_SPEED_BOOST_MULT  = 2.f;

// ── Helix Relay ────────────────────────────────────────────────────────────────
constexpr float HELIX_RELAY_CAPTURE_RATE        = 1.f / 5000.f;
constexpr float HELIX_RELAY_DECAY_RATE          = 1.f / 10000.f;
constexpr float HELIX_RELAY_REWARD_LOOT_RADIUS  = 80.f;

// ── Supply Drop ────────────────────────────────────────────────────────────────
constexpr float SUPPLY_DROP_INTERVAL_MS   = 3.f * 60.f * 1000.f;
constexpr float SUPPLY_DROP_LAND_DELAY_MS = 8000.f;
constexpr float SUPPLY_DROP_PICKUP_RADIUS = 100.f;

// ── Bounty system ─────────────────────────────────────────────────────────────
constexpr int BOUNTY_KILL_THRESHOLD = 3;

// ── HUD ───────────────────────────────────────────────────────────────────────
constexpr float QUIP_DISPLAY_MS = 3500.f;

// ── Map ───────────────────────────────────────────────────────────────────────
constexpr float MAP_WIDTH  = 1600.f;
constexpr float MAP_HEIGHT = 1600.f;
constexpr int   BOT_COUNT  = 99;

// ── Bot AI ────────────────────────────────────────────────────────────────────
constexpr float BOT_SPEED       = 3.f;
constexpr float BOT_AGGRO_RANGE = 400.f;
constexpr float BOT_SHOOT_RANGE = 300.f;
constexpr float BOT_LOOT_RANGE  = 60.f;
constexpr float LOOT_PICKUP_RANGE = 60.f;
