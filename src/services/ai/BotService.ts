import { GameState, Player, Vector2 } from '../../types';
import { fireShot } from '../../core/gameEngine';
import { distance, normalize, isInsideCircle, clamp, randomInRange } from '../../utils';
import { computeAimPoint, canFire } from '../weapons';

const BOT_SPEED     = 2.5;   // units per tick
const BOT_SHOOT_RANGE = 300;
const BOT_AGGRO_RANGE = 400;
const BOT_LOOT_RANGE  = 60;
const TICK_MS         = 50;

// Per-bot mutable state (intentionally outside pure game state — AI is ephemeral)
type BotBrain = {
  lastFireTimeMs: number;
  wanderTarget: Vector2 | null;
  wanderTimer: number;  // ms until picking a new wander target
};

const botBrains = new Map<string, BotBrain>();

function getBrain(botId: string): BotBrain {
  if (!botBrains.has(botId)) {
    botBrains.set(botId, {
      lastFireTimeMs: 0,
      wanderTarget: null,
      wanderTimer: 0,
    });
  }
  return botBrains.get(botId)!;
}

export function clearBotBrains(): void {
  botBrains.clear();
}

// Tick all bots. Returns updated GameState.
export function tickBots(state: GameState, deltaMs: number): GameState {
  const now = Date.now();
  let next = state;

  for (const bot of state.players) {
    if (bot.isHuman || bot.status !== 'alive') continue;
    next = tickSingleBot(next, bot.id, now, deltaMs);
  }

  return next;
}

function tickSingleBot(state: GameState, botId: string, nowMs: number, deltaMs: number): GameState {
  const bot = state.players.find(p => p.id === botId);
  if (!bot || bot.status !== 'alive') return state;

  const brain = getBrain(botId);
  const human = state.players.find(p => p.isHuman && p.status === 'alive');
  const nearestEnemy = findNearestEnemy(bot, state.players);

  // Priority 1: get inside the storm safe zone if outside
  if (!isInsideCircle(bot.position, state.storm.safeZoneCenter, state.storm.safeZoneRadius)) {
    const target = state.storm.safeZoneCenter;
    const movedState = moveBot(state, bot, target, deltaMs);
    return movedState;
  }

  // Priority 2: engage enemy if in range
  if (nearestEnemy && distance(bot.position, nearestEnemy.position) < BOT_AGGRO_RANGE) {
    let updatedState = moveBot(state, bot, nearestEnemy.position, deltaMs);

    const weapon = bot.weapons[bot.activeWeaponSlot];
    if (weapon && distance(bot.position, nearestEnemy.position) < BOT_SHOOT_RANGE) {
      if (canFire(weapon, brain.lastFireTimeMs, nowMs)) {
        brain.lastFireTimeMs = nowMs;
        const aimPoint = computeAimPoint(bot.position, nearestEnemy.position, weapon);
        updatedState = fireShot(updatedState, botId, aimPoint);
      }
    }
    return updatedState;
  }

  // Priority 3: pick up nearby loot
  const nearLoot = state.lootDrops.find(
    l => distance(bot.position, l.position) < BOT_LOOT_RANGE,
  );
  if (nearLoot) {
    return pickUpLootForBot(state, bot, nearLoot.id);
  }

  // Priority 4: wander
  brain.wanderTimer -= deltaMs;
  if (!brain.wanderTarget || brain.wanderTimer <= 0) {
    brain.wanderTarget = {
      x: clamp(bot.position.x + randomInRange(-200, 200), 50, state.mapWidth  - 50),
      y: clamp(bot.position.y + randomInRange(-200, 200), 50, state.mapHeight - 50),
    };
    brain.wanderTimer = randomInRange(2000, 6000);
  }

  return moveBot(state, bot, brain.wanderTarget, deltaMs);
}

function moveBot(state: GameState, bot: Player, target: Vector2, deltaMs: number): GameState {
  const dir = normalize({ x: target.x - bot.position.x, y: target.y - bot.position.y });
  const speed = BOT_SPEED * (deltaMs / TICK_MS);
  const dist = distance(bot.position, target);

  if (dist < speed) {
    // Already at target — don't overshoot
    return updateBotPosition(state, bot.id, target, 0);
  }

  const newPos: Vector2 = {
    x: clamp(bot.position.x + dir.x * speed, 0, state.mapWidth),
    y: clamp(bot.position.y + dir.y * speed, 0, state.mapHeight),
  };
  const rotation = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
  return updateBotPosition(state, bot.id, newPos, rotation);
}

function updateBotPosition(state: GameState, botId: string, pos: Vector2, rotation: number): GameState {
  const players = state.players.map(p =>
    p.id === botId ? { ...p, position: pos, rotation } : p,
  );
  return { ...state, players };
}

function findNearestEnemy(bot: Player, players: Player[]): Player | null {
  let nearest: Player | null = null;
  let minDist = Infinity;

  for (const p of players) {
    if (p.id === bot.id || p.status !== 'alive') continue;
    const d = distance(bot.position, p.position);
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  return nearest;
}

function pickUpLootForBot(state: GameState, bot: Player, lootId: string): GameState {
  const loot = state.lootDrops.find(l => l.id === lootId);
  if (!loot) return state;

  let updatedBot = { ...bot };

  if (loot.weapon) {
    const emptySlot = updatedBot.weapons.findIndex((w, i) => i > 0 && w === null) as 0 | 1 | 2 | -1;
    if (emptySlot !== -1) {
      const weapons = [...updatedBot.weapons] as Player['weapons'];
      weapons[emptySlot] = loot.weapon;
      updatedBot = { ...updatedBot, weapons };
    }
  }

  updatedBot = {
    ...updatedBot,
    shield: Math.min(updatedBot.maxShield, updatedBot.shield + loot.shield),
    health: Math.min(updatedBot.maxHealth, updatedBot.health + loot.health),
    materials: {
      wood:  updatedBot.materials.wood  + loot.materials.wood,
      stone: updatedBot.materials.stone + loot.materials.stone,
      metal: updatedBot.materials.metal + loot.materials.metal,
    },
  };

  const players = state.players.map(p => p.id === bot.id ? updatedBot : p);
  const lootDrops = state.lootDrops.filter(l => l.id !== lootId);
  return { ...state, players, lootDrops };
}
