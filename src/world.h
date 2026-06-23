// src/world.h — map generation, safe zone, meteors, relays, fracture cores
#pragma once
#include "types.h"
#include <algorithm>
#include <cmath>
#include <random>
#include <vector>

namespace rd {

constexpr int MAP_W = 72;
constexpr int MAP_H = 32;

class World {
public:
    Tile grid[MAP_H][MAP_W];

    Vec2  safeCenter   { MAP_W/2.f, MAP_H/2.f };
    float safeRadius   = 40.f;
    float safeDamage   = 1.5f;
    float safeTimer    = 0.f;

    MeteorPhase meteorPhase = MeteorPhase::Calm;
    float meteorTimer  = 0.f;
    float nextPhaseIn  = 35.f;
    int   meteorCount  = 0;
    int   relaysCaptured = 0;

    std::vector<MeteorStrike> strikes;
    std::vector<FractureCore> fractureCores;
    std::vector<HelixRelay>   helixRelays;

    std::mt19937 rng;

    explicit World(unsigned seed) : rng(seed) { generate(); }

    bool inBounds(Vec2 p) const {
        return p.x>=0.f&&p.x<(float)MAP_W&&p.y>=0.f&&p.y<(float)MAP_H;
    }
    bool inBoundsCell(int x, int y) const { return x>=0&&x<MAP_W&&y>=0&&y<MAP_H; }

    Tile tileAt(Vec2 p) const {
        if (!inBounds(p)) return Tile::Wall;
        return grid[(int)p.y][(int)p.x];
    }
    Tile& tileRef(Vec2 p) { return grid[(int)p.y][(int)p.x]; }

    bool walkable(Vec2 p) const {
        if (!inBounds(p)) return false;
        Tile t=tileAt(p);
        return t==Tile::Floor||t==Tile::Loot||t==Tile::Crater||t==Tile::Relay||t==Tile::FractureCore;
    }
    bool blocksShot(Vec2 p) const {
        if (!inBounds(p)) return true;
        Tile t=tileAt(p);
        return t==Tile::Wall||t==Tile::Tree||t==Tile::Built;
    }
    bool inStorm(Vec2 p) const { return dist2(p,safeCenter)>safeRadius*safeRadius; }

    // ── Generation ────────────────────────────────────────────────────────────
    void generate() {
        fractureCores.clear(); helixRelays.clear(); strikes.clear();
        fill(Tile::Floor); makeBorders();
        placeCompounds(7); placeTrees(120); placeLoot(35); placeRelays();
    }
    void fill(Tile tile) { for(int y=0;y<MAP_H;y++) for(int x=0;x<MAP_W;x++) grid[y][x]=tile; }
    void makeBorders() {
        for(int x=0;x<MAP_W;x++){grid[0][x]=Tile::Wall;grid[MAP_H-1][x]=Tile::Wall;}
        for(int y=0;y<MAP_H;y++){grid[y][0]=Tile::Wall;grid[y][MAP_W-1]=Tile::Wall;}
    }

    int   randInt(int a, int b)     { return std::uniform_int_distribution<int>(a,b)(rng); }
    float randFloat(float a,float b){ return std::uniform_real_distribution<float>(a,b)(rng); }

    void placeCompounds(int count) {
        for(int c=0;c<count;c++){
            int cx=randInt(6,MAP_W-7), cy=randInt(4,MAP_H-5);
            for(int y=cy-2;y<=cy+2;y++)
                for(int x=cx-5;x<=cx+5;x++)
                    if(inBoundsCell(x,y)&&randInt(0,99)<55) grid[y][x]=Tile::Wall;
            for(int i=0;i<3;i++){
                int lx=cx+randInt(-2,2), ly=cy+randInt(-1,1);
                if(inBoundsCell(lx,ly)) grid[ly][lx]=Tile::Loot;
            }
        }
    }
    void placeTrees(int count) {
        for(int i=0;i<count;i++){
            int x=randInt(2,MAP_W-3), y=randInt(2,MAP_H-3);
            if(grid[y][x]==Tile::Floor) grid[y][x]=Tile::Tree;
        }
    }
    void placeLoot(int count) { for(int i=0;i<count;i++){Vec2 p=randomFloor();tileRef(p)=Tile::Loot;} }
    void placeRelays() {
        std::vector<Vec2> pos={{MAP_W*0.25f,MAP_H*0.50f},{MAP_W*0.75f,MAP_H*0.50f},{MAP_W*0.50f,MAP_H*0.25f}};
        for(auto p:pos){
            Vec2 rp=snapToFloor(p);
            tileRef(rp)=Tile::Relay;
            helixRelays.push_back({rp,-1,0.f,5.f,true,0.f});
        }
    }

    Vec2 snapToFloor(Vec2 p) const {
        for(int r=0;r<=8;r++)
            for(int dy=-r;dy<=r;dy++)
                for(int dx=-r;dx<=r;dx++){
                    int x=(int)p.x+dx, y=(int)p.y+dy;
                    if(inBoundsCell(x,y)&&grid[y][x]==Tile::Floor)
                        return {(float)x,(float)y};
                }
        return {MAP_W/2.f,MAP_H/2.f};
    }

    Vec2 randomFloor() {
        for(int t=0;t<500;t++){
            Vec2 p{(float)randInt(1,MAP_W-2),(float)randInt(1,MAP_H-2)};
            if(walkable(p)) return p;
        }
        return snapToFloor({MAP_W/2.f,MAP_H/2.f});
    }

    // ── Damage helpers ────────────────────────────────────────────────────────
    void damageEntity(Entity& e, int damage) {
        if(!e.alive||damage<=0) return;
        if(e.ability.active&&e.ability.effectType==EffectType::DamageImmunity) return;
        int shd=std::min(e.shield,damage);
        e.shield-=shd; e.hp-=(damage-shd);
        if(e.hp<=0){e.hp=0;e.alive=false;}
    }
    int resistedDamage(const Entity& e, float amount) const {
        float res=std::clamp(e.passive.damageResistance,0.f,0.95f);
        return std::max(0,(int)std::round(amount*(1.f-res)));
    }

    // ── Meteor 6-phase ────────────────────────────────────────────────────────
    void tickMeteor(float dt, std::vector<Entity>& entities) {
        meteorTimer+=dt;
        float delay=relaysCaptured*8.f;
        switch(meteorPhase){
            case MeteorPhase::Calm:
                if(meteorTimer>=nextPhaseIn+delay) enterPhase(MeteorPhase::Warning,entities);
                break;
            case MeteorPhase::Warning:
                if(meteorTimer>=5.f) enterPhase(MeteorPhase::Inbound,entities);
                break;
            case MeteorPhase::Inbound:
                tickStrikes(dt,entities,10,false);
                if(meteorTimer>=9.f) enterPhase(MeteorPhase::Impact,entities);
                break;
            case MeteorPhase::Impact:
                if(meteorTimer>=3.f) enterPhase(MeteorPhase::Aftershock,entities);
                break;
            case MeteorPhase::Aftershock:
                tickStrikes(dt,entities,6,true);
                if(meteorTimer>=5.f) enterPhase(MeteorPhase::Clear,entities);
                break;
            case MeteorPhase::Clear:
                if(meteorTimer>=10.f){finishMeteorCycle();enterPhase(MeteorPhase::Calm,entities);}
                break;
        }
    }
    void tickStrikes(float dt, std::vector<Entity>& entities, int radius, bool secondary) {
        for(auto& s:strikes){
            if(s.exploded) continue;
            s.countdown-=dt;
            if(s.countdown<=0.f){s.exploded=true;applyImpact(s.pos,radius,entities,secondary);}
        }
    }
    void enterPhase(MeteorPhase phase, std::vector<Entity>& entities) {
        meteorPhase=phase; meteorTimer=0.f;
        if(phase!=MeteorPhase::Aftershock) strikes.clear();
        if(phase==MeteorPhase::Warning) for(auto& e:entities) e.quipShown=false;
        if(phase==MeteorPhase::Inbound)  spawnPrimaryStrikes();
        if(phase==MeteorPhase::Aftershock) spawnAftershocks();
    }
    void spawnPrimaryStrikes() {
        int count=std::min(3+meteorCount,8);
        for(int i=0;i<count;i++)
            strikes.push_back({{(float)randInt(3,MAP_W-4),(float)randInt(3,MAP_H-4)},randFloat(2.f,8.f),false,false});
    }
    void spawnAftershocks() {
        std::vector<Vec2> orig; for(auto& s:strikes) orig.push_back(s.pos);
        for(auto& p:orig){
            Vec2 np{p.x+randFloat(-4.f,4.f),p.y+randFloat(-4.f,4.f)};
            if(inBounds(np)) strikes.push_back({np,randFloat(0.5f,3.f),false,true});
        }
    }
    void finishMeteorCycle() {
        strikes.clear(); meteorCount++;
        safeRadius=std::max(5.f,safeRadius-2.5f);
        safeDamage+=0.5f;
        nextPhaseIn=std::max(15.f,35.f-meteorCount*2.f);
        relaysCaptured=0;
    }
    void applyImpact(Vec2 center, int radius, std::vector<Entity>& entities, bool secondary) {
        Vec2 c=clampToMap(center);
        makeCrater(c);
        if(!secondary) spawnFractureCore(c);
        float r2=(float)(radius*radius);
        int baseDmg=secondary?18:38;
        for(auto& e:entities)
            if(e.alive&&dist2(e.pos,c)<=r2)
                damageEntity(e,resistedDamage(e,(float)baseDmg));
    }
    Vec2 clampToMap(Vec2 p) const {
        return {std::clamp(p.x,1.f,(float)(MAP_W-2)),std::clamp(p.y,1.f,(float)(MAP_H-2))};
    }
    void makeCrater(Vec2 c) {
        for(int dy=-2;dy<=2;dy++)
            for(int dx=-2;dx<=2;dx++){
                int x=(int)c.x+dx, y=(int)c.y+dy;
                if(inBoundsCell(x,y)) grid[y][x]=Tile::Crater;
            }
    }
    void spawnFractureCore(Vec2 p) {
        if(!inBounds(p)) return;
        tileRef(p)=Tile::FractureCore;
        fractureCores.push_back({p,true,5.f});
    }

    // ── Safe zone ─────────────────────────────────────────────────────────────
    void tickSafeZone(float dt, std::vector<Entity>& entities) {
        safeTimer+=dt;
        if(safeTimer<1.f) return;
        safeTimer=0.f;
        for(auto& e:entities)
            if(e.alive&&inStorm(e.pos))
                damageEntity(e,resistedDamage(e,safeDamage));
    }

    // ── Helix Relays ──────────────────────────────────────────────────────────
    void tickRelays(float dt, std::vector<Entity>& entities) {
        for(auto& relay:helixRelays){
            if(!relay.active) continue;
            if(relay.cooldown>0.f){relay.cooldown=std::max(0.f,relay.cooldown-dt);continue;}
            int capturer=relayCapturer(relay,entities);
            if(capturer<0){relay.captureTimer=std::max(0.f,relay.captureTimer-dt*0.5f);continue;}
            if(relay.capturedBy==capturer) continue;
            relay.captureTimer+=dt;
            if(relay.captureTimer>=relay.captureTime) completeRelayCapture(relay,capturer,entities);
        }
    }
    int relayCapturer(const HelixRelay& relay, const std::vector<Entity>& entities) const {
        for(const auto& e:entities)
            if(e.alive&&(int)e.pos.x==(int)relay.pos.x&&(int)e.pos.y==(int)relay.pos.y)
                return e.id;
        return -1;
    }
    void completeRelayCapture(HelixRelay& relay, int capturer, std::vector<Entity>& entities) {
        relay.capturedBy=capturer; relay.captureTimer=0.f; relay.cooldown=60.f; relaysCaptured++;
        for(auto& e:entities)
            if(e.alive&&e.id==capturer){
                e.hp=std::min(e.maxHp,e.hp+40);
                e.shield=std::min(e.maxShield,e.shield+30);
                e.weapon.ammo=e.weapon.magSize;
                break;
            }
    }

    // ── Fracture Cores ────────────────────────────────────────────────────────
    void tickFractureCores(float dt, std::vector<Entity>& entities) {
        for(auto& core:fractureCores){
            if(!core.active) continue;
            for(auto& e:entities){
                if(!e.alive||e.hasFractureCore) continue;
                if((int)e.pos.x==(int)core.pos.x&&(int)e.pos.y==(int)core.pos.y){
                    pickupFractureCore(core,e); break;
                }
            }
        }
        for(auto& e:entities){
            if(!e.alive||!e.hasFractureCore) continue;
            e.fractureDrain+=dt;
            if(e.ability.cooldownLeft>0.f)
                e.ability.cooldownLeft=std::max(0.f,e.ability.cooldownLeft-dt*0.5f);
            if(e.fractureDrain>8.f)
                damageEntity(e,std::max(1,(int)std::round(5.f*dt)));
        }
    }
    void pickupFractureCore(FractureCore& core, Entity& e) {
        e.hasFractureCore=true; e.fractureDrain=0.f;
        e.ability.cooldownLeft=std::max(0.f,e.ability.cooldownLeft-5.f);
        core.active=false;
        if(inBounds(core.pos)) tileRef(core.pos)=Tile::Crater;
    }
};

} // namespace rd
