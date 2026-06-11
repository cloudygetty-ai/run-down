#pragma once
#include "types.h"

// Returns true if enough time has elapsed since lastFireTimeMs to fire again.
bool canFire(const Weapon& weapon, float lastFireTimeMs, float nowMs);

// Tick weapon reload countdown. When reloadCountdownMs reaches 0, refills ammo.
void applyReloadTick(Weapon& w, float deltaMs, float reloadMult);

// Returns the spread radius for bot auto-aim for a given weapon type.
float weaponSpread(WeaponType type);
