#pragma once
#include "types.h"
#include "balance.h"
#include "characters.h"
#include "weapons.h"
#include "meteor.h"
#include "utils.h"
#include <vector>
#include <string>
#include <cmath>

// Mirrors gameStore.ts: makePlayer, scatterLoot, buildHelixRelays, buildInitialState.

inline Materials makeMaterials(int wood, int stone, int metal) {
    return {wood, stone, metal};
}

inline Player makePlayer(const std::string& id, const std::string& name,
                          bool isHuman, Vec2 position,
                          const std::string& characterId = "vex")
{
    const CharacterStats* cs = getCharacter(characterId);
    const CharacterPassive& p = cs->passive;

    float maxHealth  = 100.f + p.maxHealthBonus;
    float maxShield  = 100.f + p.maxShieldBonus;
    float startShield = isHuman ? std::min(maxShield, p.startingShield) : 0.f;
    int   baseMat    = isHuman ? (int)(100 + p.materialsBonus) : 100;
    int   extraMat   = isHuman ? (int)p.materialsBonus : 0;

    Player pl;
    pl.id          = id;
    pl.name        = name;
    pl.isHuman     = isHuman;
    pl.position    = position;
    pl.velocity    = {0.f, 0.f};
    pl.rotation    = 0.f;
    pl.health      = maxHealth;
    pl.maxHealth   = maxHealth;
    pl.shield      = startShield;
    pl.maxShield   = maxShield;
    pl.status      = PlayerStatus::alive;
    pl.weapons[0]  = makeWeapon(WeaponType::pickaxe, Rarity::common);
    pl.weapons[1]  = std::nullopt;
    pl.weapons[2]  = std::nullopt;
    pl.activeWeaponSlot = 0;
    pl.materials   = {baseMat, 50 + extraMat, 25 + extraMat};
    pl.kills       = 0;
    pl.characterId = characterId;
    pl.damageMult  = p.damageMult;
    pl.damageResistance = p.damageResistance;
    pl.killHealAmount   = p.killHealAmount;
    pl.speedMult   = p.speedMult;
    pl.reloadMult  = p.reloadMult;
    pl.abilityChargeMs  = 0.f;
    pl.abilityActiveMs  = 0.f;
    pl.activeAbilityEffect = AbilityEffectType::none;
    pl.heldCoreEffect  = std::nullopt;
    pl.corruptionDps   = 0.f;
    return pl;
}

inline std::vector<LootDrop> scatterLoot(int count, float mapWidth, float mapHeight) {
    static const std::vector<WeaponType> TYPES = {
        WeaponType::pistol, WeaponType::revolver, WeaponType::hand_cannon, WeaponType::burst_pistol,
        WeaponType::smg, WeaponType::compact_smg, WeaponType::suppressed_smg,
        WeaponType::assault_rifle, WeaponType::burst_ar, WeaponType::heavy_ar, WeaponType::thermal_ar,
        WeaponType::shotgun, WeaponType::tactical_shotgun, WeaponType::heavy_shotgun, WeaponType::drum_shotgun,
        WeaponType::sniper, WeaponType::semi_sniper, WeaponType::heavy_sniper, WeaponType::hunting_rifle,
        WeaponType::marksman_rifle, WeaponType::lmg, WeaponType::rocket_launcher,
        WeaponType::crossbow, WeaponType::minigun, WeaponType::rail_gun,
    };
    static const std::vector<Rarity> RARITIES = {
        Rarity::common, Rarity::common, Rarity::uncommon, Rarity::rare, Rarity::epic, Rarity::legendary
    };

    std::vector<LootDrop> drops;
    drops.reserve(count);
    for (int i = 0; i < count; ++i) {
        LootDrop ld;
        ld.id       = "loot_" + std::to_string(i);
        ld.position = {randomInRange(50.f, mapWidth - 50.f), randomInRange(50.f, mapHeight - 50.f)};
        ld.weapon   = makeWeapon(
            TYPES[randomInt(0, (int)TYPES.size() - 1)],
            RARITIES[randomInt(0, (int)RARITIES.size() - 1)]
        );
        ld.ammo      = randomInt(30, 120);
        ld.materials = {randomInt(20, 60), randomInt(10, 30), randomInt(5, 15)};
        ld.shield    = (randomInt(0, 1) == 1) ? 50.f : 0.f;
        ld.health    = (randomInt(0, 1) == 1) ? 25.f : 0.f;
        drops.push_back(ld);
    }
    return drops;
}

inline std::vector<HelixRelay> buildHelixRelays(float mapWidth, float mapHeight) {
    std::vector<Vec2> positions = {
        {mapWidth * 0.25f, mapHeight * 0.25f},
        {mapWidth * 0.75f, mapHeight * 0.25f},
        {mapWidth * 0.5f,  mapHeight * 0.5f},
        {mapWidth * 0.25f, mapHeight * 0.75f},
        {mapWidth * 0.75f, mapHeight * 0.75f},
    };
    std::vector<HelixRelay> relays;
    for (int i = 0; i < (int)positions.size(); ++i) {
        HelixRelay r;
        r.id              = "relay_" + std::to_string(i);
        r.position        = positions[i];
        r.captureRadius   = 80.f;
        r.captureProgress = 0.f;
        r.capturedById    = std::nullopt;
        r.rewardCooldownMs = 0.f;
        relays.push_back(r);
    }
    return relays;
}

inline GameState buildInitialState(const std::string& characterId = "vex") {
    Player human = makePlayer("human", "You", true,
        {MAP_WIDTH / 2.f, MAP_HEIGHT / 2.f}, characterId);

    std::vector<Player> players;
    players.push_back(human);
    players.reserve(1 + BOT_COUNT);
    for (int i = 0; i < BOT_COUNT; ++i) {
        players.push_back(makePlayer(
            "bot_" + std::to_string(i),
            "Bot" + std::to_string(i + 1),
            false,
            {randomInRange(100.f, MAP_WIDTH - 100.f), randomInRange(100.f, MAP_HEIGHT - 100.f)}
        ));
    }

    GameState gs;
    gs.phase               = GamePhase::playing; // start in playing for simulation
    gs.selectedCharacterId = characterId;
    gs.players             = players;
    gs.buildPieces         = {};
    gs.lootDrops           = scatterLoot(200, MAP_WIDTH, MAP_HEIGHT);
    gs.bombardment         = createInitialBombardment(MAP_WIDTH, MAP_HEIGHT);
    gs.mapWidth            = MAP_WIDTH;
    gs.mapHeight           = MAP_HEIGHT;
    gs.tickCount           = 0;
    gs.startTimeMs         = nowMs();
    gs.result              = std::nullopt;
    gs.alivePlayers        = (int)players.size();
    gs.fractureCores       = {};
    gs.gravityZones        = {};
    gs.timeEchoZones       = {};
    gs.helixRelays         = buildHelixRelays(MAP_WIDTH, MAP_HEIGHT);
    gs.supplyDrops         = {};
    gs.nextSupplyDropMs    = SUPPLY_DROP_INTERVAL_MS;
    gs.bountyPlayerId      = std::nullopt;
    gs.activeQuip          = std::nullopt;
    gs.quipTtlMs           = 0.f;
    gs.incomingMeteors     = {};
    return gs;
}
