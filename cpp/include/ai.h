#pragma once
#include "types.h"
#include "balance.h"
#include "engine.h"
#include "weapons.h"
#include "utils.h"
#include <unordered_map>
#include <string>
#include <vector>
#include <cmath>
#include <algorithm>

// Bot AI — mirrors BotService.ts tickBots / tickSingleBot logic.
// Bot brains are mutable per-bot state kept outside pure GameState.

struct BotBrain {
    float lastFireMs{0.f};
    Vec2  wanderTarget{0.f, 0.f};
    float wanderTimer{0.f}; // ms until picking a new wander target
};

// Global brain map (keyed by bot id)
inline std::unordered_map<std::string, BotBrain>& botBrains() {
    static std::unordered_map<std::string, BotBrain> brains;
    return brains;
}

inline BotBrain& getBrain(const std::string& botId) {
    return botBrains()[botId];
}

inline void clearBotBrains() {
    botBrains().clear();
}

// Find the nearest alive enemy (not the bot itself)
inline const Player* findNearestEnemy(const Player& bot, const std::vector<Player>& players) {
    const Player* nearest = nullptr;
    float minD = 1e30f;
    for (const auto& p : players) {
        if (p.id == bot.id || p.status != PlayerStatus::alive) continue;
        float d = dist(bot.position, p.position);
        if (d < minD) { minD = d; nearest = &p; }
    }
    return nearest;
}

inline GameState updateBotPosition(GameState state, const std::string& botId,
                                    Vec2 pos, float rotation)
{
    for (auto& p : state.players)
        if (p.id == botId) { p.position = pos; p.rotation = rotation; break; }
    return state;
}

inline GameState moveBot(GameState state, const Player& bot, Vec2 target, float deltaMs) {
    Vec2 dir = normalize({target.x - bot.position.x, target.y - bot.position.y});
    float speed = BOT_SPEED * bot.speedMult * (deltaMs / TICK_RATE_MS);
    float d = dist(bot.position, target);

    if (d < speed) {
        return updateBotPosition(state, bot.id, target, 0.f);
    }

    Vec2 newPos = {
        clampf(bot.position.x + dir.x * speed, 0.f, state.mapWidth),
        clampf(bot.position.y + dir.y * speed, 0.f, state.mapHeight),
    };
    float rotation = std::atan2(dir.y, dir.x) * (180.f / 3.14159265f);
    return updateBotPosition(state, bot.id, newPos, rotation);
}

inline GameState pickUpLootForBot(GameState state, const std::string& botId,
                                   const std::string& lootId)
{
    Player* bot = nullptr;
    for (auto& p : state.players)
        if (p.id == botId) { bot = &p; break; }
    if (!bot) return state;

    LootDrop* loot = nullptr;
    for (auto& l : state.lootDrops)
        if (l.id == lootId) { loot = &l; break; }
    if (!loot) return state;

    if (loot->weapon.has_value()) {
        for (int i = 1; i < 3; ++i) {
            if (!bot->weapons[i].has_value()) {
                bot->weapons[i] = loot->weapon;
                break;
            }
        }
    }
    bot->shield   = std::min(bot->maxShield, bot->shield + loot->shield);
    bot->health   = std::min(bot->maxHealth, bot->health + loot->health);
    bot->materials.wood  += loot->materials.wood;
    bot->materials.stone += loot->materials.stone;
    bot->materials.metal += loot->materials.metal;

    state.lootDrops.erase(
        std::remove_if(state.lootDrops.begin(), state.lootDrops.end(),
            [&lootId](const LootDrop& l){ return l.id == lootId; }),
        state.lootDrops.end()
    );
    return state;
}

inline GameState tickSingleBot(GameState state, const std::string& botId,
                                float nowMs_, float deltaMs)
{
    const Player* botPtr = nullptr;
    for (const auto& p : state.players)
        if (p.id == botId) { botPtr = &p; break; }
    if (!botPtr || botPtr->status != PlayerStatus::alive) return state;

    const Player bot = *botPtr; // copy for reading
    BotBrain& brain  = getBrain(botId);

    // Priority 1: seek shelter zone if outside bombardment
    if (!isInsideCircle(bot.position, state.bombardment.shelterCenter,
                         state.bombardment.shelterRadius))
    {
        return moveBot(state, bot, state.bombardment.shelterCenter, deltaMs);
    }

    // Priority 2: engage nearest enemy
    const Player* enemy = findNearestEnemy(bot, state.players);
    if (enemy && dist(bot.position, enemy->position) < BOT_AGGRO_RANGE) {
        // WHY: copy position before moveBot — pointer is dangling after state
        // is replaced by value (old players vector freed via move-assignment).
        Vec2 enemyPos = enemy->position;
        float engageDist = dist(bot.position, enemyPos);

        // WHY: stop 60 units out — prevents bots occupying the exact same position,
        // which produces a zero-length shot that never registers a hit.
        if (engageDist > 60.f) {
            state = moveBot(state, bot, enemyPos, deltaMs);
        }

        // Re-fetch bot after potential move
        const Player* botAfter = nullptr;
        for (const auto& p : state.players)
            if (p.id == botId) { botAfter = &p; break; }
        if (!botAfter) return state;

        // Prefer a real weapon (slot 1 or 2) over the default pickaxe (slot 0)
        int slot = 0;
        for (int s = 1; s < 3; ++s)
            if (botAfter->weapons[s].has_value()) { slot = s; break; }

        if (botAfter->weapons[slot].has_value()) {
            const Weapon& w = *botAfter->weapons[slot];
            if (dist(botAfter->position, enemyPos) < BOT_SHOOT_RANGE &&
                canFire(w, brain.lastFireMs, nowMs_))
            {
                brain.lastFireMs = nowMs_;
                // Sync active slot so fireShot picks the right weapon
                for (auto& p : state.players)
                    if (p.id == botId) { p.activeWeaponSlot = slot; break; }
                Vec2 aimPt = computeAimPoint(botAfter->position, enemyPos, w);
                state = fireShot(state, botId, aimPt);
            }
        }
        return state;
    }

    // Priority 3: pick up nearby loot
    for (const auto& loot : state.lootDrops) {
        if (dist(bot.position, loot.position) < BOT_LOOT_RANGE) {
            return pickUpLootForBot(state, botId, loot.id);
        }
    }

    // Priority 4: wander
    brain.wanderTimer -= deltaMs;
    if (brain.wanderTimer <= 0.f || (brain.wanderTarget.x == 0.f && brain.wanderTarget.y == 0.f)) {
        brain.wanderTarget = {
            clampf(bot.position.x + randomInRange(-200.f, 200.f), 50.f, state.mapWidth  - 50.f),
            clampf(bot.position.y + randomInRange(-200.f, 200.f), 50.f, state.mapHeight - 50.f),
        };
        brain.wanderTimer = randomInRange(2000.f, 6000.f);
    }
    return moveBot(state, bot, brain.wanderTarget, deltaMs);
}

inline GameState tickBots(GameState state, float deltaMs) {
    // WHY: use simulated tick time, not wall-clock nowMs(). Wall clock in float
    // loses precision at epoch scale (~1.75e12 ms), making canFire() always false.
    float now = static_cast<float>(state.tickCount) * TICK_RATE_MS;
    // Collect bot ids first to avoid iterator invalidation
    std::vector<std::string> botIds;
    for (const auto& p : state.players)
        if (!p.isHuman && p.status == PlayerStatus::alive) botIds.push_back(p.id);

    for (const auto& id : botIds)
        state = tickSingleBot(state, id, now, deltaMs);

    return state;
}
