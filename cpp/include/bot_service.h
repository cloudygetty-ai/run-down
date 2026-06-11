#pragma once
#include "types.h"

// Tick all bots in the state. Mutates state in-place.
void tickBots(GameState& state, float deltaMs);

// Clear bot brain map (call at game reset).
void clearBotBrains();
