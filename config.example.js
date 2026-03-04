/**
 * Run Down — configuration template
 *
 * Copy this file to config.js and fill in your values.
 * config.js is gitignored and must never be committed.
 */

module.exports = {
  // Game settings
  game: {
    // Number of players in a match (bots fill the rest)
    maxPlayers: 100,

    // Tick rate in milliseconds (lower = faster, more CPU)
    tickMs: 50,

    // Map dimensions in game units
    mapWidth: 1600,
    mapHeight: 1600,
  },

  // Meteor bombardment settings
  meteor: {
    // How many meteors spawn per bombardment wave
    meteorsPerWave: 8,

    // Damage dealt when a meteor hits a player directly
    directHitDamage: 50,

    // Damage per tick when outside the shelter zone
    outsideDamagePerTick: 2,
  },

  // Bot AI settings
  bots: {
    // Reaction delay in ms (higher = easier bots)
    reactionDelayMs: 300,

    // Distance at which bots engage enemies
    engageRangeUnits: 150,

    // Distance at which bots pick up loot
    lootPickupRangeUnits: 60,
  },

  // Logging
  logging: {
    // 'debug' | 'info' | 'warn' | 'error'
    level: 'info',

    // Set to true to log game ticks (very verbose)
    logTicks: false,
  },
};
