#pragma once

// ── Engine timing ──────────────────────────────────────────────────────────────
constexpr float TICK_RATE_MS = 50.0f;

// ── Player movement ────────────────────────────────────────────────────────────
constexpr float PLAYER_SPEED = 4.0f;

// ── Fracture Core system ───────────────────────────────────────────────────────
constexpr float FRACTURE_CORE_PICKUP_RANGE     = 60.0f;
constexpr float FRACTURE_CORE_DAMAGE_AMP       = 1.4f;
constexpr float FRACTURE_CORE_CDR_CHARGE_RATE  = 2.0f;

// ── Meteor type distribution ───────────────────────────────────────────────────
constexpr float METEOR_ECHO_CHANCE    = 0.05f;
constexpr float METEOR_GRAVITY_CHANCE = 0.20f;

// ── Meteor impact ──────────────────────────────────────────────────────────────
constexpr float METEOR_BLAST_RADIUS = 45.0f;
constexpr float IMPACT_MAX_AGE_MS   = 2500.0f;
constexpr float METEOR_WARNING_MS   = 2000.0f;

// ── Gravity zone ───────────────────────────────────────────────────────────────
constexpr float GRAVITY_ZONE_RADIUS        = 180.0f;
constexpr float GRAVITY_ZONE_PULL_STRENGTH = 60.0f;
constexpr float GRAVITY_ZONE_SPEED_MULT    = 0.6f;
constexpr float GRAVITY_ZONE_MAX_AGE_MS    = 30000.0f;

// ── Time Echo zone ─────────────────────────────────────────────────────────────
constexpr float ECHO_ZONE_RADIUS            = 200.0f;
constexpr float ECHO_ZONE_MAX_AGE_MS        = 20000.0f;
constexpr float ECHO_ZONE_CHARGE_RATE_MULT  = 0.5f;
constexpr float ECHO_ZONE_SPEED_MULT        = 0.85f;

// ── Character abilities ────────────────────────────────────────────────────────
constexpr float JAX_HP_DRAIN_DPS          = 5.0f;
constexpr float ABILITY_DAMAGE_BOOST_MULT = 1.5f;
constexpr float ABILITY_SPEED_BOOST_MULT  = 2.0f;

// ── Helix Relay ────────────────────────────────────────────────────────────────
constexpr float HELIX_RELAY_CAPTURE_RATE        = 1.0f / 5000.0f;
constexpr float HELIX_RELAY_DECAY_RATE          = 1.0f / 10000.0f;
constexpr float HELIX_RELAY_REWARD_LOOT_RADIUS  = 80.0f;

// ── Supply Drop ────────────────────────────────────────────────────────────────
constexpr float SUPPLY_DROP_INTERVAL_MS   = 3.0f * 60.0f * 1000.0f;
constexpr float SUPPLY_DROP_LAND_DELAY_MS = 8000.0f;
constexpr float SUPPLY_DROP_PICKUP_RADIUS = 100.0f;

// ── Bounty system ──────────────────────────────────────────────────────────────
constexpr int BOUNTY_KILL_THRESHOLD = 3;

// ── HUD ────────────────────────────────────────────────────────────────────────
constexpr float QUIP_DISPLAY_MS = 3500.0f;

// ── Map ────────────────────────────────────────────────────────────────────────
constexpr float MAP_WIDTH  = 1600.0f;
constexpr float MAP_HEIGHT = 1600.0f;
constexpr int   BOT_COUNT  = 99;

// ── Bot AI ─────────────────────────────────────────────────────────────────────
constexpr float BOT_SPEED       = 3.0f;
constexpr float BOT_AGGRO_RANGE = 400.0f;
constexpr float BOT_SHOOT_RANGE = 300.0f;
constexpr float BOT_LOOT_RANGE  = 60.0f;
constexpr float LOOT_PICKUP_RANGE = 60.0f;
