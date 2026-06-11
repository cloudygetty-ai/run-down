#pragma once
#include "types.h"
#include <vector>

// Build the initial Bombardment state for a fresh game
Bombardment createInitialBombardment(float mapWidth, float mapHeight);

// Tick pending incoming meteors: count down timers, graduate those that hit 0
struct TickIncomingResult {
    std::vector<IncomingMeteor> stillPending;
    std::vector<MeteorImpact>   newImpacts;
};
TickIncomingResult tickIncomingMeteors(const std::vector<IncomingMeteor>& incoming, float deltaMs);

// Tick the bombardment zone: advance timers, shrink shelter, spawn incoming meteors
struct TickBombardmentResult {
    Bombardment                  bombardment;
    std::vector<IncomingMeteor>  newIncoming;
};
TickBombardmentResult tickBombardment(const Bombardment& bombardment, float deltaMs,
                                       float mapWidth, float mapHeight);
