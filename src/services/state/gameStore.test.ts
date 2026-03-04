import { useGameStore } from "./gameStore";
import { BuildPiece } from "../../types";

// Reset store to a fresh initial state before every test
beforeEach(() => {
  useGameStore.getState().resetGame();
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe("gameStore — initial state", () => {
  it("starts in the lobby phase", () => {
    const { gameState } = useGameStore.getState();
    expect(gameState.phase).toBe("lobby");
  });

  it("has 100 players (1 human + 99 bots)", () => {
    const { gameState } = useGameStore.getState();
    expect(gameState.players).toHaveLength(100);
    expect(gameState.players.filter((p) => p.isHuman)).toHaveLength(1);
    expect(gameState.players.filter((p) => !p.isHuman)).toHaveLength(99);
  });

  it("has 100 alive players", () => {
    const { gameState } = useGameStore.getState();
    expect(gameState.alivePlayers).toBe(100);
  });

  it("has 200 loot drops scattered on the map", () => {
    const { gameState } = useGameStore.getState();
    expect(gameState.lootDrops).toHaveLength(200);
  });

  it("human player starts with a pickaxe in slot 0", () => {
    const { gameState } = useGameStore.getState();
    const human = gameState.players.find((p) => p.isHuman)!;
    expect(human.weapons[0]?.type).toBe("pickaxe");
    expect(human.weapons[1]).toBeNull();
    expect(human.weapons[2]).toBeNull();
  });

  it("result is null before any game is played", () => {
    const { gameState } = useGameStore.getState();
    expect(gameState.result).toBeNull();
  });

  it("has no build pieces at start", () => {
    const { gameState } = useGameStore.getState();
    expect(gameState.buildPieces).toHaveLength(0);
  });

  it("human player starts inside the initial shelter zone", () => {
    const { gameState } = useGameStore.getState();
    const human = gameState.players.find((p) => p.isHuman)!;
    // Human spawns at map center; initial shelter radius is 800 centered at map center
    const dx = human.position.x - gameState.bombardment.shelterCenter.x;
    const dy = human.position.y - gameState.bombardment.shelterCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeLessThan(gameState.bombardment.shelterRadius);
  });
});

// ─── startGame ────────────────────────────────────────────────────────────────

describe("gameStore.startGame", () => {
  it("transitions phase from lobby to playing", () => {
    useGameStore.getState().startGame();
    const { gameState } = useGameStore.getState();
    expect(gameState.phase).toBe("playing");
  });

  it("sets startTime to a recent timestamp", () => {
    const before = Date.now();
    useGameStore.getState().startGame();
    const { gameState } = useGameStore.getState();
    expect(gameState.startTime).toBeGreaterThanOrEqual(before);
    expect(gameState.startTime).toBeLessThanOrEqual(Date.now());
  });

  it("preserves all players when starting", () => {
    useGameStore.getState().startGame();
    const { gameState } = useGameStore.getState();
    expect(gameState.players).toHaveLength(100);
  });
});

// ─── resetGame ────────────────────────────────────────────────────────────────

describe("gameStore.resetGame", () => {
  it("restores lobby phase after a game was started", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().resetGame();
    const { gameState } = useGameStore.getState();
    expect(gameState.phase).toBe("lobby");
  });

  it("regenerates players (new references) after reset", () => {
    const before = useGameStore.getState().gameState.players;
    useGameStore.getState().resetGame();
    const after = useGameStore.getState().gameState.players;
    expect(after).not.toBe(before);
  });

  it("clears build pieces placed in a previous game", () => {
    const piece: BuildPiece = {
      id: "bp_test",
      type: "wall",
      material: "wood",
      position: { x: 100, y: 100 },
      rotation: 0,
      health: 150,
      maxHealth: 150,
      ownerId: "human",
    };
    useGameStore.getState().placeBuildPiece(piece);
    useGameStore.getState().resetGame();
    expect(useGameStore.getState().gameState.buildPieces).toHaveLength(0);
  });
});

// ─── updateGameState ──────────────────────────────────────────────────────────

describe("gameStore.updateGameState", () => {
  it("replaces the game state entirely", () => {
    const { gameState, updateGameState } = useGameStore.getState();
    const modified = { ...gameState, tickCount: 999 };
    updateGameState(modified);
    expect(useGameStore.getState().gameState.tickCount).toBe(999);
  });
});

// ─── pickUpLoot ───────────────────────────────────────────────────────────────

describe("gameStore.pickUpLoot", () => {
  it("removes loot from the map after pickup", () => {
    const { gameState, pickUpLoot } = useGameStore.getState();
    const loot = gameState.lootDrops[0];
    const human = gameState.players.find((p) => p.isHuman)!;
    pickUpLoot(human.id, loot.id);
    const remaining = useGameStore.getState().gameState.lootDrops;
    expect(remaining.find((l) => l.id === loot.id)).toBeUndefined();
  });

  it("adds loot weapon into first empty weapon slot", () => {
    const { gameState, pickUpLoot } = useGameStore.getState();
    const lootWithWeapon = gameState.lootDrops.find((l) => l.weapon !== null)!;
    const human = gameState.players.find((p) => p.isHuman)!;
    pickUpLoot(human.id, lootWithWeapon.id);
    const updatedHuman = useGameStore
      .getState()
      .gameState.players.find((p) => p.isHuman)!;
    // Slot 1 or 2 should now have a weapon (slot 0 = pickaxe)
    const hasWeapon =
      updatedHuman.weapons[1] !== null || updatedHuman.weapons[2] !== null;
    expect(hasWeapon).toBe(true);
  });

  it("adds shield from loot to player shield", () => {
    const { gameState, pickUpLoot } = useGameStore.getState();
    // Find loot that has shield
    const shieldLoot = gameState.lootDrops.find((l) => l.shield > 0);
    if (!shieldLoot) {
      return;
    } // Skip if no loot with shield in this seed

    const human = gameState.players.find((p) => p.isHuman)!;
    pickUpLoot(human.id, shieldLoot.id);
    const updated = useGameStore
      .getState()
      .gameState.players.find((p) => p.isHuman)!;
    expect(updated.shield).toBeGreaterThan(0);
  });

  it("adds materials from loot", () => {
    const { gameState, pickUpLoot } = useGameStore.getState();
    const loot = gameState.lootDrops[0];
    const human = gameState.players.find((p) => p.isHuman)!;
    const woodBefore = human.materials.wood;
    pickUpLoot(human.id, loot.id);
    const updated = useGameStore
      .getState()
      .gameState.players.find((p) => p.isHuman)!;
    expect(updated.materials.wood).toBe(woodBefore + loot.materials.wood);
  });

  it("does nothing for a loot id that does not exist", () => {
    const { gameState, pickUpLoot } = useGameStore.getState();
    const human = gameState.players.find((p) => p.isHuman)!;
    pickUpLoot(human.id, "nonexistent_loot");
    // State should remain unchanged
    expect(useGameStore.getState().gameState.lootDrops).toHaveLength(
      gameState.lootDrops.length
    );
  });
});

// ─── placeBuildPiece ──────────────────────────────────────────────────────────

describe("gameStore.placeBuildPiece", () => {
  const makePiece = (ownerId: string): BuildPiece => ({
    id: "bp_1",
    type: "wall",
    material: "wood",
    position: { x: 800, y: 800 },
    rotation: 0,
    health: 150,
    maxHealth: 150,
    ownerId,
  });

  it("adds the build piece to the game state", () => {
    const human = useGameStore
      .getState()
      .gameState.players.find((p) => p.isHuman)!;
    useGameStore.getState().placeBuildPiece(makePiece(human.id));
    const { buildPieces } = useGameStore.getState().gameState;
    expect(buildPieces).toHaveLength(1);
    expect(buildPieces[0].id).toBe("bp_1");
  });

  it("deducts material cost (10 wood) from the player", () => {
    const { gameState } = useGameStore.getState();
    const human = gameState.players.find((p) => p.isHuman)!;
    const woodBefore = human.materials.wood;
    useGameStore.getState().placeBuildPiece(makePiece(human.id));
    const updated = useGameStore
      .getState()
      .gameState.players.find((p) => p.isHuman)!;
    expect(updated.materials.wood).toBe(woodBefore - 10);
  });

  it("does not place if player has insufficient materials", () => {
    const { gameState, updateGameState, placeBuildPiece } =
      useGameStore.getState();
    const human = gameState.players.find((p) => p.isHuman)!;
    // Zero out wood
    const players = gameState.players.map((p) =>
      p.id === human.id ? { ...p, materials: { ...p.materials, wood: 0 } } : p
    );
    updateGameState({ ...gameState, players });

    placeBuildPiece(makePiece(human.id));
    expect(useGameStore.getState().gameState.buildPieces).toHaveLength(0);
  });

  it("does nothing for an unknown player id", () => {
    useGameStore.getState().placeBuildPiece(makePiece("ghost_player"));
    expect(useGameStore.getState().gameState.buildPieces).toHaveLength(0);
  });
});
