// src/physics.h — bullet travel, collision, LOS (ported from repo)
#pragma once
#include "types.h"
#include "world.h"
#include <algorithm>
#include <cmath>
#include <random>
#include <vector>

namespace rd {

constexpr float BULLET_SPEED  = 20.f;
constexpr float BULLET_HIT_R2 = 0.64f;   // 0.8 tile radius
constexpr float EXPLOSION_R2  = 9.f;      // 3 tile radius

struct HitEvent { int targetId; int damage; bool explosive; Vec2 pos; };

// ── Spawn bullet ──────────────────────────────────────────────────────────────
inline Bullet spawnBullet(Vec2 from, Vec2 to, int damage, int ownerId,
                           bool explosive, float spread, std::mt19937& rng) {
    Vec2 dir=(to-from).normalized();
    std::uniform_real_distribution<float> spr(-spread,spread);
    float angle=std::atan2(dir.y,dir.x)+spr(rng);
    Vec2 vel{std::cos(angle)*BULLET_SPEED, std::sin(angle)*BULLET_SPEED};
    float range=explosive?8.f:12.f;
    return Bullet{from,vel,damage,ownerId,range/BULLET_SPEED,true,explosive};
}

// ── Explosion splash ──────────────────────────────────────────────────────────
inline void applyExplosion(std::vector<HitEvent>& hits,
                            const std::vector<Entity>& entities,
                            const Bullet& b, Vec2 impactPos) {
    for (const auto& e:entities) {
        if (!e.alive||e.id==b.ownerId) continue;
        if (dist2(e.pos,impactPos)<=EXPLOSION_R2)
            hits.push_back({e.id,(int)(b.damage*0.7f),true,impactPos});
    }
}

// ── Tick all bullets (substep — no tunneling) ─────────────────────────────────
inline std::vector<HitEvent> tickBullets(std::vector<Bullet>& bullets,
                                          std::vector<Entity>& entities,
                                          World& world, float dt) {
    std::vector<HitEvent> hits;
    for (auto& b:bullets) {
        if (!b.alive) continue;
        b.lifetime-=dt;
        if (b.lifetime<=0.f){b.alive=false;continue;}

        Vec2 start=b.pos, end=b.pos+b.vel*dt;
        float travel=(end-start).length();
        int steps=std::max(1,(int)std::ceil(travel/0.25f));

        for (int i=1;i<=steps;++i) {
            float t=(float)i/(float)steps;
            Vec2 p=start+(end-start)*t;

            if (world.blocksShot(p)) {
                b.alive=false;
                if (b.explosive) applyExplosion(hits,entities,b,p);
                break;
            }
            for (auto& e:entities) {
                if (!e.alive||e.id==b.ownerId) continue;
                if (dist2(p,e.pos)<=BULLET_HIT_R2) {
                    hits.push_back({e.id,b.damage,b.explosive,p});
                    b.alive=false;
                    if (b.explosive) applyExplosion(hits,entities,b,p);
                    break;
                }
            }
            if (!b.alive) break;
            b.pos=p;
        }
    }
    bullets.erase(std::remove_if(bullets.begin(),bullets.end(),[](const Bullet& b){return !b.alive;}),bullets.end());
    return hits;
}

} // namespace rd
