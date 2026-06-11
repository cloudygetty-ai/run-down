#pragma once
#include "utils.h"
#include <string>
#include <vector>
#include <array>
#include <optional>
#include <climits>

// ── Sentinel for infinite ammo (pickaxe) ─────────────────────────────────────
constexpr int AMMO_INFINITE = INT_MAX;

// ── Enums ────────────────────────────────────────────────────────────────────
enum class WeaponType {
    Pickaxe, Pistol, Revolver, HandCannon, BurstPistol,
    Smg, CompactSmg, SuppressedSmg,
    AssaultRifle, BurstAR, HeavyAR, ThermalAR,
    Shotgun, TacticalShotgun, HeavyShotgun, DrumShotgun,
    Sniper, SemiSniper, HeavySniper, HuntingRifle,
    MarksmanRifle, Lmg, RocketLauncher,
    Crossbow, Minigun, RailGun
};

enum class Rarity { Common, Uncommon, Rare, Epic, Legendary };
enum class BuildingMaterial { Wood, Stone, Metal };
enum class MeteorType { Explosive, Gravity, Echo };
enum class FractureCoreEffect { CooldownReduction, DamageAmp, AbilityMutation };
enum class AbilityEffect { None, SpeedBoost, DamageBoost, DamageImmunity, RapidFire };
enum class PlayerStatus { Alive, Eliminated };
enum class GamePhase { Lobby, Dropping, Playing, GameOver };
enum class BuildPieceType { Wall, Floor, Ramp };

// ── Weapon ───────────────────────────────────────────────────────────────────
struct Weapon {
    std::string id;
    WeaponType type        = WeaponType::Pickaxe;
    Rarity     rarity      = Rarity::Common;
    float      damage      = 0.0f;
    float      fireRate    = 1.0f;   // shots per second
    int        magazineSize = 0;
    int        currentAmmo  = 0;
    float      range       = 0.0f;
    float      reloadTime  = 0.0f;   // ms
    bool       isReloading = false;
    // WHY: sim mode uses countdown instead of setTimeout
    float      reloadCountdownMs = 0.0f;
};

// ── Materials map ─────────────────────────────────────────────────────────────
struct Materials {
    int wood  = 0;
    int stone = 0;
    int metal = 0;
};

// ── Player ───────────────────────────────────────────────────────────────────
struct Player {
    std::string id;
    std::string name;
    bool        isHuman       = false;
    Vector2     position;
    Vector2     velocity;
    float       rotation      = 0.0f;
    float       health        = 100.0f;
    float       maxHealth     = 100.0f;
    float       shield        = 0.0f;
    float       maxShield     = 100.0f;
    PlayerStatus status       = PlayerStatus::Alive;

    // 3 weapon slots: slot 0 = always pickaxe
    std::array<std::optional<Weapon>, 3> weapons;
    int  activeWeaponSlot = 0;

    Materials materials;
    int       kills        = 0;
    bool      isBuilding   = false;
    BuildPieceType  selectedBuildPiece    = BuildPieceType::Wall;
    BuildingMaterial selectedBuildMaterial = BuildingMaterial::Wood;

    // Character system
    std::string  characterId;
    float        damageMult       = 1.0f;
    float        damageResistance = 0.0f;
    float        killHealAmount   = 0.0f;
    float        speedMult        = 1.0f;
    float        reloadMult       = 1.0f;
    float        abilityChargeMs  = 0.0f;
    float        abilityActiveMs  = 0.0f;
    AbilityEffect activeAbilityEffect = AbilityEffect::None;

    // Fracture Core
    std::optional<FractureCoreEffect> heldCoreEffect;
    float corruptionDps = 0.0f;
};

// ── Build piece ───────────────────────────────────────────────────────────────
struct BuildPiece {
    std::string      id;
    BuildPieceType   type     = BuildPieceType::Wall;
    BuildingMaterial material = BuildingMaterial::Wood;
    Vector2          position;
    float            rotation  = 0.0f;
    float            health    = 100.0f;
    float            maxHealth = 100.0f;
    std::string      ownerId;
};

// ── Loot drop ─────────────────────────────────────────────────────────────────
struct LootDrop {
    std::string           id;
    Vector2               position;
    std::optional<Weapon> weapon;
    int                   ammo = 0;
    Materials             materials;
    float                 shield = 0.0f;
    float                 health = 0.0f;
};

// ── Meteor types ─────────────────────────────────────────────────────────────
struct IncomingMeteor {
    std::string id;
    Vector2     position;
    float       timeUntilImpactMs = 0.0f;
    MeteorType  meteorType = MeteorType::Explosive;
};

struct MeteorImpact {
    std::string id;
    Vector2     position;
    float       blastRadius = 0.0f;
    float       age         = 0.0f;
    float       maxAge      = 0.0f;
    MeteorType  meteorType  = MeteorType::Explosive;
};

// ── Fracture Core ─────────────────────────────────────────────────────────────
struct FractureCore {
    std::string        id;
    Vector2            position;
    FractureCoreEffect effect;
    float              corruptionDps = 0.0f;
};

// ── Gravity Zone ──────────────────────────────────────────────────────────────
struct GravityZone {
    std::string id;
    Vector2     position;
    float       radius       = 0.0f;
    float       pullStrength = 0.0f;
    float       speedMult    = 1.0f;
    float       age          = 0.0f;
    float       maxAge       = 0.0f;
};

// ── Time Echo Zone ────────────────────────────────────────────────────────────
struct TimeEchoZone {
    std::string id;
    Vector2     position;
    float       radius = 0.0f;
    float       age    = 0.0f;
    float       maxAge = 0.0f;
};

// ── Helix Relay ───────────────────────────────────────────────────────────────
struct HelixRelay {
    std::string              id;
    Vector2                  position;
    float                    captureRadius    = 80.0f;
    float                    captureProgress  = 0.0f;
    std::optional<std::string> capturedById;
    float                    rewardCooldownMs = 0.0f;
};

// ── Supply Drop ───────────────────────────────────────────────────────────────
struct SupplyDrop {
    std::string id;
    Vector2     position;
    bool        isLanded     = false;
    float       landInMs     = 0.0f;
    float       pickupRadius = 0.0f;
    WeaponType  weaponType   = WeaponType::AssaultRifle;
    Rarity      rarity       = Rarity::Epic;
};

// ── Bombardment phase descriptor ─────────────────────────────────────────────
struct BombardmentPhase {
    int     phase          = 1;
    float   shelterRadius  = 800.0f;
    float   impactDamage   = 25.0f;
    float   impactInterval = 8000.0f;
    float   shrinkDuration = 60000.0f;
    float   waitDuration   = 120000.0f;
};

// ── Bombardment ───────────────────────────────────────────────────────────────
struct Bombardment {
    int     currentPhase       = 0;
    Vector2 shelterCenter;
    float   shelterRadius      = 800.0f;
    Vector2 nextShelterCenter;
    float   nextShelterRadius  = 500.0f;
    bool    isShrinking        = false;
    float   shrinkProgress     = 0.0f;
    float   impactDamage       = 25.0f;
    float   impactInterval     = 8000.0f;
    float   timeUntilNextImpact = 8000.0f;
    float   timeUntilNextPhase  = 120000.0f;
    std::vector<MeteorImpact> activeImpacts;
};

// ── Game result ───────────────────────────────────────────────────────────────
struct GameResult {
    int         placement      = 1;
    int         kills          = 0;
    float       survivalTimeMs = 0.0f;
    std::optional<std::string> winner;
};

// ── Full game state ───────────────────────────────────────────────────────────
struct GameState {
    GamePhase   phase           = GamePhase::Lobby;
    std::string selectedCharacterId;

    std::vector<Player>     players;
    std::vector<BuildPiece> buildPieces;
    std::vector<LootDrop>   lootDrops;

    Bombardment bombardment;

    float mapWidth  = 1600.0f;
    float mapHeight = 1600.0f;
    int   tickCount = 0;
    float startTimeMs = 0.0f;   // game time in ms (incremented by deltaMs each tick)

    std::optional<GameResult> result;
    int alivePlayers = 0;

    std::vector<FractureCore>  fractureCores;
    std::vector<GravityZone>   gravityZones;
    std::vector<TimeEchoZone>  timeEchoZones;

    std::vector<HelixRelay>   helixRelays;
    std::vector<SupplyDrop>   supplyDrops;
    float nextSupplyDropMs = 0.0f;

    std::optional<std::string> bountyPlayerId;

    // Quips — skipped in sim (no human), but kept for structural completeness
    std::optional<std::string> activeQuip;
    float quipTtlMs = 0.0f;

    std::vector<IncomingMeteor> incomingMeteors;
};
