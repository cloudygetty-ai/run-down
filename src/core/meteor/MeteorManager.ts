import {
  Bombardment,
  BombardmentPhase,
  MeteorImpact,
  Vector2,
} from "../../types";
import { lerpVec2, lerp, randomInRange, isInsideCircle } from "../../utils";

const METEOR_BLAST_RADIUS = 45;
const IMPACT_MAX_AGE_MS = 2500; // crater lingers 2.5 s before fading

// Each phase ramps up frequency and damage — players are forced inward.
// WHY: early phases are dramatic but survivable; phase 5-6 is pure chaos.
const BOMBARDMENT_PHASES: BombardmentPhase[] = [
  {
    phase: 1,
    shelterCenter: { x: 0, y: 0 },
    shelterRadius: 800,
    impactDamage: 25,
    impactInterval: 8_000,
    shrinkDuration: 60_000,
    waitDuration: 120_000,
  },
  {
    phase: 2,
    shelterCenter: { x: 0, y: 0 },
    shelterRadius: 500,
    impactDamage: 35,
    impactInterval: 6_000,
    shrinkDuration: 45_000,
    waitDuration: 75_000,
  },
  {
    phase: 3,
    shelterCenter: { x: 0, y: 0 },
    shelterRadius: 300,
    impactDamage: 50,
    impactInterval: 4_000,
    shrinkDuration: 30_000,
    waitDuration: 45_000,
  },
  {
    phase: 4,
    shelterCenter: { x: 0, y: 0 },
    shelterRadius: 150,
    impactDamage: 65,
    impactInterval: 3_000,
    shrinkDuration: 20_000,
    waitDuration: 25_000,
  },
  {
    phase: 5,
    shelterCenter: { x: 0, y: 0 },
    shelterRadius: 50,
    impactDamage: 80,
    impactInterval: 2_000,
    shrinkDuration: 15_000,
    waitDuration: 10_000,
  },
  {
    phase: 6,
    shelterCenter: { x: 0, y: 0 },
    shelterRadius: 10,
    impactDamage: 100,
    impactInterval: 1_000,
    shrinkDuration: 10_000,
    waitDuration: 0,
  },
];

export function createInitialBombardment(
  mapWidth: number,
  mapHeight: number
): Bombardment {
  const center: Vector2 = { x: mapWidth / 2, y: mapHeight / 2 };
  const first = BOMBARDMENT_PHASES[0];
  const next = pickNextShelterZone(
    center,
    first.shelterRadius,
    mapWidth,
    mapHeight
  );

  return {
    currentPhase: 0,
    shelterCenter: center,
    shelterRadius: first.shelterRadius,
    nextShelterCenter: next.center,
    nextShelterRadius: next.radius,
    isShrinking: false,
    shrinkProgress: 0,
    impactDamage: first.impactDamage,
    impactInterval: first.impactInterval,
    timeUntilNextImpact: first.impactInterval,
    timeUntilNextPhase: first.waitDuration,
    activeImpacts: [],
  };
}

// Pick a random shelter zone that fits inside the current one
function pickNextShelterZone(
  currentCenter: Vector2,
  currentRadius: number,
  mapWidth: number,
  mapHeight: number
): { center: Vector2; radius: number } {
  const phaseIndex = BOMBARDMENT_PHASES.findIndex(
    (p) => p.shelterRadius <= currentRadius
  );
  const nextIndex = Math.min(phaseIndex + 1, BOMBARDMENT_PHASES.length - 1);
  const nextRadius = BOMBARDMENT_PHASES[nextIndex].shelterRadius;

  const maxOffset = currentRadius - nextRadius;
  const angle = randomInRange(0, Math.PI * 2);
  const offset = randomInRange(0, maxOffset * 0.8);

  const center: Vector2 = {
    x: Math.max(
      nextRadius,
      Math.min(
        mapWidth - nextRadius,
        currentCenter.x + Math.cos(angle) * offset
      )
    ),
    y: Math.max(
      nextRadius,
      Math.min(
        mapHeight - nextRadius,
        currentCenter.y + Math.sin(angle) * offset
      )
    ),
  };
  return { center, radius: nextRadius };
}

// Spawn a new meteor at a random position outside the shelter zone.
// Tries up to 20 times; falls back to map corner if zone covers whole map.
function spawnImpactPosition(
  shelterCenter: Vector2,
  shelterRadius: number,
  mapWidth: number,
  mapHeight: number
): Vector2 {
  for (let attempt = 0; attempt < 20; attempt++) {
    const pos: Vector2 = {
      x: randomInRange(0, mapWidth),
      y: randomInRange(0, mapHeight),
    };
    if (!isInsideCircle(pos, shelterCenter, shelterRadius)) {
      return pos;
    }
  }
  // Fallback — guaranteed to be outside for any reasonable shelter radius
  return { x: 0, y: 0 };
}

// Age existing impacts (ms), remove expired ones.
function tickImpacts(impacts: MeteorImpact[], deltaMs: number): MeteorImpact[] {
  return impacts
    .map((i) => ({ ...i, age: i.age + deltaMs }))
    .filter((i) => i.age < i.maxAge);
}

// Returns the updated Bombardment state and a list of NEW impacts this tick
// (the engine reads these to apply damage to nearby players).
export function tickBombardment(
  bombardment: Bombardment,
  deltaMs: number,
  mapWidth: number,
  mapHeight: number
): { bombardment: Bombardment; newImpacts: MeteorImpact[] } {
  let b = {
    ...bombardment,
    activeImpacts: tickImpacts(bombardment.activeImpacts, deltaMs),
  };
  const newImpacts: MeteorImpact[] = [];

  // -- Shelter zone shrink progression --
  if (b.isShrinking) {
    const phaseData =
      BOMBARDMENT_PHASES[
        Math.min(b.currentPhase, BOMBARDMENT_PHASES.length - 1)
      ];
    b.shrinkProgress = Math.min(
      1,
      b.shrinkProgress + deltaMs / phaseData.shrinkDuration
    );

    b.shelterCenter = lerpVec2(
      bombardment.shelterCenter,
      b.nextShelterCenter,
      b.shrinkProgress
    );
    b.shelterRadius = lerp(
      bombardment.shelterRadius,
      b.nextShelterRadius,
      b.shrinkProgress
    );

    if (b.shrinkProgress >= 1) {
      b.isShrinking = false;
      b.shrinkProgress = 0;
      b.currentPhase += 1;

      const nextData =
        BOMBARDMENT_PHASES[
          Math.min(b.currentPhase, BOMBARDMENT_PHASES.length - 1)
        ];
      b.impactDamage = nextData.impactDamage;
      b.impactInterval = nextData.impactInterval;
      b.timeUntilNextPhase = nextData.waitDuration;

      const next = pickNextShelterZone(
        b.shelterCenter,
        b.shelterRadius,
        mapWidth,
        mapHeight
      );
      b.nextShelterCenter = next.center;
      b.nextShelterRadius = next.radius;
    }
  } else {
    b.timeUntilNextPhase -= deltaMs;
    if (b.timeUntilNextPhase <= 0) {
      b.isShrinking = true;
      b.shrinkProgress = 0;
    }
  }

  // -- Meteor strikes --
  b.timeUntilNextImpact -= deltaMs;
  while (b.timeUntilNextImpact <= 0) {
    const pos = spawnImpactPosition(
      b.shelterCenter,
      b.shelterRadius,
      mapWidth,
      mapHeight
    );
    const impact: MeteorImpact = {
      id: `meteor_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      position: pos,
      blastRadius: METEOR_BLAST_RADIUS,
      age: 0,
      maxAge: IMPACT_MAX_AGE_MS,
    };
    newImpacts.push(impact);
    b.activeImpacts = [...b.activeImpacts, impact];
    b.timeUntilNextImpact += b.impactInterval;
  }

  return { bombardment: b, newImpacts };
}
