import { Bombardment, BombardmentPhase, IncomingMeteor, MeteorImpact, MeteorType, Vector2 } from '../../types';
import { lerpVec2, lerp, randomInRange, isInsideCircle } from '../../utils';
import {
  METEOR_BLAST_RADIUS,
  IMPACT_MAX_AGE_MS,
  METEOR_WARNING_MS,
  METEOR_ECHO_CHANCE,
  METEOR_GRAVITY_CHANCE,
} from '../balance';

// Each phase ramps up frequency and damage — players are forced inward.
// WHY: early phases are dramatic but survivable; phase 5-6 is pure chaos.
const BOMBARDMENT_PHASES: BombardmentPhase[] = [
  { phase: 1, shelterCenter: { x: 0, y: 0 }, shelterRadius: 800,  impactDamage: 25,  impactInterval: 8_000, shrinkDuration: 60_000, waitDuration: 120_000 },
  { phase: 2, shelterCenter: { x: 0, y: 0 }, shelterRadius: 500,  impactDamage: 35,  impactInterval: 6_000, shrinkDuration: 45_000, waitDuration: 75_000  },
  { phase: 3, shelterCenter: { x: 0, y: 0 }, shelterRadius: 300,  impactDamage: 50,  impactInterval: 4_000, shrinkDuration: 30_000, waitDuration: 45_000  },
  { phase: 4, shelterCenter: { x: 0, y: 0 }, shelterRadius: 150,  impactDamage: 65,  impactInterval: 3_000, shrinkDuration: 20_000, waitDuration: 25_000  },
  { phase: 5, shelterCenter: { x: 0, y: 0 }, shelterRadius: 50,   impactDamage: 80,  impactInterval: 2_000, shrinkDuration: 15_000, waitDuration: 10_000  },
  { phase: 6, shelterCenter: { x: 0, y: 0 }, shelterRadius: 10,   impactDamage: 100, impactInterval: 1_000, shrinkDuration: 10_000, waitDuration: 0       },
];

export function createInitialBombardment(mapWidth: number, mapHeight: number): Bombardment {
  const center: Vector2 = { x: mapWidth / 2, y: mapHeight / 2 };
  const first = BOMBARDMENT_PHASES[0];
  const next = pickNextShelterZone(center, first.shelterRadius, mapWidth, mapHeight);

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

function pickNextShelterZone(
  currentCenter: Vector2,
  currentRadius: number,
  mapWidth: number,
  mapHeight: number,
): { center: Vector2; radius: number } {
  const phaseIndex = BOMBARDMENT_PHASES.findIndex((p) => p.shelterRadius <= currentRadius);
  const nextIndex = Math.min(phaseIndex + 1, BOMBARDMENT_PHASES.length - 1);
  const nextRadius = BOMBARDMENT_PHASES[nextIndex].shelterRadius;

  const maxOffset = currentRadius - nextRadius;
  const angle = randomInRange(0, Math.PI * 2);
  const offset = randomInRange(0, maxOffset * 0.8);

  const center: Vector2 = {
    x: Math.max(nextRadius, Math.min(mapWidth - nextRadius, currentCenter.x + Math.cos(angle) * offset)),
    y: Math.max(nextRadius, Math.min(mapHeight - nextRadius, currentCenter.y + Math.sin(angle) * offset)),
  };
  return { center, radius: nextRadius };
}

function spawnImpactPosition(
  shelterCenter: Vector2,
  shelterRadius: number,
  mapWidth: number,
  mapHeight: number,
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
  return { x: 0, y: 0 };
}

function tickImpacts(impacts: MeteorImpact[], deltaMs: number): MeteorImpact[] {
  return impacts.map((i) => ({ ...i, age: i.age + deltaMs })).filter((i) => i.age < i.maxAge);
}

// WHY: 5% echo, 15% gravity, 80% explosive — chaos is calibrated, not random.
function pickMeteorType(): MeteorType {
  const roll = Math.random();
  if (roll < METEOR_ECHO_CHANCE) return 'echo';
  if (roll < METEOR_GRAVITY_CHANCE) return 'gravity';
  return 'explosive';
}

// Tick pending incoming meteors: count down and graduate those that reach 0 into real impacts.
export function tickIncomingMeteors(
  incoming: IncomingMeteor[],
  deltaMs: number,
): { stillPending: IncomingMeteor[]; newImpacts: MeteorImpact[] } {
  const stillPending: IncomingMeteor[] = [];
  const newImpacts: MeteorImpact[] = [];

  for (const m of incoming) {
    const remaining = m.timeUntilImpactMs - deltaMs;
    if (remaining <= 0) {
      newImpacts.push({
        id: m.id,
        position: m.position,
        blastRadius: METEOR_BLAST_RADIUS,
        age: 0,
        maxAge: IMPACT_MAX_AGE_MS,
        meteorType: m.meteorType,
      });
    } else {
      stillPending.push({ ...m, timeUntilImpactMs: remaining });
    }
  }

  return { stillPending, newImpacts };
}

// Returns updated Bombardment and newly-spawned IncomingMeteors (not yet landed).
export function tickBombardment(
  bombardment: Bombardment,
  deltaMs: number,
  mapWidth: number,
  mapHeight: number,
): { bombardment: Bombardment; newIncoming: IncomingMeteor[] } {
  let b = {
    ...bombardment,
    activeImpacts: tickImpacts(bombardment.activeImpacts, deltaMs),
  };
  const newIncoming: IncomingMeteor[] = [];

  // -- Shelter zone shrink progression --
  if (b.isShrinking) {
    const phaseData = BOMBARDMENT_PHASES[Math.min(b.currentPhase, BOMBARDMENT_PHASES.length - 1)];
    b.shrinkProgress = Math.min(1, b.shrinkProgress + deltaMs / phaseData.shrinkDuration);

    b.shelterCenter = lerpVec2(bombardment.shelterCenter, b.nextShelterCenter, b.shrinkProgress);
    b.shelterRadius = lerp(bombardment.shelterRadius, b.nextShelterRadius, b.shrinkProgress);

    if (b.shrinkProgress >= 1) {
      b.isShrinking = false;
      b.shrinkProgress = 0;
      b.currentPhase += 1;

      const nextData = BOMBARDMENT_PHASES[Math.min(b.currentPhase, BOMBARDMENT_PHASES.length - 1)];
      b.impactDamage = nextData.impactDamage;
      b.impactInterval = nextData.impactInterval;
      b.timeUntilNextPhase = nextData.waitDuration;

      const next = pickNextShelterZone(b.shelterCenter, b.shelterRadius, mapWidth, mapHeight);
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

  // -- Schedule incoming meteors (warning phase before impact) --
  b.timeUntilNextImpact -= deltaMs;
  while (b.timeUntilNextImpact <= 0) {
    const pos = spawnImpactPosition(b.shelterCenter, b.shelterRadius, mapWidth, mapHeight);
    const meteorType = pickMeteorType();
    newIncoming.push({
      id: `meteor_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      position: pos,
      timeUntilImpactMs: METEOR_WARNING_MS,
      meteorType,
    });
    b.timeUntilNextImpact += b.impactInterval;
  }

  return { bombardment: b, newIncoming };
}
