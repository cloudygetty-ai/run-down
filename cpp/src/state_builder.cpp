#include "state_builder.h"
#include "meteor.h"
#include "characters.h"
#include "balance.h"
#include "utils.h"
#include <climits>
#include <string>

// ── Weapon template table ─────────────────────────────────────────────────────

struct WeaponBase {
    float damage;
    float fireRate;
    int   magazineSize;
    float range;
    float reloadTime;
};

static WeaponBase getWeaponBase(WeaponType type) {
    switch (type) {
        case WeaponType::Pickaxe:         return { 20,   0.9f,  AMMO_INFINITE, 60,   0    };
        case WeaponType::Pistol:          return { 25,   4.0f,  16,            250,  1500 };
        case WeaponType::Revolver:        return { 55,   1.5f,  6,             350,  2000 };
        case WeaponType::HandCannon:      return { 80,   0.75f, 6,             300,  2500 };
        case WeaponType::BurstPistol:     return { 22,   7.0f,  18,            250,  1600 };
        case WeaponType::Smg:             return { 17,   10.0f, 35,            200,  1800 };
        case WeaponType::CompactSmg:      return { 14,   13.0f, 25,            150,  1400 };
        case WeaponType::SuppressedSmg:   return { 18,   9.0f,  30,            220,  1800 };
        case WeaponType::AssaultRifle:    return { 35,   5.0f,  30,            400,  2000 };
        case WeaponType::BurstAR:         return { 32,   4.0f,  27,            380,  2000 };
        case WeaponType::HeavyAR:         return { 45,   3.0f,  20,            420,  2200 };
        case WeaponType::ThermalAR:       return { 38,   4.5f,  25,            500,  2100 };
        case WeaponType::Shotgun:         return { 110,  0.8f,  5,             120,  2500 };
        case WeaponType::TacticalShotgun: return { 72,   1.5f,  8,             130,  2000 };
        case WeaponType::HeavyShotgun:    return { 150,  0.5f,  2,             110,  3500 };
        case WeaponType::DrumShotgun:     return { 50,   2.0f,  12,            100,  3000 };
        case WeaponType::Sniper:          return { 100,  0.5f,  4,             800,  3000 };
        case WeaponType::SemiSniper:      return { 70,   1.5f,  10,            700,  2500 };
        case WeaponType::HeavySniper:     return { 150,  0.3f,  1,             1000, 4000 };
        case WeaponType::HuntingRifle:    return { 65,   1.0f,  8,             550,  2000 };
        case WeaponType::MarksmanRifle:   return { 55,   2.0f,  12,            500,  2200 };
        case WeaponType::Lmg:             return { 25,   8.0f,  100,           350,  4500 };
        case WeaponType::RocketLauncher:  return { 300,  0.2f,  1,             500,  5000 };
        case WeaponType::Crossbow:        return { 95,   0.7f,  6,             600,  2800 };
        case WeaponType::Minigun:         return { 18,   20.0f, 200,           300,  6000 };
        case WeaponType::RailGun:         return { 200,  0.25f, 3,             1200, 5000 };
        default:                          return { 25,   4.0f,  16,            250,  1500 };
    }
}

static float rarityMult(Rarity r) {
    switch (r) {
        case Rarity::Common:    return 1.0f;
        case Rarity::Uncommon:  return 1.1f;
        case Rarity::Rare:      return 1.2f;
        case Rarity::Epic:      return 1.35f;
        case Rarity::Legendary: return 1.5f;
        default:                return 1.0f;
    }
}

static int s_weaponCounter = 0;

static Weapon makeWeapon(WeaponType type, Rarity rarity) {
    WeaponBase b = getWeaponBase(type);
    float mult   = rarityMult(rarity);

    Weapon w;
    w.id           = "weapon_" + std::to_string(++s_weaponCounter);
    w.type         = type;
    w.rarity       = rarity;
    w.damage       = std::round(b.damage * mult);
    w.fireRate     = b.fireRate;
    w.magazineSize = (type == WeaponType::Pickaxe) ? AMMO_INFINITE : b.magazineSize;
    w.currentAmmo  = w.magazineSize;
    w.range        = b.range;
    w.reloadTime   = b.reloadTime;
    w.isReloading  = false;
    return w;
}

static Player makePlayer(const std::string& id, const std::string& name, bool isHuman,
                          const Vector2& pos, const std::string& characterId) {
    const CharacterStats& cs = getCharacter(characterId);
    float maxHealth = 100.0f + cs.maxHealthBonus;
    float maxShield = 100.0f + cs.maxShieldBonus;
    float startShield = isHuman ? std::min(maxShield, cs.startingShield) : 0.0f;
    float baseMat = isHuman ? (100.0f + cs.materialsBonus) : 100.0f;

    Player p;
    p.id         = id;
    p.name       = name;
    p.isHuman    = isHuman;
    p.position   = pos;
    p.velocity   = {0.0f, 0.0f};
    p.rotation   = 0.0f;
    p.health     = maxHealth;
    p.maxHealth  = maxHealth;
    p.shield     = startShield;
    p.maxShield  = maxShield;
    p.status     = PlayerStatus::Alive;
    p.weapons[0] = makeWeapon(WeaponType::Pickaxe, Rarity::Common);
    p.weapons[1] = std::nullopt;
    p.weapons[2] = std::nullopt;
    p.activeWeaponSlot = 0;
    p.materials.wood   = (int)baseMat;
    p.materials.stone  = (int)(50.0f + (isHuman ? cs.materialsBonus : 0.0f));
    p.materials.metal  = (int)(25.0f + (isHuman ? cs.materialsBonus : 0.0f));
    p.kills              = 0;
    p.isBuilding         = false;
    p.selectedBuildPiece = BuildPieceType::Wall;
    p.selectedBuildMaterial = BuildingMaterial::Wood;
    p.characterId        = characterId;
    p.damageMult         = cs.damageMult;
    p.damageResistance   = cs.damageResistance;
    p.killHealAmount     = cs.killHealAmount;
    p.speedMult          = cs.speedMult;
    p.reloadMult         = cs.reloadMult;
    p.abilityChargeMs    = 0.0f;
    p.abilityActiveMs    = 0.0f;
    p.activeAbilityEffect= AbilityEffect::None;
    p.heldCoreEffect     = std::nullopt;
    p.corruptionDps      = 0.0f;
    return p;
}

// Loot weapon types available in the world
static const WeaponType LOOT_WEAPON_TYPES[] = {
    WeaponType::Pistol, WeaponType::Revolver, WeaponType::HandCannon, WeaponType::BurstPistol,
    WeaponType::Smg, WeaponType::CompactSmg, WeaponType::SuppressedSmg,
    WeaponType::AssaultRifle, WeaponType::BurstAR, WeaponType::HeavyAR, WeaponType::ThermalAR,
    WeaponType::Shotgun, WeaponType::TacticalShotgun, WeaponType::HeavyShotgun, WeaponType::DrumShotgun,
    WeaponType::Sniper, WeaponType::SemiSniper, WeaponType::HeavySniper, WeaponType::HuntingRifle,
    WeaponType::MarksmanRifle, WeaponType::Lmg, WeaponType::RocketLauncher,
    WeaponType::Crossbow, WeaponType::Minigun, WeaponType::RailGun,
};
static const int LOOT_WEAPON_COUNT = 25;

static const Rarity LOOT_RARITIES[] = {
    Rarity::Common, Rarity::Common, Rarity::Uncommon, Rarity::Rare, Rarity::Epic, Rarity::Legendary
};
static const int LOOT_RARITY_COUNT = 6;

static std::vector<LootDrop> scatterLoot(int count, float mapWidth, float mapHeight) {
    std::vector<LootDrop> drops;
    drops.reserve(count);
    for (int i = 0; i < count; i++) {
        LootDrop d;
        d.id       = "loot_" + std::to_string(i);
        d.position = { randomInRange(50.0f, mapWidth  - 50.0f),
                       randomInRange(50.0f, mapHeight - 50.0f) };
        WeaponType wt = LOOT_WEAPON_TYPES[randomInt(0, LOOT_WEAPON_COUNT - 1)];
        Rarity     wr = LOOT_RARITIES[randomInt(0, LOOT_RARITY_COUNT - 1)];
        d.weapon   = makeWeapon(wt, wr);
        d.ammo     = randomInt(30, 120);
        d.materials= { randomInt(20, 60), randomInt(10, 30), randomInt(5, 15) };
        d.shield   = (randomInt(0, 1) == 1) ? 50.0f : 0.0f;
        d.health   = (randomInt(0, 1) == 1) ? 25.0f : 0.0f;
        drops.push_back(d);
    }
    return drops;
}

static std::vector<HelixRelay> buildHelixRelays(float mapWidth, float mapHeight) {
    static const float relayPositions[5][2] = {
        { 0.25f, 0.25f }, { 0.75f, 0.25f }, { 0.5f, 0.5f },
        { 0.25f, 0.75f }, { 0.75f, 0.75f },
    };
    std::vector<HelixRelay> relays;
    for (int i = 0; i < 5; i++) {
        HelixRelay r;
        r.id              = "relay_" + std::to_string(i);
        r.position        = { mapWidth * relayPositions[i][0], mapHeight * relayPositions[i][1] };
        r.captureRadius   = 80.0f;
        r.captureProgress = 0.0f;
        r.capturedById    = std::nullopt;
        r.rewardCooldownMs= 0.0f;
        relays.push_back(r);
    }
    return relays;
}

GameState buildInitialState(const std::string& characterId) {
    const float mapW = MAP_WIDTH;
    const float mapH = MAP_HEIGHT;

    // -- Build players --
    std::vector<Player> players;
    players.reserve(1 + BOT_COUNT);

    // Human player (in sim mode there's still a human slot — it just gets zero input)
    players.push_back(makePlayer("human", "You", true,
        { mapW / 2.0f, mapH / 2.0f }, characterId));

    // Bots
    const std::string BOT_CHARS[] = {
        "vex","brutus","nyra","kade","iris","rook","talon","voss",
        "sable","orin","lyric","magnus","eira","jax","kael"
    };
    const int NUM_BOT_CHARS = 15;
    for (int i = 0; i < BOT_COUNT; i++) {
        std::string botCharId = BOT_CHARS[i % NUM_BOT_CHARS];
        players.push_back(makePlayer(
            "bot_" + std::to_string(i),
            "Bot" + std::to_string(i + 1),
            false,
            { randomInRange(100.0f, mapW - 100.0f), randomInRange(100.0f, mapH - 100.0f) },
            botCharId));
    }

    int alive = 0;
    for (const auto& p : players) if (p.status == PlayerStatus::Alive) alive++;

    GameState s;
    s.phase                = GamePhase::Playing;   // sim starts in Playing immediately
    s.selectedCharacterId  = characterId;
    s.players              = std::move(players);
    s.buildPieces          = {};
    s.lootDrops            = scatterLoot(200, mapW, mapH);
    s.bombardment          = createInitialBombardment(mapW, mapH);
    s.mapWidth             = mapW;
    s.mapHeight            = mapH;
    s.tickCount            = 0;
    s.startTimeMs          = 0.0f;
    s.result               = std::nullopt;
    s.alivePlayers         = alive;
    s.fractureCores        = {};
    s.gravityZones         = {};
    s.timeEchoZones        = {};
    s.helixRelays          = buildHelixRelays(mapW, mapH);
    s.supplyDrops          = {};
    s.nextSupplyDropMs     = 3.0f * 60.0f * 1000.0f;
    s.bountyPlayerId       = std::nullopt;
    s.activeQuip           = std::nullopt;
    s.quipTtlMs            = 0.0f;
    s.incomingMeteors      = {};
    return s;
}
