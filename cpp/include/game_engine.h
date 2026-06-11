#pragma once
#include "types.h"

// Human input state (zeroed in sim mode — all bots, no human input).
struct InputState {
    Vector2 moveVector;      // normalized joystick direction
    Vector2 aimVector;       // aiming direction
    bool    isShooting  = false;
    bool    isBuilding  = false;
    bool    wantsReload = false;
};

// Main tick. Mutates state in-place. deltaMs should equal TICK_RATE_MS in normal play.
void tickGame(GameState& state, const InputState& humanInput, float deltaMs);

// Fire a shot from shooterId toward targetPos. Mutates state in-place.
void fireShot(GameState& state, const std::string& shooterId, const Vector2& targetPos);
