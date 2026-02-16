import { Storm, StormPhase, Vector2 } from '../../types';
import { lerpVec2, lerp, randomInRange } from '../../utils';

// Pre-defined storm phases — the circle shrinks progressively tighter
// WHY: early phases give players time to rotate and loot;
//      late phases force combat in a tiny area.
const STORM_PHASES: StormPhase[] = [
  { phase: 1, safeZoneCenter: { x: 0, y: 0 }, safeZoneRadius: 800, damagePerTick: 1,  shrinkDuration: 60_000, waitDuration: 120_000 },
  { phase: 2, safeZoneCenter: { x: 0, y: 0 }, safeZoneRadius: 500, damagePerTick: 2,  shrinkDuration: 45_000, waitDuration: 75_000  },
  { phase: 3, safeZoneCenter: { x: 0, y: 0 }, safeZoneRadius: 300, damagePerTick: 5,  shrinkDuration: 30_000, waitDuration: 45_000  },
  { phase: 4, safeZoneCenter: { x: 0, y: 0 }, safeZoneRadius: 150, damagePerTick: 10, shrinkDuration: 20_000, waitDuration: 25_000  },
  { phase: 5, safeZoneCenter: { x: 0, y: 0 }, safeZoneRadius: 50,  damagePerTick: 20, shrinkDuration: 15_000, waitDuration: 10_000  },
  { phase: 6, safeZoneCenter: { x: 0, y: 0 }, safeZoneRadius: 10,  damagePerTick: 50, shrinkDuration: 10_000, waitDuration: 0       },
];

export function createInitialStorm(mapWidth: number, mapHeight: number): Storm {
  const center: Vector2 = { x: mapWidth / 2, y: mapHeight / 2 };
  const next = pickNextSafeZone(center, STORM_PHASES[0].safeZoneRadius, mapWidth, mapHeight);
  return {
    currentPhase: 0,
    safeZoneCenter: center,
    safeZoneRadius: STORM_PHASES[0].safeZoneRadius,
    nextSafeZoneCenter: next.center,
    nextSafeZoneRadius: next.radius,
    isShrinking: false,
    shrinkProgress: 0,
    damagePerTick: STORM_PHASES[0].damagePerTick,
    timeUntilNextPhase: STORM_PHASES[0].waitDuration,
  };
}

// Pick a new safe zone fully contained within the current one
function pickNextSafeZone(
  currentCenter: Vector2,
  currentRadius: number,
  mapWidth: number,
  mapHeight: number,
): { center: Vector2; radius: number } {
  const phaseIndex = STORM_PHASES.findIndex(p => p.safeZoneRadius <= currentRadius);
  const nextPhaseIndex = Math.min(phaseIndex + 1, STORM_PHASES.length - 1);
  const nextRadius = STORM_PHASES[nextPhaseIndex].safeZoneRadius;

  // Random offset so the new zone is inside the current one
  const maxOffset = currentRadius - nextRadius;
  const angle = randomInRange(0, Math.PI * 2);
  const offset = randomInRange(0, maxOffset * 0.8);

  const center: Vector2 = {
    x: Math.max(nextRadius, Math.min(mapWidth - nextRadius,  currentCenter.x + Math.cos(angle) * offset)),
    y: Math.max(nextRadius, Math.min(mapHeight - nextRadius, currentCenter.y + Math.sin(angle) * offset)),
  };
  return { center, radius: nextRadius };
}

// Returns an updated Storm given elapsed milliseconds since last tick
export function tickStorm(storm: Storm, deltaMs: number, mapWidth: number, mapHeight: number): Storm {
  const updated = { ...storm };

  if (updated.isShrinking) {
    const currentPhaseData = STORM_PHASES[Math.min(updated.currentPhase, STORM_PHASES.length - 1)];
    updated.shrinkProgress = Math.min(1, updated.shrinkProgress + deltaMs / currentPhaseData.shrinkDuration);

    // Interpolate current safe zone toward next
    updated.safeZoneCenter = lerpVec2(
      updated.safeZoneCenter,
      updated.nextSafeZoneCenter,
      updated.shrinkProgress,
    );
    updated.safeZoneRadius = lerp(
      updated.safeZoneRadius,
      updated.nextSafeZoneRadius,
      updated.shrinkProgress,
    );

    if (updated.shrinkProgress >= 1) {
      // Advance to the next phase
      updated.isShrinking = false;
      updated.shrinkProgress = 0;
      updated.currentPhase += 1;

      const nextPhaseData = STORM_PHASES[Math.min(updated.currentPhase, STORM_PHASES.length - 1)];
      updated.damagePerTick = nextPhaseData.damagePerTick;
      updated.timeUntilNextPhase = nextPhaseData.waitDuration;

      const next = pickNextSafeZone(updated.safeZoneCenter, updated.safeZoneRadius, mapWidth, mapHeight);
      updated.nextSafeZoneCenter = next.center;
      updated.nextSafeZoneRadius = next.radius;
    }
  } else {
    updated.timeUntilNextPhase -= deltaMs;
    if (updated.timeUntilNextPhase <= 0) {
      updated.isShrinking = true;
      updated.shrinkProgress = 0;
    }
  }

  return updated;
}
