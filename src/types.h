// src/types.h
#pragma once
#include <string>
#include <vector>
#include <cstdint>
#include <cmath>

namespace rd {

// ── Geometry ──────────────────────────────────────────────────────────────────
struct Vec2 {
    float x = 0, y = 0;
    Vec2 operator+(const Vec2& o) const { return {x+o.x, y+o.y}; }
    Vec2 operator-(const Vec2& o) const { return {x-o.x, y-o.y}; }
    Vec2 operator*(float s)       const { return {x*s, y*s}; }
    Vec2 normalized() const {
        float l = std::sqrt(x*x+y*y);
        return l > 0.001f ? Vec2{x/l,y/l} : Vec2{0,0};
    }
    bool operator==(const Vec2& o) const { return (int)x==(int)o.x && (int)y==(int)o.y; }
    float length() const { return std::sqrt(x*x+y*y); }
};
inline float dist2(Vec2 a, Vec2 b) { float dx=a.x-b.x,dy=a.y-b.y; return dx*dx+dy*dy; }
inline float distf(Vec2 a, Vec2 b) { return std::sqrt(dist2(a,b)); }

// ── Weapon ────────────────────────────────────────────────────────────────────
enum class Rarity : uint8_t { Common, Rare, Epic, Legendary };
struct Weapon {
    std::string name;
    Rarity      rarity    = Rarity::Common;
    int         damage    = 10;
    float       range     = 8.f;
    float       fireRate  = 1.f;
    float       spread    = 0.1f;
    float       reloadSec = 2.f;
    int         magSize   = 10;
    int         ammo      = 10;
    bool        isExplosive = false;
};

// ── Ability ───────────────────────────────────────────────────────────────────
enum class EffectType : uint8_t { None, DamageImmunity, DamageBoost, RapidFire };
struct Ability {
    std::string name;
    std::string description;
    float       cooldownSec   = 20.f;
    float       durationSec   = 0.f;
    EffectType  effectType    = EffectType::None;
    float       cooldownLeft  = 0.f;
    float       activeLeft    = 0.f;
    bool        active        = false;
};

// ── CharacterPassive ──────────────────────────────────────────────────────────
struct CharacterPassive {
    std::string description;
    int         maxHealthBonus   = 0;
    int         maxShieldBonus   = 0;
    int         startingShield   = 0;
    float       speedMult        = 1.f;
    float       damageMult       = 1.f;
    float       damageResistance = 0.f;
    float       reloadMult       = 1.f;
    int         killHealAmount   = 0;
    int         materialsBonus   = 0;
};

// ── Character definition ──────────────────────────────────────────────────────
struct CharacterDef {
    std::string      id;
    std::string      name;
    std::string      title;
    std::string      lore;
    std::string      meteorQuip;
    std::string      accentColor;
    CharacterPassive passive;
    Ability          ability;
};

// ── Tile ──────────────────────────────────────────────────────────────────────
enum class Tile : uint8_t { Floor, Wall, Tree, Loot, Built, Crater, Relay, FractureCore };

// ── Bullet (physics) ─────────────────────────────────────────────────────────
struct Bullet {
    Vec2  pos;
    Vec2  vel;        // units/sec
    int   damage      = 10;
    int   ownerId     = -1;
    float lifetime    = 0.5f;
    bool  alive       = true;
    bool  explosive   = false;
};

// ── Fracture Core ─────────────────────────────────────────────────────────────
struct FractureCore {
    Vec2  pos;
    bool  active    = true;
    float drainRate = 5.f;   // HP/sec drained while held
};

// ── Helix Relay ───────────────────────────────────────────────────────────────
struct HelixRelay {
    Vec2        pos;
    int         capturedBy  = -1;   // entity id, -1 = neutral
    float       captureTimer= 0.f;
    float       captureTime = 5.f;  // sec to capture
    bool        active      = true;
    float       cooldown    = 0.f;  // after capture, delay before next
};

// ── Meteor phase ──────────────────────────────────────────────────────────────
enum class MeteorPhase : uint8_t { Calm, Warning, Inbound, Impact, Aftershock, Clear };

// ── Meteor strike ─────────────────────────────────────────────────────────────
struct MeteorStrike {
    Vec2  pos;
    float countdown = 0;
    bool  exploded  = false;
    bool  secondary = false;
};

// ── Bot state ─────────────────────────────────────────────────────────────────
enum class BotState : uint8_t { Wander, Loot, Hunt, Flee, CaptureRelay, UseAbility };

// ── Entity ────────────────────────────────────────────────────────────────────
struct Entity {
    int              id          = 0;
    std::string      characterId;
    std::string      name;
    Vec2             pos;
    int              hp          = 100;
    int              maxHp       = 100;
    int              shield      = 0;
    int              maxShield   = 100;
    int              mats        = 50;
    Weapon           weapon;
    Ability          ability;
    CharacterPassive passive;
    float            shotTimer   = 0;
    float            reloadTimer = 0;
    int              kills       = 0;
    bool             alive       = true;
    bool             isPlayer    = false;

    // Fracture core state
    bool             hasFractureCore = false;
    float            fractureDrain   = 0.f;

    // Bot AI
    BotState         botState    = BotState::Wander;
    Vec2             botTarget;
    float            moveTimer   = 0;

    // Narrative
    bool             quipShown   = false;
    std::string      meteorQuip;
};

// ── Kill event ────────────────────────────────────────────────────────────────
struct KillEvent {
    std::string killerName;
    std::string victimName;
    std::string weapon;
    float       timer = 4.f;
};

} // namespace rd
