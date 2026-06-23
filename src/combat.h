// src/combat.h — weapons, loot, direct-fire combat, damage, cooldowns
#pragma once
#include "types.h"
#include "world.h"
#include <algorithm>
#include <cmath>
#include <random>
#include <vector>

namespace rd {

// ── Loot table ────────────────────────────────────────────────────────────────
inline const std::vector<Weapon> LOOT_TABLE = {
    { "Pistol",    Rarity::Common,    12, 7.f,  2.0f, 0.15f, 1.5f, 12 },
    { "SMG",       Rarity::Common,     8, 5.f,  5.0f, 0.25f, 2.0f, 25 },
    { "Shotgun",   Rarity::Rare,      32, 3.f,  1.0f, 0.40f, 2.5f, 6  },
    { "AR",        Rarity::Rare,      18, 9.f,  3.0f, 0.10f, 2.0f, 20 },
    { "Sniper",    Rarity::Epic,      60, 16.f, 0.5f, 0.02f, 3.5f, 5  },
    { "Gold SCAR", Rarity::Legendary, 30, 10.f, 4.0f, 0.08f, 1.8f, 25 },
    { "Rocket",    Rarity::Legendary, 80, 8.f,  0.3f, 0.50f, 5.0f, 3  },
};

inline Weapon rollLoot(std::mt19937& rng) {
    std::uniform_int_distribution<int> pct(0, 99);
    int r = pct(rng);
    Rarity wanted =
        r < 45 ? Rarity::Common :
        r < 78 ? Rarity::Rare :
        r < 94 ? Rarity::Epic :
                 Rarity::Legendary;
    std::vector<const Weapon*> pool;
    for (const auto& w : LOOT_TABLE)
        if (w.rarity == wanted) pool.push_back(&w);
    if (pool.empty()) { Weapon fb=LOOT_TABLE.front(); fb.ammo=fb.magSize; return fb; }
    std::uniform_int_distribution<std::size_t> pick(0, pool.size()-1);
    Weapon result = *pool[pick(rng)];
    result.ammo = result.magSize;
    return result;
}

// ── Line of sight (Bresenham) ─────────────────────────────────────────────────
inline bool hasLOS(const World& w, Vec2 a, Vec2 b) {
    int x0=(int)std::floor(a.x), y0=(int)std::floor(a.y);
    int x1=(int)std::floor(b.x), y1=(int)std::floor(b.y);
    int dx=std::abs(x1-x0), dy=-std::abs(y1-y0);
    int sx=x0<x1?1:-1, sy=y0<y1?1:-1, err=dx+dy;
    while (!(x0==x1&&y0==y1)) {
        bool isStart=(x0==(int)std::floor(a.x)&&y0==(int)std::floor(a.y));
        if (!isStart && w.blocksShot(Vec2{(float)x0,(float)y0})) return false;
        int e2=2*err;
        if (e2>=dy){err+=dy;x0+=sx;}
        if (e2<=dx){err+=dx;y0+=sy;}
    }
    return true;
}

// ── Damage calculation ────────────────────────────────────────────────────────
inline int effectiveDamage(const Entity& shooter, const Entity& target, int baseDamage) {
    if (target.ability.active && target.ability.effectType==EffectType::DamageImmunity) return 0;
    float d=(float)baseDamage;
    d *= shooter.passive.damageMult;
    if (shooter.ability.active && shooter.ability.effectType==EffectType::DamageBoost) d*=1.4f;
    d *= std::max(0.f, 1.f-target.passive.damageResistance);
    return std::max(0,(int)std::round(d));
}

inline float effectiveFireRate(const Entity& shooter) {
    float rate=shooter.weapon.fireRate;
    if (shooter.ability.active && shooter.ability.effectType==EffectType::RapidFire) rate*=2.f;
    return std::max(rate, 0.01f);
}

inline void applyDamage(Entity& target, int damage) {
    if (!target.alive||damage<=0) return;
    int shd=std::min(target.shield,damage);
    target.shield-=shd;
    target.hp-=(damage-shd);
    if (target.hp<=0){target.hp=0;target.alive=false;}
}

inline void applyKillReward(Entity& shooter) {
    shooter.kills++;
    if (shooter.passive.killHealAmount>0)
        shooter.hp=std::min(shooter.maxHp, shooter.hp+shooter.passive.killHealAmount);
}

// ── canShoot helper ───────────────────────────────────────────────────────────
inline bool canShoot(const Entity& e) {
    return e.alive && e.shotTimer<=0.f && e.reloadTimer<=0.f && e.weapon.ammo>0;
}

// ── Direct-fire weapon attempt ────────────────────────────────────────────────
inline bool tryShoot(World& w, Entity& shooter, Entity& target, float /*dt*/) {
    if (!shooter.alive||!target.alive||shooter.id==target.id) return false;
    if (shooter.shotTimer>0.f||shooter.reloadTimer>0.f) return false;
    if (shooter.weapon.ammo<=0) {
        shooter.reloadTimer=shooter.weapon.reloadSec*shooter.passive.reloadMult;
        return false;
    }
    if (dist2(shooter.pos,target.pos)>shooter.weapon.range*shooter.weapon.range) return false;
    if (!hasLOS(w,shooter.pos,target.pos)) return false;

    int damage=effectiveDamage(shooter,target,shooter.weapon.damage);
    bool wasAlive=target.alive;
    applyDamage(target,damage);
    if (wasAlive&&!target.alive) applyKillReward(shooter);
    shooter.weapon.ammo--;
    shooter.shotTimer=1.f/effectiveFireRate(shooter);
    if (shooter.weapon.ammo<=0)
        shooter.reloadTimer=shooter.weapon.reloadSec*shooter.passive.reloadMult;
    return true;
}

// ── Entity ticking ────────────────────────────────────────────────────────────
inline void tickEntity(Entity& e, float dt) {
    if (!e.alive) return;
    if (e.shotTimer>0.f)   e.shotTimer   =std::max(0.f,e.shotTimer-dt);
    if (e.reloadTimer>0.f){
        e.reloadTimer-=dt;
        if (e.reloadTimer<=0.f){e.reloadTimer=0.f;e.weapon.ammo=e.weapon.magSize;}
    }
    if (e.ability.cooldownLeft>0.f) e.ability.cooldownLeft=std::max(0.f,e.ability.cooldownLeft-dt);
    if (e.ability.active){
        e.ability.activeLeft-=dt;
        if (e.ability.effectType==EffectType::RapidFire){
            int drain=(int)std::ceil(5.f*dt);
            if (drain>0) e.hp=std::max(1,e.hp-drain);
        }
        if (e.ability.activeLeft<=0.f){e.ability.active=false;e.ability.activeLeft=0.f;}
    }
    if (e.moveTimer>0.f) e.moveTimer=std::max(0.f,e.moveTimer-dt);
    // Fracture core drain
    if (e.hasFractureCore){
        e.fractureDrain+=dt;
        if (e.ability.cooldownLeft>0) e.ability.cooldownLeft=std::max(0.f,e.ability.cooldownLeft-dt*0.5f);
        if (e.fractureDrain>8.f){
            int dmg=(int)(5.f*dt);
            e.hp=std::max(0,e.hp-dmg);
            if (e.hp<=0){e.hp=0;e.alive=false;}
        }
    }
}

// ── Ability activation ────────────────────────────────────────────────────────
inline void activateAbility(Entity& e) {
    if (!e.alive||e.ability.cooldownLeft>0.f||e.ability.active) return;
    e.ability.cooldownLeft=e.ability.cooldownSec;
    // Instant heals
    if (e.characterId=="voss"){e.hp=std::min(e.maxHp,e.hp+80);return;}
    if (e.characterId=="nyra"){e.hp=std::min(e.maxHp,e.hp+60);return;}
    // Instant mats
    if (e.characterId=="orin"){e.mats+=100;return;}
    // Timed abilities
    if (e.ability.durationSec>0.f){e.ability.active=true;e.ability.activeLeft=e.ability.durationSec;}
}

} // namespace rd
