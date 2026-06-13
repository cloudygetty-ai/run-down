#pragma once
#include "types.h"
#include "balance.h"
#include "characters.h"
#include "physics.h"
#include "weapons.h"
#include "meteor.h"
#include "utils.h"
#include <vector>
#include <algorithm>
#include <cmath>
#include <string>

// Pure tick function — mirrors GameEngine.ts tickGame().
// No side effects beyond returning a new GameState.

// ── Forward declarations ──────────────────────────────────────────────────────
inline GameState tickAbilityTimers(GameState state, float deltaMs);
inline GameState tickFractureCores(GameState state, float deltaMs);
inline GameState tickGravityZones(GameState state, float deltaMs);
inline GameState tickTimeEchoZones(GameState state, float deltaMs);
inline GameState tickHelixRelays(GameState state, float deltaMs);
inline GameState tickSupplyDrops(GameState state, float deltaMs);
inline GameState tickQuip(GameState state, float deltaMs);
inline GameState applyMeteorDamage(GameState state, const std::vector<MeteorImpact>& impacts);
inline GameState spawnMeteorEffects(GameState state, const std::vector<MeteorImpact>& impacts);
inline GameState triggerMeteorQuip(GameState state, const std::vector<MeteorImpact>& impacts);
inline GameState updateBounty(GameState state);
inline GameState checkWinCondition(GameState state);
inline GameState fireShot(GameState state, const std::string& shooterId, Vec2 targetPos);

// ── Main tick ─────────────────────────────────────────────────────────────────

inline GameState tickGame(GameState state, float deltaMs) {
    if (state.phase != GamePhase::playing) return state;

    state = tickAbilityTimers(state, deltaMs);
    state = tickFractureCores(state, deltaMs);
    state = tickGravityZones(state, deltaMs);
    state = tickTimeEchoZones(state, deltaMs);
    state = tickHelixRelays(state, deltaMs);
    state = tickSupplyDrops(state, deltaMs);
    state = tickQuip(state, deltaMs);

    // Tick incoming meteors — graduate those at 0 into real impacts
    TickIncomingResult incomingResult = tickIncomingMeteors(state.incomingMeteors, deltaMs);
    state.incomingMeteors = incomingResult.stillPending;

    // Tick bombardment — spawns new IncomingMeteors
    TickBombardmentResult bombResult = tickBombardment(state.bombardment, deltaMs,
                                                        state.mapWidth, state.mapHeight);
    state.bombardment = bombResult.bombardment;
    for (auto& m : bombResult.newIncoming)
        state.incomingMeteors.push_back(m);

    // Add graduated impacts to crater list
    for (auto& imp : incomingResult.newImpacts)
        state.bombardment.activeImpacts.push_back(imp);

    state = applyMeteorDamage(state, incomingResult.newImpacts);
    state = spawnMeteorEffects(state, incomingResult.newImpacts);
    state = triggerMeteorQuip(state, incomingResult.newImpacts);
    state = updateBounty(state);
    state.tickCount += 1;
    state = checkWinCondition(state);

    return state;
}

// ── Ability timers ────────────────────────────────────────────────────────────

inline GameState tickAbilityTimers(GameState state, float deltaMs) {
    for (auto& p : state.players) {
        if (p.abilityChargeMs > 0.f) {
            bool inEchoZone = false;
            for (const auto& z : state.timeEchoZones)
                if (dist(p.position, z.position) <= z.radius) { inEchoZone = true; break; }

            float chargeRate =
                (p.heldCoreEffect.has_value() && *p.heldCoreEffect == FractureCoreEffect::cooldown_reduction
                    ? FRACTURE_CORE_CDR_CHARGE_RATE : 1.f)
                * (inEchoZone ? ECHO_ZONE_CHARGE_RATE_MULT : 1.f);

            p.abilityChargeMs = std::max(0.f, p.abilityChargeMs - deltaMs * chargeRate);
        }

        if (p.abilityActiveMs > 0.f) {
            float remaining = std::max(0.f, p.abilityActiveMs - deltaMs);
            p.abilityActiveMs = remaining;
            if (remaining <= 0.f) p.activeAbilityEffect = AbilityEffectType::none;

            // Jax HP drain during Adrenal Override
            const CharacterStats* cs = getCharacter(p.characterId);
            if (cs->id == "jax" && p.abilityActiveMs > 0.f && p.status == PlayerStatus::alive) {
                float drain = (JAX_HP_DRAIN_DPS / 1000.f) * deltaMs;
                p.health = std::max(1.f, p.health - drain); // floor at 1 — can't self-eliminate
            }
        }
    }
    return state;
}

// ── Fracture Cores ────────────────────────────────────────────────────────────

inline Player applyCorePick(Player pl, const FractureCore& core) {
    pl.heldCoreEffect  = core.effect;
    pl.corruptionDps   = core.corruptionDps;

    if (core.effect == FractureCoreEffect::cooldown_reduction)
        pl.abilityChargeMs = std::floor(pl.abilityChargeMs / 2.f);

    if (core.effect == FractureCoreEffect::ability_mutation) {
        static const AbilityEffectType effects[] = {
            AbilityEffectType::speed_boost,
            AbilityEffectType::damage_boost,
            AbilityEffectType::damage_immunity,
        };
        pl.abilityActiveMs     = 10000.f;
        pl.activeAbilityEffect = effects[randomInt(0, 2)];
    }
    return pl;
}

inline GameState tickFractureCores(GameState state, float deltaMs) {
    for (auto& p : state.players) {
        if (p.status != PlayerStatus::alive) continue;

        // Apply ongoing corruption drain
        if (p.corruptionDps > 0.f)
            p.health = std::max(1.f, p.health - (p.corruptionDps / 1000.f) * deltaMs);

        if (p.heldCoreEffect.has_value()) continue; // already holding one

        // Find a nearby core
        for (auto it = state.fractureCores.begin(); it != state.fractureCores.end(); ++it) {
            if (dist(p.position, it->position) <= FRACTURE_CORE_PICKUP_RANGE) {
                p = applyCorePick(p, *it);
                state.fractureCores.erase(it);
                break;
            }
        }
    }
    return state;
}

// ── Gravity zones ─────────────────────────────────────────────────────────────

inline GameState tickGravityZones(GameState state, float deltaMs) {
    // Age and remove expired zones
    std::vector<GravityZone> live;
    for (auto& z : state.gravityZones) {
        z.age += deltaMs;
        if (z.age < z.maxAge) live.push_back(z);
    }
    state.gravityZones = live;

    for (auto& p : state.players) {
        if (p.status != PlayerStatus::alive) continue;
        for (const auto& z : state.gravityZones) {
            float d = dist(p.position, z.position);
            if (d <= z.radius && d > 0.f) {
                float pull = (z.pullStrength / 1000.f) * deltaMs;
                float dx = z.position.x - p.position.x;
                float dy = z.position.y - p.position.y;
                p.position.x = clampf(p.position.x + (dx / d) * pull, 0.f, state.mapWidth);
                p.position.y = clampf(p.position.y + (dy / d) * pull, 0.f, state.mapHeight);
            }
        }
    }
    return state;
}

// ── Time echo zones ───────────────────────────────────────────────────────────

inline GameState tickTimeEchoZones(GameState state, float deltaMs) {
    std::vector<TimeEchoZone> live;
    for (auto& z : state.timeEchoZones) {
        z.age += deltaMs;
        if (z.age < z.maxAge) live.push_back(z);
    }
    state.timeEchoZones = live;
    return state;
}

// ── Helix relays ──────────────────────────────────────────────────────────────

inline GameState tickHelixRelays(GameState state, float deltaMs) {
    for (auto& relay : state.helixRelays) {
        relay.rewardCooldownMs = std::max(0.f, relay.rewardCooldownMs - deltaMs);

        // Find an alive player standing inside the relay
        Player* occupant = nullptr;
        for (auto& p : state.players) {
            if (p.status == PlayerStatus::alive &&
                dist(p.position, relay.position) <= relay.captureRadius)
            {
                occupant = &p;
                break;
            }
        }

        if (occupant) {
            relay.captureProgress = std::min(1.f,
                relay.captureProgress + HELIX_RELAY_CAPTURE_RATE * deltaMs);
            relay.capturedById = occupant->id;

            if (relay.captureProgress >= 1.f && relay.rewardCooldownMs <= 0.f) {
                // Spawn loot around the relay
                LootDrop ld;
                ld.id       = makeId("relay_loot");
                ld.position = {
                    relay.position.x + randomInRange(-HELIX_RELAY_REWARD_LOOT_RADIUS,
                                                      HELIX_RELAY_REWARD_LOOT_RADIUS),
                    relay.position.y + randomInRange(-HELIX_RELAY_REWARD_LOOT_RADIUS,
                                                      HELIX_RELAY_REWARD_LOOT_RADIUS),
                };
                ld.weapon   = std::nullopt;
                ld.ammo     = randomInt(60, 120);
                ld.materials = {randomInt(40, 80), randomInt(30, 60), randomInt(20, 40)};
                ld.shield   = 100.f;
                ld.health   = 50.f;
                state.lootDrops.push_back(ld);
                relay.captureProgress = 0.f;
                relay.rewardCooldownMs = 60000.f;
            }
        } else {
            relay.captureProgress = std::max(0.f,
                relay.captureProgress - HELIX_RELAY_DECAY_RATE * deltaMs);
        }
    }
    return state;
}

// ── Supply drops ──────────────────────────────────────────────────────────────

inline SupplyDrop spawnSupplyDrop(float mapWidth, float mapHeight) {
    static const std::vector<WeaponType> EPIC_WEAPONS = {
        WeaponType::sniper, WeaponType::heavy_sniper, WeaponType::rail_gun,
        WeaponType::minigun, WeaponType::rocket_launcher, WeaponType::heavy_ar,
    };
    static const std::vector<Rarity> RARITIES = {Rarity::epic, Rarity::legendary};

    SupplyDrop drop;
    drop.id          = makeId("supply");
    drop.position    = {randomInRange(100.f, mapWidth - 100.f),
                        randomInRange(100.f, mapHeight - 100.f)};
    drop.isLanded    = false;
    drop.landInMs    = SUPPLY_DROP_LAND_DELAY_MS;
    drop.pickupRadius = SUPPLY_DROP_PICKUP_RADIUS;
    drop.weaponType  = EPIC_WEAPONS[randomInt(0, (int)EPIC_WEAPONS.size() - 1)];
    drop.rarity      = RARITIES[randomInt(0, (int)RARITIES.size() - 1)];
    return drop;
}

inline GameState tickSupplyDrops(GameState state, float deltaMs) {
    state.nextSupplyDropMs -= deltaMs;
    if (state.nextSupplyDropMs <= 0.f) {
        state.supplyDrops.push_back(spawnSupplyDrop(state.mapWidth, state.mapHeight));
        state.nextSupplyDropMs = SUPPLY_DROP_INTERVAL_MS;
    }

    // Land drops in-flight
    for (auto& drop : state.supplyDrops) {
        if (!drop.isLanded) {
            drop.landInMs = std::max(0.f, drop.landInMs - deltaMs);
            if (drop.landInMs <= 0.f) drop.isLanded = true;
        }
    }

    // Check for player pickups of landed drops
    std::vector<std::string> pickedUpIds;
    for (const auto& drop : state.supplyDrops) {
        if (!drop.isLanded) continue;
        for (auto& p : state.players) {
            if (p.status != PlayerStatus::alive) continue;
            if (dist(p.position, drop.position) > drop.pickupRadius) continue;

            // Find empty weapon slot (slot 0 = pickaxe, use 1 or 2)
            int emptySlot = -1;
            for (int i = 1; i < 3; ++i) {
                if (!p.weapons[i].has_value()) { emptySlot = i; break; }
            }
            if (emptySlot == -1) continue;

            Weapon w = makeWeapon(drop.weaponType, drop.rarity);
            w.id = "supply_" + drop.id;
            p.weapons[emptySlot] = w;
            pickedUpIds.push_back(drop.id);
            break;
        }
    }

    // Remove picked-up drops
    if (!pickedUpIds.empty()) {
        state.supplyDrops.erase(
            std::remove_if(state.supplyDrops.begin(), state.supplyDrops.end(),
                [&](const SupplyDrop& d) {
                    return std::find(pickedUpIds.begin(), pickedUpIds.end(), d.id) != pickedUpIds.end();
                }),
            state.supplyDrops.end()
        );
    }

    return state;
}

// ── Quip ──────────────────────────────────────────────────────────────────────

inline GameState tickQuip(GameState state, float deltaMs) {
    if (!state.activeQuip.has_value()) return state;
    state.quipTtlMs -= deltaMs;
    if (state.quipTtlMs <= 0.f) {
        state.activeQuip = std::nullopt;
        state.quipTtlMs  = 0.f;
    }
    return state;
}

inline GameState triggerMeteorQuip(GameState state,
                                    const std::vector<MeteorImpact>& impacts)
{
    if (impacts.empty() || state.activeQuip.has_value()) return state;

    // Find human player
    const Player* human = nullptr;
    for (const auto& p : state.players)
        if (p.isHuman && p.status == PlayerStatus::alive) { human = &p; break; }
    if (!human) return state;

    for (const auto& imp : impacts) {
        if (dist(human->position, imp.position) < 300.f) {
            const CharacterStats* cs = getCharacter(human->characterId);
            state.activeQuip = cs->meteorQuip;
            state.quipTtlMs  = QUIP_DISPLAY_MS;
            break;
        }
    }
    return state;
}

// ── Meteor damage & effects ───────────────────────────────────────────────────

inline GameState applyMeteorDamage(GameState state,
                                    const std::vector<MeteorImpact>& impacts)
{
    for (const auto& imp : impacts) {
        if (imp.meteorType != MeteorType::explosive) continue;
        for (auto& p : state.players) {
            if (p.status != PlayerStatus::alive) continue;
            if (p.activeAbilityEffect == AbilityEffectType::damage_immunity) continue;
            if (dist(p.position, imp.position) > imp.blastRadius) continue;

            float totalDmg = state.bombardment.impactDamage;
            float effective = std::round(totalDmg * (1.f - p.damageResistance));
            float absorbed  = std::min(p.shield, effective);
            p.shield -= absorbed;
            p.health  = std::max(0.f, p.health - (effective - absorbed));
            if (p.health <= 0.f) p.status = PlayerStatus::eliminated;
        }
    }
    return state;
}

inline GameState spawnMeteorEffects(GameState state,
                                     const std::vector<MeteorImpact>& impacts)
{
    static const FractureCoreEffect CORE_EFFECTS[] = {
        FractureCoreEffect::cooldown_reduction,
        FractureCoreEffect::damage_amp,
        FractureCoreEffect::ability_mutation,
    };

    for (const auto& imp : impacts) {
        if (imp.meteorType == MeteorType::explosive) {
            FractureCore core;
            core.id            = "core_" + imp.id;
            core.position      = imp.position;
            core.effect        = CORE_EFFECTS[randomInt(0, 2)];
            core.corruptionDps = randomInRange(4.f, 8.f);
            state.fractureCores.push_back(core);
        } else if (imp.meteorType == MeteorType::gravity) {
            GravityZone gz;
            gz.id            = "gzone_" + imp.id;
            gz.position      = imp.position;
            gz.radius        = GRAVITY_ZONE_RADIUS;
            gz.pullStrength  = GRAVITY_ZONE_PULL_STRENGTH;
            gz.speedMult     = GRAVITY_ZONE_SPEED_MULT;
            gz.age           = 0.f;
            gz.maxAge        = GRAVITY_ZONE_MAX_AGE_MS;
            state.gravityZones.push_back(gz);
        } else {
            TimeEchoZone ez;
            ez.id     = "echo_" + imp.id;
            ez.position = imp.position;
            ez.radius = ECHO_ZONE_RADIUS;
            ez.age    = 0.f;
            ez.maxAge = ECHO_ZONE_MAX_AGE_MS;
            state.timeEchoZones.push_back(ez);
        }
    }
    return state;
}

// ── Bounty ────────────────────────────────────────────────────────────────────

inline GameState updateBounty(GameState state) {
    const Player* top = nullptr;
    for (const auto& p : state.players) {
        if (p.status != PlayerStatus::alive || p.kills < BOUNTY_KILL_THRESHOLD) continue;
        if (!top || p.kills > top->kills) top = &p;
    }
    if (!top) {
        state.bountyPlayerId = std::nullopt;
    } else {
        state.bountyPlayerId = top->id;
    }
    return state;
}

// ── Win condition ─────────────────────────────────────────────────────────────

inline GameState checkWinCondition(GameState state) {
    int aliveCount = 0;
    const Player* lastAlive = nullptr;
    for (const auto& p : state.players) {
        if (p.status == PlayerStatus::alive) { ++aliveCount; lastAlive = &p; }
    }
    state.alivePlayers = aliveCount;

    if (aliveCount <= 1) {
        GameResult res;
        res.placement = 1;
        res.kills     = 0;
        // Find human stats
        for (const auto& p : state.players) {
            if (p.isHuman) {
                res.kills = p.kills;
                if (p.status != PlayerStatus::alive) {
                    // Count bots still alive to determine placement
                    int survivedLonger = 0;
                    for (const auto& q : state.players)
                        if (!q.isHuman && q.status == PlayerStatus::alive) ++survivedLonger;
                    res.placement = survivedLonger + 1;
                }
                break;
            }
        }
        res.winner = lastAlive ? lastAlive->name : "";
        res.survivalTimeMs = nowMs() - state.startTimeMs;
        state.result = res;
        state.phase  = GamePhase::game_over;
    }
    return state;
}

// ── Fire shot ─────────────────────────────────────────────────────────────────

inline GameState fireShot(GameState state, const std::string& shooterId, Vec2 targetPos) {
    // Find shooter
    int shooterIdx = -1;
    for (int i = 0; i < (int)state.players.size(); ++i)
        if (state.players[i].id == shooterId) { shooterIdx = i; break; }
    if (shooterIdx == -1) return state;

    Player& shooter = state.players[shooterIdx];
    if (shooter.status != PlayerStatus::alive) return state;

    int slot = shooter.activeWeaponSlot;
    if (!shooter.weapons[slot].has_value()) return state;
    Weapon& weapon = *shooter.weapons[slot];
    if (weapon.currentAmmo <= 0 || weapon.isReloading) return state;

    // Consume ammo
    weapon.currentAmmo -= 1;

    // Check if bullet hits a wall first
    const BuildPiece* hitPiece = checkBulletHit(shooter.position, targetPos, state.buildPieces);
    if (hitPiece) {
        for (auto& bp : state.buildPieces) {
            if (bp.id == hitPiece->id) {
                bp.health = std::max(0.f, bp.health - weapon.damage);
            }
        }
        state.buildPieces.erase(
            std::remove_if(state.buildPieces.begin(), state.buildPieces.end(),
                [](const BuildPiece& bp){ return bp.health <= 0.f; }),
            state.buildPieces.end()
        );
        return state;
    }

    // Check player hits
    for (int i = 0; i < (int)state.players.size(); ++i) {
        Player& target = state.players[i];
        if (target.id == shooterId || target.status != PlayerStatus::alive) continue;
        if (!isPlayerHitByBullet(shooter.position, targetPos, target)) continue;
        if (target.activeAbilityEffect == AbilityEffectType::damage_immunity) break;

        float abilityDmgMult =
            (shooter.activeAbilityEffect == AbilityEffectType::damage_boost)
                ? ABILITY_DAMAGE_BOOST_MULT : 1.f;
        float coreDmgMult =
            (shooter.heldCoreEffect.has_value() &&
             *shooter.heldCoreEffect == FractureCoreEffect::damage_amp)
                ? FRACTURE_CORE_DAMAGE_AMP : 1.f;

        float rawDmg = std::round(weapon.damage * shooter.damageMult * abilityDmgMult * coreDmgMult);
        float dmg    = std::round(rawDmg * (1.f - target.damageResistance));

        float absorbed = std::min(target.shield, dmg);
        target.shield -= absorbed;
        dmg -= absorbed;
        target.health = std::max(0.f, target.health - dmg);

        if (target.health <= 0.f) {
            target.status = PlayerStatus::eliminated;
            shooter.kills += 1;
            shooter.health = std::min(shooter.maxHealth,
                                       shooter.health + shooter.killHealAmount);

            // Drop eliminated player's weapons as loot
            for (int s = 0; s < 3; ++s) {
                if (!target.weapons[s].has_value()) continue;
                if (target.weapons[s]->type == WeaponType::pickaxe) continue;
                LootDrop ld;
                ld.id       = makeId("kill_loot");
                ld.position = {target.position.x + (s - 1) * 18.f,
                               target.position.y + (s - 1) * 18.f};
                ld.weapon   = target.weapons[s];
                ld.ammo     = 0;
                ld.materials = {0, 0, 0};
                ld.shield   = 0.f;
                ld.health   = 0.f;
                state.lootDrops.push_back(ld);
            }

            // Bounty loot
            if (state.bountyPlayerId.has_value() && *state.bountyPlayerId == target.id) {
                LootDrop bl;
                bl.id       = makeId("bounty_loot");
                bl.position = target.position;
                bl.weapon   = std::nullopt;
                bl.ammo     = 60;
                bl.materials = {80, 60, 40};
                bl.shield   = 100.f;
                bl.health   = 50.f;
                state.lootDrops.push_back(bl);
            }
        }
        break; // bullet hits first valid target only
    }
    return state;
}
