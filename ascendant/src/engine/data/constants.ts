/**
 * Every tunable number in the simulation, in one place.
 *
 * Units: distance is world units (a fighter is 1.8 tall), time is frames at a
 * fixed 60Hz, and all velocities are per-frame. Frame counts — not seconds —
 * are authoritative because a fighting game's feel lives in exact frame
 * advantage, and because rollback re-simulates whole frames.
 */

export const TICK_RATE = 60;
export const TICK_MS = 1000 / 60;

/** Arena is a disc with an invisible cylinder wall and a flight ceiling. */
export const ARENA_RADIUS = 26;
export const ARENA_CEILING = 34;
export const FLOOR_Y = 0;

export const WALK_SPEED = 0.075;
export const DASH_SPEED = 0.225;
export const DASH_FRAMES = 16;
export const BACKDASH_SPEED = 0.26;
export const BACKDASH_FRAMES = 18;
export const BACKDASH_INVULN = 7;
export const AIR_DRIFT = 0.011;
export const JUMP_VELOCITY = 0.42;
export const GRAVITY = 0.028;
export const MAX_FALL_SPEED = 0.85;
export const LANDING_RECOVERY = 4;

export const FLY_SPEED = 0.155;
export const FLY_VERTICAL_SPEED = 0.12;
export const FLY_MIN_HEIGHT = 1.2;

/** Ki — the Dragon Ball resource: blasts, flight, vanish, transformation. */
export const KI_MAX = 100;
export const KI_REGEN_PASSIVE = 0.055;
export const KI_CHARGE_RATE = 0.55;
export const KI_FLY_UPKEEP = 0.06;
export const KI_VANISH_COST = 25;
export const VANISH_COOLDOWN = 90;
export const VANISH_FRAMES = 14;
export const VANISH_DISTANCE = 2.2;

/** Drive — the Street Fighter 6 resource: impact, parry, rush, overdrive. */
export const DRIVE_MAX = 6000;
export const DRIVE_BAR = 1000;
export const DRIVE_REGEN = 3.2;
export const DRIVE_REGEN_BURNOUT = 6.4;
export const DRIVE_PARRY_DRAIN = 8.5;
export const DRIVE_PARRY_GAIN = 1000;
export const DRIVE_PARRY_STARTUP = 1;
export const DRIVE_RUSH_COST = 1000;
export const DRIVE_RUSH_CANCEL_COST = 3000;
export const DRIVE_RUSH_FRAMES = 20;
export const DRIVE_RUSH_SPEED = 0.3;
export const BURNOUT_FRAMES = 300;
export const BURNOUT_BLOCKSTUN_BONUS = 4;

export const SUPER_MAX = 3000;
export const SUPER_GAIN_PER_DAMAGE = 1.6;
export const SUPER_GAIN_ON_TAKE = 0.8;

/**
 * Damage scaling by combo length. Index 0 is the first hit; combos past the
 * table floor at MIN_SCALING so long juggles stay expressive but never lethal
 * on their own.
 */
export const SCALING_TABLE = [1, 1, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15] as const;
export const MIN_SCALING = 0.1;

/** Juggle points spent per air hit; at the limit the victim falls out. */
export const JUGGLE_LIMIT = 8;
export const JUGGLE_GRAVITY_STEP = 0.0035;

export const HITSTOP_SCALE = 1;
export const PUSHBACK_DECAY = 0.82;

/** MK-style Fatal Blow: one attempt per match, only while badly hurt. */
export const FATAL_HEALTH_RATIO = 0.3;
export const FATAL_FREEZE_FRAMES = 90;

export const TRANSFORM_FRAMES = 54;
export const TRANSFORM_KI_REQUIRED = 100;
export const TRANSFORM_KI_DRAIN = 0.05;
export const TRANSFORM_DAMAGE_MULT = 1.25;
export const TRANSFORM_SPEED_MULT = 1.18;
export const TRANSFORM_INVULN_FRAMES = 30;

export const ROUND_TIME_FRAMES = 99 * 60;
export const INTRO_FRAMES = 100;
export const ROUND_END_FRAMES = 170;
export const MATCH_END_FRAMES = 300;
export const ROUNDS_TO_WIN = 2;
export const START_DISTANCE = 5.5;

export const WAKEUP_FRAMES = 22;
export const KNOCKDOWN_FRAMES = 26;
export const THROW_RANGE = 1.4;

/** Beam clash: contested for this long before the higher power wins. */
export const CLASH_FRAMES = 48;
export const CLASH_PUSH = 0.06;

/**
 * The Erasure window — this game's answer to Mortal Kombat's finisher.
 *
 * A match-ending blow does not kill outright. It leaves the loser standing,
 * helpless and swaying, while the announcer calls PUT HER/HIM/THEM UNDER. The winner has
 * this long to land a character-specific Erasure; let the window lapse and the
 * round simply ends. Mercy is the default, not the reward.
 */
export const FINISHER_WINDOW_FRAMES = 200;
export const FINISHER_RANGE = 3.2;
export const ERASURE_FRAMES = 190;
export const DAZE_SWAY_RATE = 0.06;
