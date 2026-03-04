import { GameState, Player, MeteorImpact, Vector2 } from "../../types";
import { tickBombardment } from "../meteor";
import {
  resolvePlayerWallCollision,
  isPlayerHitByBullet,
  checkBulletHit,
} from "../physics";
import { distance, clamp, normalize } from "../../utils";
import { logger } from "../../utils";

const TICK_RATE_MS = 50; // 20 ticks per second
const PLAYER_SPEED = 4; // units per tick at full joystick

export type InputState = {
  moveVector: Vector2; // normalized joystick direction (-1..1 on each axis)
  aimVector: Vector2; // direction the player is aiming
  isShooting: boolean;
  isBuilding: boolean;
  buildPieceType: "wall" | "floor" | "ramp";
  buildPosition: Vector2 | null;
  wantsReload: boolean;
};

// Pure tick function — takes current state + input and returns new state.
// WHY: keeping this pure makes it trivially testable without mocks.
export function tickGame(
  state: GameState,
  humanInput: InputState,
  deltaMs: number
): GameState {
  if (state.phase !== "playing") {
    return state;
  }

  try {
    let next = {
      ...state,
      players: [...state.players],
      buildPieces: [...state.buildPieces],
    };

    next = moveHumanPlayer(next, humanInput, deltaMs);

    // Tick the bombardment and apply any new meteor strikes
    const { bombardment, newImpacts } = tickBombardment(
      next.bombardment,
      deltaMs,
      next.mapWidth,
      next.mapHeight
    );
    next = { ...next, bombardment };
    next = applyMeteorDamage(next, newImpacts);

    next = { ...next, tickCount: next.tickCount + 1 };
    next = checkWinCondition(next);

    return next;
  } catch (err) {
    // WHY: the game loop must never crash — log and return unchanged state
    logger.error("GameEngine", "tick error", err);
    return state;
  }
}

function moveHumanPlayer(
  state: GameState,
  input: InputState,
  deltaMs: number
): GameState {
  const humanIndex = state.players.findIndex(
    (p) => p.isHuman && p.status === "alive"
  );
  if (humanIndex === -1) {
    return state;
  }

  const player = state.players[humanIndex];
  const speed = PLAYER_SPEED * (deltaMs / TICK_RATE_MS);
  const dir = normalize(input.moveVector);

  const rawNext: Vector2 = {
    x: clamp(player.position.x + dir.x * speed, 0, state.mapWidth),
    y: clamp(player.position.y + dir.y * speed, 0, state.mapHeight),
  };

  const resolvedPos = resolvePlayerWallCollision(
    { ...player, position: rawNext },
    state.buildPieces
  );

  const rotation =
    input.aimVector.x !== 0 || input.aimVector.y !== 0
      ? Math.atan2(input.aimVector.y, input.aimVector.x) * (180 / Math.PI)
      : player.rotation;

  const updated: Player = {
    ...player,
    position: resolvedPos,
    rotation,
    isBuilding: input.isBuilding,
  };

  const players = [...state.players];
  players[humanIndex] = updated;
  return { ...state, players };
}

// Apply damage from freshly spawned meteor impacts to players in blast radius.
// WHY: only new impacts damage players — old craters are purely visual.
function applyMeteorDamage(
  state: GameState,
  newImpacts: MeteorImpact[]
): GameState {
  if (newImpacts.length === 0) {
    return state;
  }

  const players = state.players.map((p) => {
    if (p.status !== "alive") {
      return p;
    }

    let totalDmg = 0;
    for (const impact of newImpacts) {
      if (distance(p.position, impact.position) <= impact.blastRadius) {
        totalDmg += state.bombardment.impactDamage;
      }
    }
    if (totalDmg === 0) {
      return p;
    }

    // Shield absorbs first
    let shield = p.shield;
    let health = p.health;
    const absorbed = Math.min(shield, totalDmg);
    shield -= absorbed;
    health = Math.max(0, health - (totalDmg - absorbed));

    const status = health === 0 ? ("eliminated" as const) : p.status;
    return { ...p, shield, health, status };
  });

  return { ...state, players };
}

// Fire a shot from the shooter toward the target position.
// Returns updated state with damage applied and build pieces damaged.
export function fireShot(
  state: GameState,
  shooterId: string,
  targetPos: Vector2
): GameState {
  const shooterIndex = state.players.findIndex((p) => p.id === shooterId);
  if (shooterIndex === -1) {
    return state;
  }

  const shooter = state.players[shooterIndex];
  if (shooter.status !== "alive") {
    return state;
  }

  const weapon = shooter.weapons[shooter.activeWeaponSlot];
  if (!weapon || weapon.currentAmmo <= 0 || weapon.isReloading) {
    return state;
  }

  // Check for build piece hit first (bullets stop at walls)
  const hitPiece = checkBulletHit(
    shooter.position,
    targetPos,
    state.buildPieces
  );
  if (hitPiece) {
    const buildPieces = state.buildPieces
      .map((bp) => {
        if (bp.id !== hitPiece.id) {
          return bp;
        }
        const newHealth = Math.max(0, bp.health - weapon.damage);
        return { ...bp, health: newHealth };
      })
      .filter((bp) => bp.health > 0);

    const players = [...state.players];
    players[shooterIndex] = {
      ...shooter,
      weapons: shooter.weapons.map((w, i) =>
        i === shooter.activeWeaponSlot && w
          ? { ...w, currentAmmo: w.currentAmmo - 1 }
          : w
      ) as Player["weapons"],
    };
    return { ...state, players, buildPieces };
  }

  // Check for player hits
  let players = [...state.players];
  players[shooterIndex] = {
    ...shooter,
    weapons: shooter.weapons.map((w, i) =>
      i === shooter.activeWeaponSlot && w
        ? { ...w, currentAmmo: w.currentAmmo - 1 }
        : w
    ) as Player["weapons"],
  };

  for (let i = 0; i < players.length; i++) {
    const target = players[i];
    if (target.id === shooterId || target.status !== "alive") {
      continue;
    }
    if (!isPlayerHitByBullet(shooter.position, targetPos, target)) {
      continue;
    }

    let dmg = weapon.damage;
    let shield = target.shield;
    let health = target.health;

    if (shield > 0) {
      const absorbed = Math.min(shield, dmg);
      shield -= absorbed;
      dmg -= absorbed;
    }
    health = Math.max(0, health - dmg);

    const status = health === 0 ? ("eliminated" as const) : target.status;
    players[i] = { ...target, shield, health, status };

    if (status === "eliminated") {
      const kills = players[shooterIndex].kills + 1;
      players[shooterIndex] = { ...players[shooterIndex], kills };
    }
    break; // bullet hits one target
  }

  return { ...state, players };
}

function checkWinCondition(state: GameState): GameState {
  const alive = state.players.filter((p) => p.status === "alive");
  if (alive.length <= 1) {
    const winner = alive[0] ?? null;
    const human = state.players.find((p) => p.isHuman);
    const placement =
      human?.status === "alive" ? 1 : calculatePlacement(state.players);

    return {
      ...state,
      phase: "game_over",
      alivePlayers: alive.length,
      result: {
        placement,
        kills: human?.kills ?? 0,
        survivalTimeMs: Date.now() - state.startTime,
        winner: winner?.name ?? null,
      },
    };
  }
  return { ...state, alivePlayers: alive.length };
}

function calculatePlacement(players: Player[]): number {
  const human = players.find((p) => p.isHuman);
  if (!human) {
    return players.length;
  }
  const survivedLonger = players.filter(
    (p) => !p.isHuman && p.status === "alive"
  ).length;
  return survivedLonger + 1;
}
