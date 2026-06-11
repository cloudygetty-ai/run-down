#pragma once
#include "types.h"
#include <string>

// Build a fresh GameState ready to start. characterId is the human's character.
GameState buildInitialState(const std::string& characterId = "vex");
