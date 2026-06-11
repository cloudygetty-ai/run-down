#include "meteor.h"
#include "balance.h"
#include "utils.h"
#include <algorithm>
#include <string>
#include <cmath>

// WHY: early phases are dramatic but survivable; phase 5-6 is pure chaos.
static const BombardmentPhase BOMBARDMENT_PHASES[] = {
    { 1, 800.0f, 25.0f,  8000.0f, 60000.0f,  120000.0f },
    { 2, 500.0f, 35.0f,  6000.0f, 45000.0f,  75000.0f  },
    { 3, 300.0f, 50.0f,  4000.0f, 30000.0f,  45000.0f  },
    { 4, 150.0f, 65.0f,  3000.0f, 20000.0f,  25000.0f  },
    { 5, 50.0f,  80.0f,  2000.0f, 15000.0f,  10000.0f  },
    { 6, 10.0f,  100.0f, 1000.0f, 10000.0f,  0.0f      },
};
static const int PHASE_COUNT = 6;

static MeteorType pickMeteorType() {
    float roll = randomInRange(0.0f, 1.0f);
    if (roll < METEOR_ECHO_CHANCE) return MeteorType::Echo;
    if (roll < METEOR_GRAVITY_CHANCE) return MeteorType::Gravity;
    return MeteorType::Explosive;
}

struct NextShelter {
    Vector2 center;
    float   radius;
};

static NextShelter pickNextShelterZone(const Vector2& currentCenter, float currentRadius,
                                        float mapWidth, float mapHeight) {
    // Find current phase index by shelter radius
    int phaseIndex = 0;
    for (int i = 0; i < PHASE_COUNT; i++) {
        if (BOMBARDMENT_PHASES[i].shelterRadius <= currentRadius) {
            phaseIndex = i;
            break;
        }
    }
    int nextIndex = std::min(phaseIndex + 1, PHASE_COUNT - 1);
    float nextRadius = BOMBARDMENT_PHASES[nextIndex].shelterRadius;

    float maxOffset = currentRadius - nextRadius;
    float angle  = randomInRange(0.0f, 2.0f * 3.14159265f);
    float offset = randomInRange(0.0f, maxOffset * 0.8f);

    Vector2 center = {
        clamp(currentCenter.x + std::cos(angle) * offset, nextRadius, mapWidth  - nextRadius),
        clamp(currentCenter.y + std::sin(angle) * offset, nextRadius, mapHeight - nextRadius),
    };
    return { center, nextRadius };
}

static Vector2 spawnImpactPosition(const Vector2& shelterCenter, float shelterRadius,
                                    float mapWidth, float mapHeight) {
    for (int attempt = 0; attempt < 20; attempt++) {
        Vector2 pos = { randomInRange(0.0f, mapWidth), randomInRange(0.0f, mapHeight) };
        if (!isInsideCircle(pos, shelterCenter, shelterRadius)) {
            return pos;
        }
    }
    return { 0.0f, 0.0f };
}

Bombardment createInitialBombardment(float mapWidth, float mapHeight) {
    Vector2 center = { mapWidth / 2.0f, mapHeight / 2.0f };
    const BombardmentPhase& first = BOMBARDMENT_PHASES[0];
    auto next = pickNextShelterZone(center, first.shelterRadius, mapWidth, mapHeight);

    Bombardment b;
    b.currentPhase       = 0;
    b.shelterCenter      = center;
    b.shelterRadius      = first.shelterRadius;
    b.nextShelterCenter  = next.center;
    b.nextShelterRadius  = next.radius;
    b.isShrinking        = false;
    b.shrinkProgress     = 0.0f;
    b.impactDamage       = first.impactDamage;
    b.impactInterval     = first.impactInterval;
    b.timeUntilNextImpact= first.impactInterval;
    b.timeUntilNextPhase = first.waitDuration;
    return b;
}

TickIncomingResult tickIncomingMeteors(const std::vector<IncomingMeteor>& incoming, float deltaMs) {
    TickIncomingResult result;


    for (const auto& m : incoming) {
        float remaining = m.timeUntilImpactMs - deltaMs;
        if (remaining <= 0.0f) {
            MeteorImpact impact;
            impact.id          = m.id;
            impact.position    = m.position;
            impact.blastRadius = METEOR_BLAST_RADIUS;
            impact.age         = 0.0f;
            impact.maxAge      = IMPACT_MAX_AGE_MS;
            impact.meteorType  = m.meteorType;
            result.newImpacts.push_back(impact);
        } else {
            IncomingMeteor pending = m;
            pending.timeUntilImpactMs = remaining;
            result.stillPending.push_back(pending);
        }
    }
    return result;
}

TickBombardmentResult tickBombardment(const Bombardment& bombardment, float deltaMs,
                                       float mapWidth, float mapHeight) {
    static int meteorIdCounter = 0;

    Bombardment b = bombardment;

    // Age active impacts
    {
        std::vector<MeteorImpact> aged;
        for (auto& imp : b.activeImpacts) {
            imp.age += deltaMs;
            if (imp.age < imp.maxAge) aged.push_back(imp);
        }
        b.activeImpacts = std::move(aged);
    }

    std::vector<IncomingMeteor> newIncoming;

    // -- Shelter zone shrink progression --
    if (b.isShrinking) {
        int pi = std::min(b.currentPhase, PHASE_COUNT - 1);
        b.shrinkProgress = std::min(1.0f,
            b.shrinkProgress + deltaMs / BOMBARDMENT_PHASES[pi].shrinkDuration);

        b.shelterCenter = lerpVec2(bombardment.shelterCenter, b.nextShelterCenter, b.shrinkProgress);
        b.shelterRadius = lerp(bombardment.shelterRadius, b.nextShelterRadius, b.shrinkProgress);

        if (b.shrinkProgress >= 1.0f) {
            b.isShrinking    = false;
            b.shrinkProgress = 0.0f;
            b.currentPhase  += 1;

            int ni = std::min(b.currentPhase, PHASE_COUNT - 1);
            b.impactDamage       = BOMBARDMENT_PHASES[ni].impactDamage;
            b.impactInterval     = BOMBARDMENT_PHASES[ni].impactInterval;
            b.timeUntilNextPhase = BOMBARDMENT_PHASES[ni].waitDuration;

            auto next = pickNextShelterZone(b.shelterCenter, b.shelterRadius, mapWidth, mapHeight);
            b.nextShelterCenter = next.center;
            b.nextShelterRadius = next.radius;
        }
    } else {
        b.timeUntilNextPhase -= deltaMs;
        if (b.timeUntilNextPhase <= 0.0f) {
            b.isShrinking    = true;
            b.shrinkProgress = 0.0f;
        }
    }

    // -- Schedule incoming meteors --
    b.timeUntilNextImpact -= deltaMs;
    while (b.timeUntilNextImpact <= 0.0f) {
        Vector2 pos = spawnImpactPosition(b.shelterCenter, b.shelterRadius, mapWidth, mapHeight);
        MeteorType mtype = pickMeteorType();

        IncomingMeteor m;
        m.id                = "meteor_" + std::to_string(++meteorIdCounter);
        m.position          = pos;
        m.timeUntilImpactMs = METEOR_WARNING_MS;
        m.meteorType        = mtype;
        newIncoming.push_back(m);

        b.timeUntilNextImpact += b.impactInterval;
    }

    return { b, newIncoming };
}
