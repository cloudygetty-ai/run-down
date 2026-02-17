import { tickBots, clearBotBrains } from "./BotService";
import { GameState, Player, LootDrop } from "../../types";
import { createInitialBombardment } from "../../core/meteor";

const MAP_W = 1600;
const MAP_H = 1600;

// Initial shelter center is MAP_W/2, MAP_H/2 with radius 800
const SHELTER_CENTER = { x: MAP_W / 2, y: MAP_H / 2 };

function makeWeapon(overrides = {}) {
  return {
    id: "w1",
    type: "assault_rifle" as const,
    rarity: "common" as const,
    damage: 35,
    fireRate: 5,
    magazineSize: 30,
    currentAmmo: 30,
    range: 400,
    reloadTime: 2000,
    isReloading: false,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "bot0",
    name: "Bot0",
    isHuman: false,
    position: { x: SHELTER_CENTER.x, y: SHELTER_CENTER.y },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 100,
    status: "alive",
    weapons: [null, makeWeapon(), null],
    activeWeaponSlot: 1,
    materials: { wood: 100, stone: 50, metal: 25 },
    kills: 0,
    isBuilding: false,
    selectedBuildPiece: "wall",
    selectedBuildMaterial: "wood",
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "playing",
    players: [],
    buildPieces: [],
    lootDrops: [],
    bombardment: createInitialBombardment(MAP_W, MAP_H),
    mapWidth: MAP_W,
    mapHeight: MAP_H,
    tickCount: 0,
    startTime: Date.now(),
    result: null,
    alivePlayers: 1,
    ...overrides,
  };
}

function makeLoot(id: string, x: number, y: number): LootDrop {
  return {
    id,
    position: { x, y },
    weapon: makeWeapon({ id: `loot_w_${id}` }),
    ammo: 30,
    materials: { wood: 20, stone: 10, metal: 5 },
    shield: 50,
    health: 25,
  };
}

beforeEach(() => {
  clearBotBrains();
});

describe("BotService.clearBotBrains", () => {
  it("allows fresh brain state after clearing", () => {
    const bot = makePlayer({ id: "bot_clear" });
    const state = makeState({ players: [bot] });

    // First tick — creates brain
    tickBots(state, 50);
    clearBotBrains();

    // Should not throw after clear
    expect(() => tickBots(state, 50)).not.toThrow();
  });
});

describe("BotService.tickBots — priority 1: flee to shelter", () => {
  it("moves bot toward shelter center when outside the zone", () => {
    // Place bot well outside shelter zone (far corner of map)
    const outsidePos = { x: 50, y: 50 };
    const bot = makePlayer({ id: "bot_flee", position: outsidePos });
    const state = makeState({ players: [bot] });

    const next = tickBots(state, 50);
    const updatedBot = next.players.find((p) => p.id === "bot_flee")!;

    // Bot should have moved toward shelter center (800, 800) — both coords should increase
    expect(updatedBot.position.x).toBeGreaterThan(outsidePos.x);
    expect(updatedBot.position.y).toBeGreaterThan(outsidePos.y);
  });

  it("does not tick dead bots", () => {
    const deadBot = makePlayer({
      id: "bot_dead",
      status: "eliminated",
      position: { x: 50, y: 50 },
    });
    const state = makeState({ players: [deadBot] });

    const next = tickBots(state, 50);
    const updatedBot = next.players.find((p) => p.id === "bot_dead")!;

    // Dead bots should not move
    expect(updatedBot.position.x).toBe(50);
    expect(updatedBot.position.y).toBe(50);
  });

  it("skips human players", () => {
    const human = makePlayer({
      id: "human",
      isHuman: true,
      position: { x: 50, y: 50 },
    });
    const state = makeState({ players: [human] });

    const next = tickBots(state, 50);
    const updated = next.players.find((p) => p.id === "human")!;

    // Humans must never be moved by the bot system
    expect(updated.position.x).toBe(50);
    expect(updated.position.y).toBe(50);
  });
});

describe("BotService.tickBots — priority 2: engage nearby enemy", () => {
  it("moves bot toward a nearby enemy", () => {
    const botPos = { x: SHELTER_CENTER.x, y: SHELTER_CENTER.y };
    const enemyPos = { x: SHELTER_CENTER.x + 200, y: SHELTER_CENTER.y };

    const bot = makePlayer({ id: "bot_attack", position: botPos });
    const enemy = makePlayer({
      id: "enemy",
      isHuman: true,
      position: enemyPos,
    });
    const state = makeState({ players: [bot, enemy] });

    const next = tickBots(state, 50);
    const updatedBot = next.players.find((p) => p.id === "bot_attack")!;

    // Bot should have moved closer to enemy (x should increase)
    expect(updatedBot.position.x).toBeGreaterThan(botPos.x);
  });

  it("returns updated game state (new reference) on every tick", () => {
    const bot = makePlayer({ id: "bot_ref" });
    const state = makeState({ players: [bot] });

    const next = tickBots(state, 50);
    expect(next).not.toBe(state);
  });
});

describe("BotService.tickBots — priority 3: pick up nearby loot", () => {
  it("picks up loot that is within BOT_LOOT_RANGE (60 units)", () => {
    const botPos = { x: SHELTER_CENTER.x, y: SHELTER_CENTER.y };
    const loot = makeLoot("loot_close", botPos.x + 40, botPos.y);
    const bot = makePlayer({ id: "bot_loot", position: botPos });
    const state = makeState({ players: [bot], lootDrops: [loot] });

    const next = tickBots(state, 50);

    // Loot within range should be consumed
    expect(next.lootDrops.find((l) => l.id === "loot_close")).toBeUndefined();
  });

  it("does not pick up loot that is far away", () => {
    const botPos = { x: SHELTER_CENTER.x, y: SHELTER_CENTER.y };
    const loot = makeLoot("loot_far", botPos.x + 500, botPos.y);
    const bot = makePlayer({ id: "bot_no_loot", position: botPos });
    const state = makeState({ players: [bot], lootDrops: [loot] });

    const next = tickBots(state, 50);
    expect(next.lootDrops.find((l) => l.id === "loot_far")).toBeDefined();
  });
});

describe("BotService.tickBots — priority 4: wander", () => {
  it("moves the bot when no other priority is active", () => {
    const botPos = { x: SHELTER_CENTER.x, y: SHELTER_CENTER.y };
    const bot = makePlayer({ id: "bot_wander", position: botPos });
    const state = makeState({ players: [bot] });

    // Run several ticks to let wander logic engage
    let next = state;
    for (let i = 0; i < 10; i++) {
      next = tickBots(next, 50);
    }

    const updated = next.players.find((p) => p.id === "bot_wander")!;
    // After many ticks the bot should have moved from its start position
    const moved =
      updated.position.x !== botPos.x || updated.position.y !== botPos.y;
    expect(moved).toBe(true);
  });

  it("clamps bot position to map bounds during wander", () => {
    const bot = makePlayer({
      id: "bot_edge",
      position: { x: MAP_W - 1, y: MAP_H - 1 },
    });
    const state = makeState({ players: [bot] });

    let next = state;
    for (let i = 0; i < 20; i++) {
      next = tickBots(next, 50);
    }

    const updated = next.players.find((p) => p.id === "bot_edge")!;
    expect(updated.position.x).toBeLessThanOrEqual(MAP_W);
    expect(updated.position.y).toBeLessThanOrEqual(MAP_H);
    expect(updated.position.x).toBeGreaterThanOrEqual(0);
    expect(updated.position.y).toBeGreaterThanOrEqual(0);
  });
});
