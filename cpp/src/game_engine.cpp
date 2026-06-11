#include "game_engine.h"
#include "meteor.h"
#include "physics.h"
#include "weapons.h"
#include "balance.h"
#include "characters.h"
#include "utils.h"
#include <algorithm>
#include <cmath>
#include <climits>
#include <string>

// ── Internal helpers ──────────────────────────────────────────────────────────

static int countAlive(const GameState& state) {
    int n = 0;
    for (const auto& p : state.players) {
        if (p.status == PlayerStatus::Alive) n++;
    }
    return n;
}

// ── Ability timers ────────────────────────────────────────────────────────────

static void tickAbilityTimers(GameState& state, float deltaMs) {
    for (auto& p : state.players) {
        if (p.status != PlayerStatus::Alive) continue;

        if (p.abilityChargeMs > 0.0f) {
            bool inEchoZone = false;
            for (const auto& z : state.timeEchoZones) {
                if (distance(p.position, z.position) <= z.radius) { inEchoZone = true; break; }
            }
            float chargeRate =
                (p.heldCoreEffect.has_value() && *p.heldCoreEffect == FractureCoreEffect::CooldownReduction
                    ? FRACTURE_CORE_CDR_CHARGE_RATE : 1.0f) *
                (inEchoZone ? ECHO_ZONE_CHARGE_RATE_MULT : 1.0f);
            p.abilityChargeMs = std::max(0.0f, p.abilityChargeMs - deltaMs * chargeRate);
        }

        if (p.abilityActiveMs > 0.0f) {
            float remaining = std::max(0.0f, p.abilityActiveMs - deltaMs);
            p.abilityActiveMs = remaining;
            if (remaining <= 0.0f) p.activeAbilityEffect = AbilityEffect::None;

            // Jax HP drain — floor at 1, cannot self-eliminate
            if (p.characterId == "jax" && p.abilityActiveMs > 0.0f) {
                float drain = (JAX_HP_DRAIN_DPS / 1000.0f) * deltaMs;
                p.health = std::max(1.0f, p.health - drain);
            }
        }
    }
}

// ── Fracture Cores ────────────────────────────────────────────────────────────

static void tickFractureCores(GameState& state, float deltaMs) {
    for (auto& p : state.players) {
        if (p.status != PlayerStatus::Alive) continue;

        // Apply ongoing corruption drain
        if (p.corruptionDps > 0.0f) {
            float drain = (p.corruptionDps / 1000.0f) * deltaMs;
            p.health = std::max(1.0f, p.health - drain);
        }

        // One core per player
        if (p.heldCoreEffect.has_value()) continue;

        for (auto it = state.fractureCores.begin(); it != state.fractureCores.end(); ++it) {
            if (distance(p.position, it->position) <= FRACTURE_CORE_PICKUP_RANGE) {
                p.heldCoreEffect = it->effect;
                p.corruptionDps  = it->corruptionDps;

                if (it->effect == FractureCoreEffect::CooldownReduction) {
                    p.abilityChargeMs = std::floor(p.abilityChargeMs / 2.0f);
                } else if (it->effect == FractureCoreEffect::AbilityMutation) {
                    // WHY: unpredictable — picks a random timed effect for 10s
                    static const AbilityEffect effects[] = {
                        AbilityEffect::SpeedBoost, AbilityEffect::DamageBoost, AbilityEffect::DamageImmunity
                    };
                    p.abilityActiveMs      = 10000.0f;
                    p.activeAbilityEffect  = effects[randomInt(0, 2)];
                }
                state.fractureCores.erase(it);
                break;
            }
        }
    }
}

// ── Gravity Zones ─────────────────────────────────────────────────────────────

static void tickGravityZones(GameState& state, float deltaMs) {
    // Age and expire
    {
        auto& zones = state.gravityZones;
        for (auto& z : zones) z.age += deltaMs;
        zones.erase(std::remove_if(zones.begin(), zones.end(),
            [](const GravityZone& z){ return z.age >= z.maxAge; }), zones.end());
    }

    for (auto& p : state.players) {
        if (p.status != PlayerStatus::Alive) continue;
        for (const auto& zone : state.gravityZones) {
            float dist = distance(p.position, zone.position);
            if (dist <= zone.radius && dist > 0.0f) {
                float pull = (zone.pullStrength / 1000.0f) * deltaMs;
                float dx = zone.position.x - p.position.x;
                float dy = zone.position.y - p.position.y;
                p.position.x = clamp(p.position.x + (dx / dist) * pull, 0.0f, state.mapWidth);
                p.position.y = clamp(p.position.y + (dy / dist) * pull, 0.0f, state.mapHeight);
            }
        }
    }
}

// ── Time Echo Zones ───────────────────────────────────────────────────────────

static void tickTimeEchoZones(GameState& state, float deltaMs) {
    auto& zones = state.timeEchoZones;
    for (auto& z : zones) z.age += deltaMs;
    zones.erase(std::remove_if(zones.begin(), zones.end(),
        [](const TimeEchoZone& z){ return z.age >= z.maxAge; }), zones.end());
    // Speed effect on bots is handled in tickBots via echo zone check in game_engine
    // Charge rate is handled by tickAbilityTimers
}

// ── Helix Relays ──────────────────────────────────────────────────────────────

static int s_lootDropCounter = 0;

static void tickHelixRelays(GameState& state, float deltaMs) {
    for (auto& relay : state.helixRelays) {
        relay.rewardCooldownMs = std::max(0.0f, relay.rewardCooldownMs - deltaMs);

        Player* occupant = nullptr;
        for (auto& p : state.players) {
            if (p.status == PlayerStatus::Alive &&
                distance(p.position, relay.position) <= relay.captureRadius) {
                occupant = &p;
                break;
            }
        }

        if (occupant) {
            relay.captureProgress = std::min(1.0f,
                relay.captureProgress + HELIX_RELAY_CAPTURE_RATE * deltaMs);
            relay.capturedById = occupant->id;

            if (relay.captureProgress >= 1.0f && relay.rewardCooldownMs == 0.0f) {
                LootDrop drop;
                drop.id = "relay_loot_" + std::to_string(++s_lootDropCounter);
                drop.position = {
                    relay.position.x + randomInRange(-HELIX_RELAY_REWARD_LOOT_RADIUS, HELIX_RELAY_REWARD_LOOT_RADIUS),
                    relay.position.y + randomInRange(-HELIX_RELAY_REWARD_LOOT_RADIUS, HELIX_RELAY_REWARD_LOOT_RADIUS),
                };
                drop.ammo      = randomInt(60, 120);
                drop.materials = { randomInt(40, 80), randomInt(30, 60), randomInt(20, 40) };
                drop.shield    = 100.0f;
                drop.health    = 50.0f;
                state.lootDrops.push_back(drop);

                relay.captureProgress  = 0.0f;
                relay.rewardCooldownMs = 60000.0f;
            }
        } else {
            relay.captureProgress = std::max(0.0f,
                relay.captureProgress - HELIX_RELAY_DECAY_RATE * deltaMs);
        }
    }
}

// ── Supply Drops ──────────────────────────────────────────────────────────────

static int s_supplyDropCounter = 0;

static WeaponType randomEpicWeapon() {
    static const WeaponType epic[] = {
        WeaponType::Sniper, WeaponType::HeavySniper, WeaponType::RailGun,
        WeaponType::Minigun, WeaponType::RocketLauncher, WeaponType::HeavyAR,
    };
    return epic[randomInt(0, 5)];
}

static Rarity randomEpicRarity() {
    return (randomInt(0, 1) == 0) ? Rarity::Epic : Rarity::Legendary;
}

static void tickSupplyDrops(GameState& state, float deltaMs) {
    state.nextSupplyDropMs -= deltaMs;
    if (state.nextSupplyDropMs <= 0.0f) {
        SupplyDrop drop;
        drop.id          = "supply_" + std::to_string(++s_supplyDropCounter);
        drop.position    = { randomInRange(100.0f, state.mapWidth  - 100.0f),
                             randomInRange(100.0f, state.mapHeight - 100.0f) };
        drop.isLanded    = false;
        drop.landInMs    = SUPPLY_DROP_LAND_DELAY_MS;
        drop.pickupRadius= SUPPLY_DROP_PICKUP_RADIUS;
        drop.weaponType  = randomEpicWeapon();
        drop.rarity      = randomEpicRarity();
        state.supplyDrops.push_back(drop);
        state.nextSupplyDropMs = SUPPLY_DROP_INTERVAL_MS;
    }

    // Tick landing countdown
    for (auto& drop : state.supplyDrops) {
        if (!drop.isLanded) {
            drop.landInMs -= deltaMs;
            if (drop.landInMs <= 0.0f) {
                drop.landInMs = 0.0f;
                drop.isLanded = true;
            }
        }
    }

    // Check pickup by any nearby player
    state.supplyDrops.erase(std::remove_if(state.supplyDrops.begin(), state.supplyDrops.end(),
        [&](const SupplyDrop& drop) {
            if (!drop.isLanded) return false;
            for (auto& p : state.players) {
                if (p.status != PlayerStatus::Alive) continue;
                if (distance(p.position, drop.position) > drop.pickupRadius) continue;
                // Give weapon to empty slot > 0
                for (int i = 1; i < 3; i++) {
                    if (!p.weapons[i].has_value()) {
                        Weapon w;
                        w.id          = "supply_weapon_" + drop.id;
                        w.type        = drop.weaponType;
                        w.rarity      = drop.rarity;
                        w.damage      = 50.0f;
                        w.fireRate    = 3.0f;
                        w.magazineSize = 20;
                        w.currentAmmo  = 20;
                        w.range       = 400.0f;
                        w.reloadTime  = 2000.0f;
                        w.isReloading = false;
                        p.weapons[i]  = w;
                        break;
                    }
                }
                return true; // consumed
            }
            return false;
        }), state.supplyDrops.end());
}

// ── Bounty ────────────────────────────────────────────────────────────────────

static void updateBounty(GameState& state) {
    Player* topKiller = nullptr;
    for (auto& p : state.players) {
        if (p.status == PlayerStatus::Alive && p.kills >= BOUNTY_KILL_THRESHOLD) {
            if (!topKiller || p.kills > topKiller->kills) topKiller = &p;
        }
    }
    if (!topKiller) {
        state.bountyPlayerId.reset();
    } else {
        state.bountyPlayerId = topKiller->id;
    }
}

// ── Meteor damage / effects ───────────────────────────────────────────────────

static void applyMeteorDamage(GameState& state, const std::vector<MeteorImpact>& impacts) {
    for (auto& p : state.players) {
        if (p.status != PlayerStatus::Alive) continue;
        if (p.activeAbilityEffect == AbilityEffect::DamageImmunity) continue;

        float totalDmg = 0.0f;
        for (const auto& imp : impacts) {
            if (imp.meteorType != MeteorType::Explosive) continue;
            if (distance(p.position, imp.position) <= imp.blastRadius) {
                totalDmg += state.bombardment.impactDamage;
            }
        }
        if (totalDmg == 0.0f) continue;

        float effectiveDmg = std::round(totalDmg * (1.0f - p.damageResistance));
        float absorbed = std::min(p.shield, effectiveDmg);
        p.shield -= absorbed;
        p.health  = std::max(0.0f, p.health - (effectiveDmg - absorbed));
        if (p.health <= 0.0f) p.status = PlayerStatus::Eliminated;
    }
}

static int s_effectCounter = 0;

static void spawnMeteorEffects(GameState& state, const std::vector<MeteorImpact>& impacts) {
    static const FractureCoreEffect coreEffects[] = {
        FractureCoreEffect::CooldownReduction,
        FractureCoreEffect::DamageAmp,
        FractureCoreEffect::AbilityMutation,
    };

    for (const auto& imp : impacts) {
        int id = ++s_effectCounter;
        if (imp.meteorType == MeteorType::Explosive) {
            FractureCore core;
            core.id           = "core_" + std::to_string(id);
            core.position     = imp.position;
            core.effect       = coreEffects[randomInt(0, 2)];
            core.corruptionDps= randomInRange(4.0f, 8.0f);
            state.fractureCores.push_back(core);
        } else if (imp.meteorType == MeteorType::Gravity) {
            GravityZone gz;
            gz.id           = "gzone_" + std::to_string(id);
            gz.position     = imp.position;
            gz.radius       = GRAVITY_ZONE_RADIUS;
            gz.pullStrength = GRAVITY_ZONE_PULL_STRENGTH;
            gz.speedMult    = GRAVITY_ZONE_SPEED_MULT;
            gz.age          = 0.0f;
            gz.maxAge       = GRAVITY_ZONE_MAX_AGE_MS;
            state.gravityZones.push_back(gz);
        } else {
            TimeEchoZone ez;
            ez.id     = "echo_" + std::to_string(id);
            ez.position = imp.position;
            ez.radius  = ECHO_ZONE_RADIUS;
            ez.age     = 0.0f;
            ez.maxAge  = ECHO_ZONE_MAX_AGE_MS;
            state.timeEchoZones.push_back(ez);
        }
    }
}

// ── Win condition ─────────────────────────────────────────────────────────────

static void checkWinCondition(GameState& state) {
    int alive = countAlive(state);
    state.alivePlayers = alive;

    if (alive > 1) return;

    // Find winner (if any)
    Player* winner = nullptr;
    for (auto& p : state.players) {
        if (p.status == PlayerStatus::Alive) { winner = &p; break; }
    }

    // Find human for placement/kills
    Player* human = nullptr;
    for (auto& p : state.players) {
        if (p.isHuman) { human = &p; break; }
    }

    int placement = 1;
    if (human && human->status != PlayerStatus::Alive) {
        // Count how many non-humans are still alive (survived longer)
        int survivedLonger = 0;
        for (const auto& p : state.players) {
            if (!p.isHuman && p.status == PlayerStatus::Alive) survivedLonger++;
        }
        placement = survivedLonger + 1;
    }

    GameResult result;
    result.placement      = placement;
    result.kills          = human ? human->kills : 0;
    result.survivalTimeMs = state.startTimeMs;
    result.winner         = winner ? std::optional<std::string>(winner->name) : std::nullopt;

    state.result = result;
    state.phase  = GamePhase::GameOver;
}

// ── Human movement (no-op in sim — humans zeroed out) ─────────────────────────

static void moveHumanPlayer(GameState& state, const InputState& input, float deltaMs) {
    int humanIndex = -1;
    for (int i = 0; i < (int)state.players.size(); i++) {
        if (state.players[i].isHuman && state.players[i].status == PlayerStatus::Alive) {
            humanIndex = i; break;
        }
    }
    if (humanIndex == -1) return;

    Player& player = state.players[humanIndex];

    float abilitySpeedMult = (player.activeAbilityEffect == AbilityEffect::SpeedBoost)
        ? ABILITY_SPEED_BOOST_MULT : 1.0f;

    bool inGravityZone = false, inEchoZone = false;
    for (const auto& z : state.gravityZones) {
        if (distance(player.position, z.position) <= z.radius) { inGravityZone = true; break; }
    }
    for (const auto& z : state.timeEchoZones) {
        if (distance(player.position, z.position) <= z.radius) { inEchoZone = true; break; }
    }

    float speed = PLAYER_SPEED * player.speedMult * abilitySpeedMult
        * (inGravityZone ? GRAVITY_ZONE_SPEED_MULT : 1.0f)
        * (inEchoZone    ? ECHO_ZONE_SPEED_MULT    : 1.0f)
        * (deltaMs / TICK_RATE_MS);

    Vector2 dir = normalize(input.moveVector);
    Vector2 rawNext = {
        clamp(player.position.x + dir.x * speed, 0.0f, state.mapWidth),
        clamp(player.position.y + dir.y * speed, 0.0f, state.mapHeight),
    };

    Player tmp = player;
    tmp.position = rawNext;
    player.position = resolvePlayerWallCollision(tmp, state.buildPieces);

    if (input.aimVector.x != 0.0f || input.aimVector.y != 0.0f) {
        player.rotation = std::atan2(input.aimVector.y, input.aimVector.x) * (180.0f / 3.14159265f);
    }
    player.isBuilding = input.isBuilding;
}

// ── Main tick ─────────────────────────────────────────────────────────────────

void tickGame(GameState& state, const InputState& humanInput, float deltaMs) {
    if (state.phase != GamePhase::Playing) return;

    tickAbilityTimers(state, deltaMs);
    tickFractureCores(state, deltaMs);
    tickGravityZones(state, deltaMs);
    tickTimeEchoZones(state, deltaMs);
    tickHelixRelays(state, deltaMs);
    tickSupplyDrops(state, deltaMs);
    moveHumanPlayer(state, humanInput, deltaMs);

    // Tick incoming meteors
    auto incomingResult = tickIncomingMeteors(state.incomingMeteors, deltaMs);
    state.incomingMeteors = incomingResult.stillPending;

    // Tick bombardment — spawns new IncomingMeteors
    auto bombResult = tickBombardment(state.bombardment, deltaMs, state.mapWidth, state.mapHeight);
    state.bombardment = bombResult.bombardment;
    for (const auto& m : bombResult.newIncoming) state.incomingMeteors.push_back(m);

    // Add graduated impacts to visual crater list
    for (const auto& imp : incomingResult.newImpacts) {
        state.bombardment.activeImpacts.push_back(imp);
    }

    applyMeteorDamage(state, incomingResult.newImpacts);
    spawnMeteorEffects(state, incomingResult.newImpacts);

    updateBounty(state);
    state.tickCount++;
    state.startTimeMs += deltaMs;

    checkWinCondition(state);
}

// ── fireShot ──────────────────────────────────────────────────────────────────

void fireShot(GameState& state, const std::string& shooterId, const Vector2& targetPos) {
    Player* shooter = nullptr;
    int shooterIdx  = -1;
    for (int i = 0; i < (int)state.players.size(); i++) {
        if (state.players[i].id == shooterId) { shooter = &state.players[i]; shooterIdx = i; break; }
    }
    if (!shooter || shooter->status != PlayerStatus::Alive) return;

    auto& weaponOpt = shooter->weapons[shooter->activeWeaponSlot];
    if (!weaponOpt.has_value()) return;
    Weapon& weapon = *weaponOpt;
    if (weapon.currentAmmo <= 0 || weapon.isReloading) return;

    // Check wall hit
    const BuildPiece* hitPiece = checkBulletHit(shooter->position, targetPos, state.buildPieces);
    if (hitPiece) {
        for (auto& bp : state.buildPieces) {
            if (bp.id == hitPiece->id) {
                bp.health -= weapon.damage;
                break;
            }
        }
        state.buildPieces.erase(std::remove_if(state.buildPieces.begin(), state.buildPieces.end(),
            [](const BuildPiece& bp){ return bp.health <= 0.0f; }), state.buildPieces.end());
        weapon.currentAmmo--;
        return;
    }

    weapon.currentAmmo--;

    // Apply damage to first hit player
    for (int i = 0; i < (int)state.players.size(); i++) {
        Player& target = state.players[i];
        if (target.id == shooterId || target.status != PlayerStatus::Alive) continue;
        if (!isPlayerHitByBullet(shooter->position, targetPos, target)) continue;
        if (target.activeAbilityEffect == AbilityEffect::DamageImmunity) break;

        // Outgoing damage multipliers
        float abilityDamageMult = (state.players[shooterIdx].activeAbilityEffect == AbilityEffect::DamageBoost)
            ? ABILITY_DAMAGE_BOOST_MULT : 1.0f;
        float coreDamageMult = (state.players[shooterIdx].heldCoreEffect.has_value() &&
            *state.players[shooterIdx].heldCoreEffect == FractureCoreEffect::DamageAmp)
            ? FRACTURE_CORE_DAMAGE_AMP : 1.0f;
        float rawDmg = std::round(weapon.damage
            * state.players[shooterIdx].damageMult
            * abilityDamageMult
            * coreDamageMult);

        float dmg = std::round(rawDmg * (1.0f - target.damageResistance));

        if (target.shield > 0.0f) {
            float absorbed = std::min(target.shield, dmg);
            target.shield -= absorbed;
            dmg -= absorbed;
        }
        target.health = std::max(0.0f, target.health - dmg);

        if (target.health <= 0.0f) {
            target.status = PlayerStatus::Eliminated;
            state.players[shooterIdx].kills++;
            float healedHp = std::min(
                state.players[shooterIdx].maxHealth,
                state.players[shooterIdx].health + state.players[shooterIdx].killHealAmount);
            state.players[shooterIdx].health = healedHp;

            // Drop dead player's non-pickaxe weapons as loot
            for (int slot = 0; slot < 3; slot++) {
                auto& wopt = target.weapons[slot];
                if (!wopt.has_value() || wopt->type == WeaponType::Pickaxe) continue;
                LootDrop drop;
                drop.id = "kill_loot_" + target.id + "_s" + std::to_string(slot);
                drop.position = {
                    target.position.x + (slot - 1) * 18.0f,
                    target.position.y + (slot - 1) * 18.0f,
                };
                Weapon droppedW = *wopt;
                droppedW.currentAmmo = droppedW.magazineSize;
                drop.weapon = droppedW;
                state.lootDrops.push_back(drop);
            }

            // Bounty loot
            if (state.bountyPlayerId.has_value() && *state.bountyPlayerId == target.id) {
                LootDrop bountyDrop;
                bountyDrop.id       = "bounty_loot_" + target.id;
                bountyDrop.position = target.position;
                bountyDrop.ammo     = 60;
                bountyDrop.materials= { 80, 60, 40 };
                bountyDrop.shield   = 100.0f;
                bountyDrop.health   = 50.0f;
                state.lootDrops.push_back(bountyDrop);
            }
        }
        break; // hit first player only
    }
}
