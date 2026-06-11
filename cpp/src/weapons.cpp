#include "weapons.h"
#include <climits>
#include <algorithm>

bool canFire(const Weapon& weapon, float lastFireTimeMs, float nowMs) {
    if (weapon.isReloading) return false;
    if (weapon.currentAmmo <= 0) return false;
    float minInterval = 1000.0f / weapon.fireRate;
    return (nowMs - lastFireTimeMs) >= minInterval;
}

// WHY: sim mode uses a countdown field instead of setTimeout callbacks —
// no async, no timers, just a simple decrement per tick.
void applyReloadTick(Weapon& w, float deltaMs, float /*reloadMult*/) {
    if (!w.isReloading || w.reloadCountdownMs <= 0.0f) return;

    w.reloadCountdownMs -= deltaMs;
    if (w.reloadCountdownMs <= 0.0f) {
        w.reloadCountdownMs = 0.0f;
        w.currentAmmo       = w.magazineSize;
        w.isReloading       = false;
    }
}

float weaponSpread(WeaponType type) {
    switch (type) {
        case WeaponType::Pickaxe:          return 0.0f;
        case WeaponType::Pistol:           return 20.0f;
        case WeaponType::Revolver:         return 8.0f;
        case WeaponType::HandCannon:       return 12.0f;
        case WeaponType::BurstPistol:      return 18.0f;
        case WeaponType::Smg:              return 25.0f;
        case WeaponType::CompactSmg:       return 30.0f;
        case WeaponType::SuppressedSmg:    return 20.0f;
        case WeaponType::AssaultRifle:     return 15.0f;
        case WeaponType::BurstAR:          return 12.0f;
        case WeaponType::HeavyAR:          return 10.0f;
        case WeaponType::ThermalAR:        return 8.0f;
        case WeaponType::Shotgun:          return 30.0f;
        case WeaponType::TacticalShotgun:  return 35.0f;
        case WeaponType::HeavyShotgun:     return 25.0f;
        case WeaponType::DrumShotgun:      return 40.0f;
        case WeaponType::Sniper:           return 5.0f;
        case WeaponType::SemiSniper:       return 7.0f;
        case WeaponType::HeavySniper:      return 3.0f;
        case WeaponType::HuntingRifle:     return 10.0f;
        case WeaponType::MarksmanRifle:    return 6.0f;
        case WeaponType::Lmg:             return 20.0f;
        case WeaponType::RocketLauncher:   return 5.0f;
        case WeaponType::Crossbow:         return 3.0f;
        case WeaponType::Minigun:          return 35.0f;
        case WeaponType::RailGun:          return 2.0f;
        default:                           return 15.0f;
    }
}
