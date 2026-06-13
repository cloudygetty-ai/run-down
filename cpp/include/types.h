#pragma once
#include <string>
#include <vector>
#include <optional>
#include <cstdint>

// ── Primitive types ────────────────────────────────────────────────────────────

struct Vec2 {
    float x{0.f};
    float y{0.f};
};

// ── Ability / passive enums ────────────────────────────────────────────────────

enum class AbilityEffectType {
    none,
    damage_immunity,
    speed_boost,
    rapid_fire,
    damage_boost,
};

struct CharacterPassive {
    std::string description;
    float maxHealthBonus{0.f};
    float maxShieldBonus{0.f};
    float startingShield{0.f};
    float speedMult{1.f};
    float damageMult{1.f};
    float damageResistance{0.f};
    float reloadMult{1.f};
    float killHealAmount{0.f};
    float materialsBonus{0.f};
};

struct CharacterAbility {
    std::string name;
    std::string description;
    float cooldownMs{0.f};
    float durationMs{0.f};
    AbilityEffectType effectType{AbilityEffectType::none};
};

struct CharacterStats {
    std::string id;
    std::string name;
    std::string title;
    std::string lore;
    std::string abilityDescription; // full ability description
    std::string meteorQuip;
    std::string accentColor;
    CharacterPassive passive;
    CharacterAbility ability;
};

// ── Weapon ─────────────────────────────────────────────────────────────────────

enum class WeaponType {
    pickaxe,
    pistol, revolver, hand_cannon, burst_pistol,
    smg, compact_smg, suppressed_smg,
    assault_rifle, burst_ar, heavy_ar, thermal_ar,
    shotgun, tactical_shotgun, heavy_shotgun, drum_shotgun,
    sniper, semi_sniper, heavy_sniper, hunting_rifle,
    marksman_rifle,
    lmg,
    rocket_launcher,
    crossbow, minigun, rail_gun,
};

inline const char* weaponTypeName(WeaponType t) {
    switch (t) {
        case WeaponType::pickaxe:          return "Pickaxe";
        case WeaponType::pistol:           return "Pistol";
        case WeaponType::revolver:         return "Revolver";
        case WeaponType::hand_cannon:      return "Hand Cannon";
        case WeaponType::burst_pistol:     return "Burst Pistol";
        case WeaponType::smg:              return "SMG";
        case WeaponType::compact_smg:      return "Compact SMG";
        case WeaponType::suppressed_smg:   return "Suppressed SMG";
        case WeaponType::assault_rifle:    return "Assault Rifle";
        case WeaponType::burst_ar:         return "Burst AR";
        case WeaponType::heavy_ar:         return "Heavy AR";
        case WeaponType::thermal_ar:       return "Thermal AR";
        case WeaponType::shotgun:          return "Shotgun";
        case WeaponType::tactical_shotgun: return "Tactical Shotgun";
        case WeaponType::heavy_shotgun:    return "Heavy Shotgun";
        case WeaponType::drum_shotgun:     return "Drum Shotgun";
        case WeaponType::sniper:           return "Sniper";
        case WeaponType::semi_sniper:      return "Semi Sniper";
        case WeaponType::heavy_sniper:     return "Heavy Sniper";
        case WeaponType::hunting_rifle:    return "Hunting Rifle";
        case WeaponType::marksman_rifle:   return "Marksman Rifle";
        case WeaponType::lmg:              return "LMG";
        case WeaponType::rocket_launcher:  return "Rocket Launcher";
        case WeaponType::crossbow:         return "Crossbow";
        case WeaponType::minigun:          return "Minigun";
        case WeaponType::rail_gun:         return "Rail Gun";
    }
    return "Unknown";
}

enum class Rarity { common, uncommon, rare, epic, legendary };

struct Weapon {
    std::string id;
    WeaponType  type{WeaponType::pickaxe};
    Rarity      rarity{Rarity::common};
    float       damage{0.f};
    float       fireRate{1.f};   // shots per second
    int         magazineSize{1};
    int         currentAmmo{1};
    float       range{100.f};
    float       reloadTime{1000.f}; // ms
    bool        isReloading{false};
};

// ── Building ───────────────────────────────────────────────────────────────────

enum class BuildingMaterial { wood, stone, metal };
enum class BuildPieceType   { wall, floor, ramp };

struct BuildPiece {
    std::string      id;
    BuildPieceType   type{BuildPieceType::wall};
    BuildingMaterial material{BuildingMaterial::wood};
    Vec2             position;
    float            rotation{0.f}; // degrees
    float            health{100.f};
    float            maxHealth{100.f};
    std::string      ownerId;
};

// ── Loot ──────────────────────────────────────────────────────────────────────

struct Materials {
    int wood{0};
    int stone{0};
    int metal{0};
};

struct LootDrop {
    std::string            id;
    Vec2                   position;
    std::optional<Weapon>  weapon;
    int                    ammo{0};
    Materials              materials;
    float                  shield{0.f};
    float                  health{0.f};
};

// ── Player ────────────────────────────────────────────────────────────────────

enum class PlayerStatus { alive, knocked, eliminated };

enum class FractureCoreEffect { cooldown_reduction, damage_amp, ability_mutation };

struct Player {
    std::string  id;
    std::string  name;
    bool         isHuman{false};
    Vec2         position;
    Vec2         velocity;
    float        rotation{0.f};
    float        health{100.f};
    float        maxHealth{100.f};
    float        shield{0.f};
    float        maxShield{100.f};
    PlayerStatus status{PlayerStatus::alive};

    // 3 weapon slots (slot 0 = pickaxe always)
    std::optional<Weapon> weapons[3];
    int activeWeaponSlot{0};

    Materials materials;
    int       kills{0};

    std::string characterId;
    float damageMult{1.f};
    float damageResistance{0.f};
    float killHealAmount{0.f};
    float speedMult{1.f};
    float reloadMult{1.f};

    float           abilityChargeMs{0.f};
    float           abilityActiveMs{0.f};
    AbilityEffectType activeAbilityEffect{AbilityEffectType::none};

    std::optional<FractureCoreEffect> heldCoreEffect;
    float corruptionDps{0.f};
};

// ── Meteor types ──────────────────────────────────────────────────────────────

enum class MeteorType { explosive, gravity, echo };

struct IncomingMeteor {
    std::string id;
    Vec2        position;
    float       timeUntilImpactMs{0.f};
    MeteorType  meteorType{MeteorType::explosive};
};

struct MeteorImpact {
    std::string id;
    Vec2        position;
    float       blastRadius{0.f};
    float       age{0.f};
    float       maxAge{0.f};
    MeteorType  meteorType{MeteorType::explosive};
};

struct FractureCore {
    std::string         id;
    Vec2                position;
    FractureCoreEffect  effect{FractureCoreEffect::damage_amp};
    float               corruptionDps{0.f};
};

struct GravityZone {
    std::string id;
    Vec2        position;
    float       radius{0.f};
    float       pullStrength{0.f};
    float       speedMult{1.f};
    float       age{0.f};
    float       maxAge{0.f};
};

struct TimeEchoZone {
    std::string id;
    Vec2        position;
    float       radius{0.f};
    float       age{0.f};
    float       maxAge{0.f};
};

// ── Map objectives ────────────────────────────────────────────────────────────

struct HelixRelay {
    std::string         id;
    Vec2                position;
    float               captureRadius{80.f};
    float               captureProgress{0.f}; // 0→1
    std::optional<std::string> capturedById;
    float               rewardCooldownMs{0.f};
};

struct SupplyDrop {
    std::string id;
    Vec2        position;
    bool        isLanded{false};
    float       landInMs{0.f};
    float       pickupRadius{0.f};
    WeaponType  weaponType{WeaponType::assault_rifle};
    Rarity      rarity{Rarity::epic};
};

// ── Bombardment ───────────────────────────────────────────────────────────────

struct Bombardment {
    int     currentPhase{0};
    Vec2    shelterCenter;
    float   shelterRadius{800.f};
    Vec2    nextShelterCenter;
    float   nextShelterRadius{500.f};
    bool    isShrinking{false};
    float   shrinkProgress{0.f};
    float   impactDamage{25.f};
    float   impactInterval{8000.f};
    float   timeUntilNextImpact{8000.f};
    float   timeUntilNextPhase{120000.f};
    std::vector<MeteorImpact> activeImpacts;
};

// ── Game phase / result ───────────────────────────────────────────────────────

enum class GamePhase { lobby, dropping, playing, game_over };

struct GameResult {
    int         placement{1};
    int         kills{0};
    float       survivalTimeMs{0.f};
    std::string winner;
};

// ── Full game state ───────────────────────────────────────────────────────────

struct GameState {
    GamePhase   phase{GamePhase::lobby};
    std::string selectedCharacterId;
    std::vector<Player>       players;
    std::vector<BuildPiece>   buildPieces;
    std::vector<LootDrop>     lootDrops;
    Bombardment               bombardment;
    float mapWidth{1600.f};
    float mapHeight{1600.f};
    int   tickCount{0};
    float startTimeMs{0.f};
    std::optional<GameResult> result;
    int   alivePlayers{0};

    std::vector<FractureCore>  fractureCores;
    std::vector<GravityZone>   gravityZones;
    std::vector<TimeEchoZone>  timeEchoZones;
    std::vector<HelixRelay>    helixRelays;
    std::vector<SupplyDrop>    supplyDrops;
    float nextSupplyDropMs{180000.f};

    std::optional<std::string> bountyPlayerId;
    std::optional<std::string> activeQuip;
    float quipTtlMs{0.f};

    std::vector<IncomingMeteor> incomingMeteors;
};
