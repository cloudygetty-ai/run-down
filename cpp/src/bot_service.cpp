#include "bot_service.h"
#include "game_engine.h"
#include "weapons.h"
#include "balance.h"
#include "utils.h"
#include <unordered_map>
#include <cmath>
#include <climits>

// Per-bot mutable state. Lives outside game state — AI is ephemeral.
struct BotBrain {
    float   lastFireTimeMs = 0.0f;
    Vector2 wanderTarget   = {0.0f, 0.0f};
    float   wanderTimer    = 0.0f;   // ms until picking a new wander target
    bool    hasWanderTarget = false;
};

// WHY: static map — bots keep their brains across ticks without copying into GameState.
static std::unordered_map<std::string, BotBrain> s_brains;

static BotBrain& getBrain(const std::string& botId) {
    return s_brains[botId];   // default-constructs if absent
}

void clearBotBrains() {
    s_brains.clear();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

static Player* findPlayerById(GameState& state, const std::string& id) {
    for (auto& p : state.players) {
        if (p.id == id) return &p;
    }
    return nullptr;
}

static Player* findNearestEnemy(GameState& state, const Player& bot) {
    Player* nearest = nullptr;
    float minDist = 1e30f;
    for (auto& p : state.players) {
        if (p.id == bot.id || p.status != PlayerStatus::Alive) continue;
        float d = distance(bot.position, p.position);
        if (d < minDist) {
            minDist = d;
            nearest = &p;
        }
    }
    return nearest;
}

static void moveBot(GameState& state, Player& bot, const Vector2& target, float deltaMs) {
    Vector2 dir = normalize({ target.x - bot.position.x, target.y - bot.position.y });
    float speed = BOT_SPEED * bot.speedMult * (deltaMs / TICK_RATE_MS);
    float dist  = distance(bot.position, target);

    if (dist < speed) {
        bot.position = target;
        bot.rotation = 0.0f;
    } else {
        bot.position.x = clamp(bot.position.x + dir.x * speed, 0.0f, state.mapWidth);
        bot.position.y = clamp(bot.position.y + dir.y * speed, 0.0f, state.mapHeight);
        bot.rotation   = std::atan2(dir.y, dir.x) * (180.0f / 3.14159265f);
    }
}

// Compute aim point with random spread
static Vector2 computeAimPoint(const Vector2& /*from*/, const Vector2& to, const Weapon& weapon) {
    float s = weaponSpread(weapon.type);
    Vector2 aim;
    aim.x = to.x + (randomInRange(-0.5f, 0.5f)) * s;
    aim.y = to.y + (randomInRange(-0.5f, 0.5f)) * s;
    return aim;
}

static void pickUpLootForBot(GameState& state, Player& bot, const std::string& lootId) {
    for (auto it = state.lootDrops.begin(); it != state.lootDrops.end(); ++it) {
        if (it->id != lootId) continue;
        const LootDrop& loot = *it;

        if (loot.weapon.has_value()) {
            // Find empty slot > 0
            for (int i = 1; i < 3; i++) {
                if (!bot.weapons[i].has_value()) {
                    bot.weapons[i] = loot.weapon;
                    break;
                }
            }
        }
        bot.shield   = std::min(bot.maxShield,   bot.shield   + loot.shield);
        bot.health   = std::min(bot.maxHealth,   bot.health   + loot.health);
        bot.materials.wood  += loot.materials.wood;
        bot.materials.stone += loot.materials.stone;
        bot.materials.metal += loot.materials.metal;

        state.lootDrops.erase(it);
        return;
    }
}

static void tickSingleBot(GameState& state, const std::string& botId, float nowMs, float deltaMs) {
    Player* bot = findPlayerById(state, botId);
    if (!bot || bot->status != PlayerStatus::Alive) return;

    BotBrain& brain = getBrain(botId);

    // Tick weapon reload for all weapon slots
    for (auto& wslot : bot->weapons) {
        if (wslot.has_value()) {
            applyReloadTick(*wslot, deltaMs, bot->reloadMult);
        }
    }

    // Priority 1: get inside shelter zone
    if (!isInsideCircle(bot->position, state.bombardment.shelterCenter,
                        state.bombardment.shelterRadius)) {
        moveBot(state, *bot, state.bombardment.shelterCenter, deltaMs);
        return;
    }

    // Priority 2: engage nearest enemy
    Player* enemy = findNearestEnemy(state, *bot);
    if (enemy && distance(bot->position, enemy->position) < BOT_AGGRO_RANGE) {
        moveBot(state, *bot, enemy->position, deltaMs);

        const auto& weaponOpt = bot->weapons[bot->activeWeaponSlot];
        if (weaponOpt.has_value()) {
            const Weapon& weapon = *weaponOpt;
            if (distance(bot->position, enemy->position) < BOT_SHOOT_RANGE) {
                if (canFire(weapon, brain.lastFireTimeMs, nowMs)) {
                    brain.lastFireTimeMs = nowMs;
                    Vector2 aim = computeAimPoint(bot->position, enemy->position, weapon);
                    // fireShot may invalidate bot pointer — refresh after call
                    std::string bid = botId;
                    fireShot(state, bid, aim);
                    // Re-fetch bot in case vector reallocated
                    bot = findPlayerById(state, botId);
                    if (!bot) return;
                }
                // Start reload if empty
                auto& wopt2 = bot->weapons[bot->activeWeaponSlot];
                if (wopt2.has_value() && wopt2->currentAmmo <= 0 && !wopt2->isReloading
                    && wopt2->type != WeaponType::Pickaxe) {
                    wopt2->isReloading        = true;
                    wopt2->reloadCountdownMs  = wopt2->reloadTime * bot->reloadMult;
                }
            }
        }
        return;
    }

    // Priority 3: pick up nearby loot
    for (const auto& loot : state.lootDrops) {
        if (distance(bot->position, loot.position) < BOT_LOOT_RANGE) {
            std::string lid = loot.id;
            pickUpLootForBot(state, *bot, lid);
            return;
        }
    }

    // Priority 4: wander
    brain.wanderTimer -= deltaMs;
    if (!brain.hasWanderTarget || brain.wanderTimer <= 0.0f) {
        brain.wanderTarget.x = clamp(bot->position.x + randomInRange(-200.0f, 200.0f), 50.0f, state.mapWidth  - 50.0f);
        brain.wanderTarget.y = clamp(bot->position.y + randomInRange(-200.0f, 200.0f), 50.0f, state.mapHeight - 50.0f);
        brain.wanderTimer      = randomInRange(2000.0f, 6000.0f);
        brain.hasWanderTarget  = true;
    }
    moveBot(state, *bot, brain.wanderTarget, deltaMs);
}

void tickBots(GameState& state, float deltaMs) {
    // Use simulated time from state (not wall clock) so sim is deterministic
    float nowMs = state.startTimeMs;

    // Collect bot ids first — tickSingleBot may mutate players vector
    std::vector<std::string> botIds;
    for (const auto& p : state.players) {
        if (!p.isHuman && p.status == PlayerStatus::Alive) {
            botIds.push_back(p.id);
        }
    }

    for (const auto& id : botIds) {
        tickSingleBot(state, id, nowMs, deltaMs);
    }
}
