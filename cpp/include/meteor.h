#pragma once
#include "types.h"
#include "utils.h"
#include "balance.h"
#include <vector>
#include <string>
#include <cmath>

// Bombardment phase data — mirrors BOMBARDMENT_PHASES in MeteorManager.ts
struct BombardmentPhase {
    int   phase;
    float shelterRadius;
    float impactDamage;
    float impactInterval;
    float shrinkDuration;
    float waitDuration;
};

inline const std::vector<BombardmentPhase>& bombardmentPhases() {
    static const std::vector<BombardmentPhase> PHASES = {
        {1, 800.f,  25.f,  8000.f, 60000.f,  120000.f},
        {2, 500.f,  35.f,  6000.f, 45000.f,   75000.f},
        {3, 300.f,  50.f,  4000.f, 30000.f,   45000.f},
        {4, 150.f,  65.f,  3000.f, 20000.f,   25000.f},
        {5,  50.f,  80.f,  2000.f, 15000.f,   10000.f},
        {6,  10.f, 100.f,  1000.f, 10000.f,       0.f},
    };
    return PHASES;
}

inline MeteorType pickMeteorType() {
    float roll = randomInRange(0.f, 1.f);
    if (roll < METEOR_ECHO_CHANCE)    return MeteorType::echo;
    if (roll < METEOR_GRAVITY_CHANCE) return MeteorType::gravity;
    return MeteorType::explosive;
}

struct NextShelter { Vec2 center; float radius; };

inline NextShelter pickNextShelterZone(Vec2 currentCenter, float currentRadius,
                                        float mapWidth, float mapHeight)
{
    const auto& phases = bombardmentPhases();
    // Find index whose radius is <= currentRadius
    int phaseIndex = 0;
    for (int i = 0; i < (int)phases.size(); ++i) {
        if (phases[i].shelterRadius <= currentRadius) { phaseIndex = i; break; }
    }
    int nextIndex = std::min(phaseIndex + 1, (int)phases.size() - 1);
    float nextRadius = phases[nextIndex].shelterRadius;

    float maxOffset = currentRadius - nextRadius;
    float angle  = randomInRange(0.f, 3.14159265f * 2.f);
    float offset = randomInRange(0.f, maxOffset * 0.8f);

    Vec2 center = {
        std::max(nextRadius, std::min(mapWidth  - nextRadius, currentCenter.x + std::cos(angle) * offset)),
        std::max(nextRadius, std::min(mapHeight - nextRadius, currentCenter.y + std::sin(angle) * offset)),
    };
    return {center, nextRadius};
}

inline Vec2 spawnImpactPosition(Vec2 shelterCenter, float shelterRadius,
                                  float mapWidth, float mapHeight)
{
    for (int attempt = 0; attempt < 20; ++attempt) {
        Vec2 pos = {randomInRange(0.f, mapWidth), randomInRange(0.f, mapHeight)};
        if (!isInsideCircle(pos, shelterCenter, shelterRadius)) return pos;
    }
    return {0.f, 0.f};
}

// Tick pending incoming meteors; graduate those at 0 into real impacts.
struct TickIncomingResult {
    std::vector<IncomingMeteor> stillPending;
    std::vector<MeteorImpact>   newImpacts;
};

inline TickIncomingResult tickIncomingMeteors(
    const std::vector<IncomingMeteor>& incoming, float deltaMs)
{
    TickIncomingResult result;
    for (const auto& m : incoming) {
        float remaining = m.timeUntilImpactMs - deltaMs;
        if (remaining <= 0.f) {
            MeteorImpact impact;
            impact.id          = m.id;
            impact.position    = m.position;
            impact.blastRadius = METEOR_BLAST_RADIUS;
            impact.age         = 0.f;
            impact.maxAge      = IMPACT_MAX_AGE_MS;
            impact.meteorType  = m.meteorType;
            result.newImpacts.push_back(impact);
        } else {
            IncomingMeteor updated = m;
            updated.timeUntilImpactMs = remaining;
            result.stillPending.push_back(updated);
        }
    }
    return result;
}

struct TickBombardmentResult {
    Bombardment                 bombardment;
    std::vector<IncomingMeteor> newIncoming;
};

inline TickBombardmentResult tickBombardment(
    Bombardment b, float deltaMs, float mapWidth, float mapHeight)
{
    // Age active impacts
    std::vector<MeteorImpact> liveImpacts;
    for (auto& imp : b.activeImpacts) {
        imp.age += deltaMs;
        if (imp.age < imp.maxAge) liveImpacts.push_back(imp);
    }
    b.activeImpacts = liveImpacts;

    std::vector<IncomingMeteor> newIncoming;
    const auto& phases = bombardmentPhases();

    if (b.isShrinking) {
        int phaseIdx = std::min(b.currentPhase, (int)phases.size() - 1);
        float shrinkDur = phases[phaseIdx].shrinkDuration;
        b.shrinkProgress = std::min(1.f, b.shrinkProgress + deltaMs / shrinkDur);

        // Store old values for lerp (we use the Bombardment's current fields)
        // WHY: we lerp between the *start* of shrink and next center/radius.
        // The start values are implicitly the values before isShrinking was set.
        // To do this correctly we'd need to store them, but since we update each
        // tick we use b.shelterCenter/Radius as the "current" interpolated value.
        // For simplicity, advance by fraction of delta each tick.
        float step = deltaMs / shrinkDur;
        b.shelterCenter.x = b.shelterCenter.x + (b.nextShelterCenter.x - b.shelterCenter.x) * step;
        b.shelterCenter.y = b.shelterCenter.y + (b.nextShelterCenter.y - b.shelterCenter.y) * step;
        b.shelterRadius   = b.shelterRadius   + (b.nextShelterRadius   - b.shelterRadius)   * step;

        if (b.shrinkProgress >= 1.f) {
            b.isShrinking    = false;
            b.shrinkProgress = 0.f;
            b.currentPhase  += 1;

            int nextIdx = std::min(b.currentPhase, (int)phases.size() - 1);
            b.impactDamage        = phases[nextIdx].impactDamage;
            b.impactInterval      = phases[nextIdx].impactInterval;
            b.timeUntilNextPhase  = phases[nextIdx].waitDuration;

            NextShelter ns = pickNextShelterZone(b.shelterCenter, b.shelterRadius, mapWidth, mapHeight);
            b.nextShelterCenter = ns.center;
            b.nextShelterRadius = ns.radius;
        }
    } else {
        b.timeUntilNextPhase -= deltaMs;
        if (b.timeUntilNextPhase <= 0.f) {
            b.isShrinking    = true;
            b.shrinkProgress = 0.f;
        }
    }

    // Schedule new incoming meteors
    b.timeUntilNextImpact -= deltaMs;
    while (b.timeUntilNextImpact <= 0.f) {
        Vec2 pos = spawnImpactPosition(b.shelterCenter, b.shelterRadius, mapWidth, mapHeight);
        MeteorType mt = pickMeteorType();
        IncomingMeteor m;
        m.id                 = makeId("meteor");
        m.position           = pos;
        m.timeUntilImpactMs  = METEOR_WARNING_MS;
        m.meteorType         = mt;
        newIncoming.push_back(m);
        b.timeUntilNextImpact += b.impactInterval;
    }

    return {b, newIncoming};
}

inline Bombardment createInitialBombardment(float mapWidth, float mapHeight) {
    const auto& phases = bombardmentPhases();
    Vec2 center = {mapWidth / 2.f, mapHeight / 2.f};
    NextShelter ns = pickNextShelterZone(center, phases[0].shelterRadius, mapWidth, mapHeight);

    Bombardment b;
    b.currentPhase        = 0;
    b.shelterCenter       = center;
    b.shelterRadius       = phases[0].shelterRadius;
    b.nextShelterCenter   = ns.center;
    b.nextShelterRadius   = ns.radius;
    b.isShrinking         = false;
    b.shrinkProgress      = 0.f;
    b.impactDamage        = phases[0].impactDamage;
    b.impactInterval      = phases[0].impactInterval;
    b.timeUntilNextImpact = phases[0].impactInterval;
    b.timeUntilNextPhase  = phases[0].waitDuration;
    return b;
}
