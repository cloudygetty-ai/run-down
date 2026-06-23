// src/ai.h — bot movement, targeting, loot, relays, combat decisions
#pragma once
#include "types.h"
#include "world.h"
#include "combat.h"
#include "physics.h"
#include <algorithm>
#include <cmath>
#include <random>
#include <vector>

namespace rd {

inline Vec2 stepToward(const World& w, Vec2 from, Vec2 to, float speed) {
    Vec2 delta=to-from;
    if (delta.length()<=0.001f) return from;
    Vec2 dir=delta.normalized();
    Vec2 next{from.x+dir.x*speed, from.y+dir.y*speed};
    if (w.walkable(next)) return next;
    Vec2 xOnly{from.x+dir.x*speed, from.y};
    if (w.walkable(xOnly)) return xOnly;
    Vec2 yOnly{from.x, from.y+dir.y*speed};
    if (w.walkable(yOnly)) return yOnly;
    return from;
}

inline Entity* nearestEnemy(Entity& bot, std::vector<Entity>& all, float& outD2) {
    Entity* best=nullptr; outD2=1e9f;
    for (auto& e:all) {
        if (!e.alive||e.id==bot.id) continue;
        float d=dist2(bot.pos,e.pos);
        if (d<outD2){outD2=d;best=&e;}
    }
    return best;
}

inline bool findNearestLoot(const World& world, Vec2 from, Vec2& outPos, float& outD2) {
    outPos=from; outD2=1e9f; bool found=false;
    for (int y=0;y<MAP_H;++y)
        for (int x=0;x<MAP_W;++x) {
            Tile t=world.grid[y][x];
            if (t!=Tile::Loot&&t!=Tile::FractureCore) continue;
            Vec2 p{(float)x,(float)y};
            float d=dist2(from,p);
            if (d<outD2){outD2=d;outPos=p;found=true;}
        }
    return found;
}

inline HelixRelay* nearestRelay(World& world, const Entity& bot, float& outD2) {
    HelixRelay* best=nullptr; outD2=1e9f;
    for (auto& r:world.helixRelays) {
        if (!r.active||r.capturedBy==bot.id||r.cooldown>0.f) continue;
        float d=dist2(bot.pos,r.pos);
        if (d<outD2){outD2=d;best=&r;}
    }
    return best;
}

inline float botMoveSpeed(const Entity& bot) {
    float s=0.10f*bot.passive.speedMult;
    if (bot.ability.active&&bot.ability.effectType==EffectType::RapidFire)     s*=1.35f;
    if (bot.ability.active&&bot.ability.effectType==EffectType::DamageImmunity) s*=1.25f;
    return s;
}

inline bool shouldUseAbility(const World& world, const Entity& bot, const Entity* enemy, float enemyD2) {
    if (!bot.alive||bot.ability.active||bot.ability.cooldownLeft>0.f) return false;
    return (bot.hp<(int)(bot.maxHp*0.35f))
        || (enemy&&enemyD2<49.f)
        || (world.meteorPhase==MeteorPhase::Inbound)
        || world.inStorm(bot.pos);
}

inline bool botCanFireAt(const World& world, const Entity& bot, const Entity& target) {
    if (!bot.alive||!target.alive) return false;
    if (bot.shotTimer>0.f||bot.reloadTimer>0.f||bot.weapon.ammo<=0) return false;
    float r=bot.weapon.range;
    if (dist2(bot.pos,target.pos)>r*r) return false;
    return hasLOS(world,bot.pos,target.pos);
}

inline void botPickupLoot(World& world, Entity& bot) {
    if (!world.inBounds(bot.pos)) return;
    int x=(int)bot.pos.x, y=(int)bot.pos.y;
    Tile& tile=world.grid[y][x];
    if (tile!=Tile::Loot&&tile!=Tile::FractureCore) return;
    Weapon found=rollLoot(world.rng);
    float nv=found.damage*found.range*found.fireRate;
    float cv=bot.weapon.damage*bot.weapon.range*bot.weapon.fireRate;
    if (nv>cv){found.ammo=found.magSize;bot.weapon=found;}
    bot.shield=std::min(bot.maxShield,bot.shield+25);
    bot.mats+=tile==Tile::FractureCore?50:20;
    tile=Tile::Floor;
}

inline void botShoot(Entity& bot, const Entity& target,
                     std::vector<Bullet>& bullets, std::mt19937& rng) {
    if (bot.weapon.ammo<=0) {
        bot.reloadTimer=bot.weapon.reloadSec*bot.passive.reloadMult;
        return;
    }
    bullets.push_back(spawnBullet(
        bot.pos, target.pos,
        bot.weapon.damage, bot.id,
        bot.weapon.name=="Rocket",
        bot.weapon.spread, rng
    ));
    bot.weapon.ammo--;
    bot.shotTimer=1.f/effectiveFireRate(bot);
    if (bot.weapon.ammo<=0)
        bot.reloadTimer=bot.weapon.reloadSec*bot.passive.reloadMult;
}

inline void botThink(
    World& world, Entity& bot, std::vector<Entity>& all,
    std::vector<Bullet>& bullets, std::mt19937& rng, float /*dt*/
) {
    if (!bot.alive||bot.isPlayer) return;

    float enemyD2=1e9f;
    Entity* enemy=nearestEnemy(bot,all,enemyD2);
    Vec2 lootPos=bot.pos; float lootD2=1e9f;
    bool hasLootNearby=findNearestLoot(world,bot.pos,lootPos,lootD2);
    float relayD2=1e9f;
    HelixRelay* relay=nearestRelay(world,bot,relayD2);

    if (shouldUseAbility(world,bot,enemy,enemyD2)) activateAbility(bot);
    if (world.inStorm(bot.pos)){bot.botState=BotState::Flee;bot.botTarget=world.safeCenter;}

    switch (bot.botState) {
        case BotState::Flee:
            bot.botTarget=world.safeCenter;
            if (!world.inStorm(bot.pos)) bot.botState=BotState::Wander;
            break;
        case BotState::Wander:
            if (enemy&&enemyD2<225.f){bot.botState=BotState::Hunt;bot.botTarget=enemy->pos;break;}
            if (relay&&relayD2<400.f){bot.botState=BotState::CaptureRelay;bot.botTarget=relay->pos;break;}
            if (hasLootNearby&&lootD2<100.f){bot.botState=BotState::Loot;bot.botTarget=lootPos;break;}
            if (dist2(bot.pos,bot.botTarget)<2.f) bot.botTarget=world.randomFloor();
            break;
        case BotState::Loot:
            bot.botTarget=lootPos;
            if (!hasLootNearby||dist2(bot.pos,bot.botTarget)<2.f) bot.botState=BotState::Wander;
            if (enemy&&enemyD2<100.f){bot.botState=BotState::Hunt;bot.botTarget=enemy->pos;}
            break;
        case BotState::CaptureRelay:
            if (!relay){bot.botState=BotState::Wander;break;}
            bot.botTarget=relay->pos;
            if (dist2(bot.pos,relay->pos)<2.f) bot.botState=BotState::Wander;
            if (enemy&&enemyD2<64.f){bot.botState=BotState::Hunt;bot.botTarget=enemy->pos;}
            break;
        case BotState::Hunt:
            if (!enemy||!enemy->alive){bot.botState=BotState::Wander;bot.botTarget=world.randomFloor();break;}
            if (enemyD2>625.f){bot.botState=BotState::Wander;break;}
            if (bot.hp+bot.shield<20){bot.botState=BotState::Flee;bot.botTarget=world.safeCenter;break;}
            bot.botTarget=enemy->pos;
            if (botCanFireAt(world,bot,*enemy)) botShoot(bot,*enemy,bullets,rng);
            break;
        case BotState::UseAbility:
            activateAbility(bot);
            bot.botState=BotState::Hunt;
            break;
        default:
            bot.botState=BotState::Wander;
            break;
    }

    if (bot.moveTimer<=0.f){
        bot.pos=stepToward(world,bot.pos,bot.botTarget,botMoveSpeed(bot));
        bot.moveTimer=0.07f;
    }
    botPickupLoot(world,bot);
}

} // namespace rd
