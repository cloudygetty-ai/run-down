#pragma once
#include "types.h"
#include "utils.h"
#include <string>
#include <cmath>

// Weapon template data — mirrors gameStore.ts makeWeapon()

struct WeaponBase {
    float damage;
    float fireRate;
    int   magazineSize;
    float range;
    float reloadTime;
};

inline WeaponBase weaponBaseStats(WeaponType t) {
    switch (t) {
        case WeaponType::pickaxe:          return {20.f,  0.9f, 999999, 60.f,    0.f};
        case WeaponType::pistol:           return {25.f,  4.0f, 16,     250.f,   1500.f};
        case WeaponType::revolver:         return {55.f,  1.5f, 6,      350.f,   2000.f};
        case WeaponType::hand_cannon:      return {80.f,  0.75f,6,      300.f,   2500.f};
        case WeaponType::burst_pistol:     return {22.f,  7.0f, 18,     250.f,   1600.f};
        case WeaponType::smg:              return {17.f,  10.f, 35,     200.f,   1800.f};
        case WeaponType::compact_smg:      return {14.f,  13.f, 25,     150.f,   1400.f};
        case WeaponType::suppressed_smg:   return {18.f,  9.0f, 30,     220.f,   1800.f};
        case WeaponType::assault_rifle:    return {35.f,  5.0f, 30,     400.f,   2000.f};
        case WeaponType::burst_ar:         return {32.f,  4.0f, 27,     380.f,   2000.f};
        case WeaponType::heavy_ar:         return {45.f,  3.0f, 20,     420.f,   2200.f};
        case WeaponType::thermal_ar:       return {38.f,  4.5f, 25,     500.f,   2100.f};
        case WeaponType::shotgun:          return {110.f, 0.8f, 5,      120.f,   2500.f};
        case WeaponType::tactical_shotgun: return {72.f,  1.5f, 8,      130.f,   2000.f};
        case WeaponType::heavy_shotgun:    return {150.f, 0.5f, 2,      110.f,   3500.f};
        case WeaponType::drum_shotgun:     return {50.f,  2.0f, 12,     100.f,   3000.f};
        case WeaponType::sniper:           return {100.f, 0.5f, 4,      800.f,   3000.f};
        case WeaponType::semi_sniper:      return {70.f,  1.5f, 10,     700.f,   2500.f};
        case WeaponType::heavy_sniper:     return {150.f, 0.3f, 1,      1000.f,  4000.f};
        case WeaponType::hunting_rifle:    return {65.f,  1.0f, 8,      550.f,   2000.f};
        case WeaponType::marksman_rifle:   return {55.f,  2.0f, 12,     500.f,   2200.f};
        case WeaponType::lmg:             return {25.f,  8.0f, 100,    350.f,   4500.f};
        case WeaponType::rocket_launcher:  return {300.f, 0.2f, 1,      500.f,   5000.f};
        case WeaponType::crossbow:         return {95.f,  0.7f, 6,      600.f,   2800.f};
        case WeaponType::minigun:          return {18.f,  20.f, 200,    300.f,   6000.f};
        case WeaponType::rail_gun:         return {200.f, 0.25f,3,      1200.f,  5000.f};
    }
    return {20.f, 1.f, 10, 200.f, 2000.f};
}

inline float rarityMult(Rarity r) {
    switch (r) {
        case Rarity::common:    return 1.0f;
        case Rarity::uncommon:  return 1.1f;
        case Rarity::rare:      return 1.2f;
        case Rarity::epic:      return 1.35f;
        case Rarity::legendary: return 1.5f;
    }
    return 1.0f;
}

inline Weapon makeWeapon(WeaponType type, Rarity rarity) {
    WeaponBase b = weaponBaseStats(type);
    float mult = rarityMult(rarity);
    Weapon w;
    w.id           = makeId("weapon");
    w.type         = type;
    w.rarity       = rarity;
    w.damage       = std::round(b.damage * mult);
    w.fireRate     = b.fireRate;
    w.magazineSize = b.magazineSize;
    w.currentAmmo  = b.magazineSize;
    w.range        = b.range;
    w.reloadTime   = b.reloadTime;
    w.isReloading  = false;
    return w;
}

// Returns whether enough time has passed since lastFireTime to shoot again.
inline bool canFire(const Weapon& w, float lastFireMs, float nowMs) {
    if (w.currentAmmo <= 0 || w.isReloading) return false;
    float minInterval = 1000.f / w.fireRate;
    return (nowMs - lastFireMs) >= minInterval;
}

// Bot aim point with weapon-appropriate spread.
inline Vec2 computeAimPoint(Vec2 from, Vec2 to, const Weapon& w) {
    float spread = 15.f; // default
    switch (w.type) {
        case WeaponType::pickaxe:          spread = 0.f;   break;
        case WeaponType::pistol:           spread = 20.f;  break;
        case WeaponType::revolver:         spread = 8.f;   break;
        case WeaponType::hand_cannon:      spread = 12.f;  break;
        case WeaponType::burst_pistol:     spread = 18.f;  break;
        case WeaponType::smg:              spread = 25.f;  break;
        case WeaponType::compact_smg:      spread = 30.f;  break;
        case WeaponType::suppressed_smg:   spread = 20.f;  break;
        case WeaponType::assault_rifle:    spread = 15.f;  break;
        case WeaponType::burst_ar:         spread = 12.f;  break;
        case WeaponType::heavy_ar:         spread = 10.f;  break;
        case WeaponType::thermal_ar:       spread = 8.f;   break;
        case WeaponType::shotgun:          spread = 30.f;  break;
        case WeaponType::tactical_shotgun: spread = 35.f;  break;
        case WeaponType::heavy_shotgun:    spread = 25.f;  break;
        case WeaponType::drum_shotgun:     spread = 40.f;  break;
        case WeaponType::sniper:           spread = 5.f;   break;
        case WeaponType::semi_sniper:      spread = 7.f;   break;
        case WeaponType::heavy_sniper:     spread = 3.f;   break;
        case WeaponType::hunting_rifle:    spread = 10.f;  break;
        case WeaponType::marksman_rifle:   spread = 6.f;   break;
        case WeaponType::lmg:             spread = 20.f;  break;
        case WeaponType::rocket_launcher:  spread = 5.f;   break;
        case WeaponType::crossbow:         spread = 3.f;   break;
        case WeaponType::minigun:          spread = 35.f;  break;
        case WeaponType::rail_gun:         spread = 2.f;   break;
    }
    (void)from; // aim point is relative to target, not origin in this simplified model
    return {
        to.x + (randomInRange(-1.f, 1.f)) * spread,
        to.y + (randomInRange(-1.f, 1.f)) * spread,
    };
}
