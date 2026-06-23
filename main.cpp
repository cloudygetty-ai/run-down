// main.cpp — The Run Down / Starfall Royale — real repo main ported to C++17
// Build: g++ -std=c++17 -O2 -Wall main.cpp -o rundown
// Run:   ./rundown          (character select → game)
//        ./rundown --sim    (headless bot sim)

#include "src/types.h"
#include "src/characters.h"
#include "src/world.h"
#include "src/physics.h"
#include "src/combat.h"
#include "src/ai.h"
#include "src/renderer.h"
#include "src/platform.h"

#include <algorithm>
#include <chrono>
#include <cstring>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

using namespace rd;
using Clock = std::chrono::steady_clock;

struct Game {
    World world;
    std::vector<Entity> entities;
    std::vector<Bullet> bullets;

    std::string killFeed;
    std::string meteorMsg;

    float killFeedTimer  = 0.f;
    float meteorMsgTimer = 0.f;

    bool running  = true;
    bool headless = false;

    explicit Game(unsigned seed, int playerCharIdx, bool sim = false)
        : world(seed), headless(sim) {
        spawnAll(playerCharIdx);
    }

    Entity&       player()       { return entities.front(); }
    const Entity& player() const { return entities.front(); }

    void spawnAll(int playerCharIdx) {
        entities.clear();
        Entity p = makeEntity(0, CHARACTERS[playerCharIdx], world.randomFloor(), true);
        p.weapon = LOOT_TABLE[2];
        p.weapon.ammo = p.weapon.magSize;
        entities.push_back(p);

        int botId = 1;
        for (int i = 0; i < (int)CHARACTERS.size(); ++i) {
            if (i == playerCharIdx) continue;
            if (botId > 14) break;
            Entity bot = makeEntity(botId, CHARACTERS[i], world.randomFloor(), false);
            bot.weapon = rollLoot(world.rng);
            bot.weapon.ammo = bot.weapon.magSize;
            bot.botTarget = world.randomFloor();
            entities.push_back(bot);
            ++botId;
        }
    }

    int aliveCount() const {
        int n = 0; for (auto& e : entities) if (e.alive) n++; return n;
    }

    int playerPlacement() const {
        return player().alive && aliveCount() == 1 ? 1 : aliveCount() + 1;
    }

    bool playerWon() const { return player().alive && aliveCount() == 1; }

    void setFeed(const std::string& msg, float dur = 3.f)
        { killFeed = msg; killFeedTimer = dur; }
    void setMeteorMsg(const std::string& msg, float dur = 5.f)
        { meteorMsg = msg; meteorMsgTimer = dur; }

    void clearExpiredMessages(float dt) {
        if (killFeedTimer  > 0.f) { killFeedTimer  -= dt; if (killFeedTimer  <= 0.f) { killFeed.clear();  killFeedTimer  = 0.f; } }
        if (meteorMsgTimer > 0.f) { meteorMsgTimer -= dt; if (meteorMsgTimer <= 0.f) { meteorMsg.clear(); meteorMsgTimer = 0.f; } }
    }

    // ── Input ─────────────────────────────────────────────────────────────────
    void handleInput() {
        int key = pollKey();
        if (key < 0) return;
        if (!player().alive && key != 'q' && key != 'Q') return;
        switch (key) {
            case 'w': case 'W': movePlayer({ 0,-1}); break;
            case 's': case 'S': movePlayer({ 0, 1}); break;
            case 'a': case 'A': movePlayer({-1, 0}); break;
            case 'd': case 'D': movePlayer({ 1, 0}); break;
            case ' ':           shootNearest();       break;
            case 'e': case 'E': useAbility();         break;
            case 'b': case 'B': buildWall();          break;
            case 'q': case 'Q': running = false;      break;
        }
    }

    void movePlayer(Vec2 dir) {
        Entity& p = player();
        if (!p.alive) return;
        Vec2 next{ p.pos.x+dir.x, p.pos.y+dir.y };
        if (!world.walkable(next)) return;
        p.pos = next;
        pickupLoot(p);
    }

    void pickupLoot(Entity& e) {
        int x=(int)e.pos.x, y=(int)e.pos.y;
        if (!world.inBounds(e.pos)) return;

        // Loot crate
        if (world.grid[y][x] == Tile::Loot) {
            Weapon found = rollLoot(world.rng);
            e.shield = std::min(e.maxShield, e.shield+25);
            e.mats  += 20;
            float nv = found.damage*found.range*found.fireRate;
            float cv = e.weapon.damage*e.weapon.range*e.weapon.fireRate;
            std::string msg = std::string(rarityColor(found.rarity))+"Picked up "+found.name+RST;
            if (nv > cv) { found.ammo=found.magSize; e.weapon=found; msg+=" (equipped)"; }
            world.grid[y][x] = Tile::Floor;
            if (e.isPlayer) setFeed(msg);
        }

        // Fracture Core
        if (world.grid[y][x] == Tile::FractureCore && !e.hasFractureCore) {
            e.hasFractureCore = true;
            e.ability.cooldownLeft = std::max(0.f, e.ability.cooldownLeft-5.f);
            world.grid[y][x] = Tile::Crater;
            if (e.isPlayer)
                setFeed(std::string(MAG)+"⬡ Fracture Core absorbed! Ability cooldown reduced."+RST
                       +"  "+DIM+"(drains HP after 8s)"+RST);
        }
    }

    void shootNearest() {
        Entity& p = player();
        if (!p.alive) return;
        if (p.reloadTimer > 0.f) { setFeed("Reloading..."); return; }

        Entity* best = nullptr; float bestD = 1e9f;
        for (auto& e : entities) {
            if (!e.alive || e.id==p.id) continue;
            float d = dist2(p.pos, e.pos);
            if (d < bestD) { bestD=d; best=&e; }
        }
        if (!best) { setFeed("No target"); return; }

        bool hit = tryShoot(world, p, *best, 0.016f);
        if (!hit) {
            setFeed(p.weapon.ammo<=0 ? "Reloading..." : "Shot missed");
            return;
        }
        if (!best->alive)
            setFeed(std::string(RED)+"ELIMINATED "+best->name+RST);
        else
            setFeed("Hit "+best->name+" ("+std::to_string(best->hp)+" HP)");
    }

    void useAbility() {
        Entity& p = player();
        if (!p.alive) return;
        if (p.ability.cooldownLeft > 0.f) {
            setFeed(std::string(DIM)+"Cooldown: "+std::to_string((int)p.ability.cooldownLeft)+"s"+RST);
            return;
        }
        activateAbility(p);
        setFeed(std::string(CYN)+"⚡ "+p.ability.name+" activated!"+RST);
    }

    void buildWall() {
        Entity& p = player();
        if (!p.alive) return;
        if (p.mats < 10) { setFeed("Not enough mats (need 10)"); return; }
        const Vec2 dirs[4] = {{1,0},{-1,0},{0,1},{0,-1}};
        for (auto& d : dirs) {
            Vec2 n{p.pos.x+d.x,p.pos.y+d.y};
            if (!world.inBounds(n)) continue;
            int x=(int)n.x, y=(int)n.y;
            if (world.grid[y][x]==Tile::Floor) {
                world.grid[y][x]=Tile::Built;
                p.mats-=10;
                setFeed("Wall built");
                return;
            }
        }
        setFeed("No buildable tile nearby");
    }

    // ── Tick ──────────────────────────────────────────────────────────────────
    void tickEntities(float dt) {
        for (auto& e : entities) {
            if (!e.alive) continue;
            tickEntity(e, dt);
            if (!e.isPlayer) pickupLoot(e);
        }
    }

    void tickBots(float dt) {
        for (auto& e : entities) {
            if (!e.alive || e.isPlayer) continue;
            botThink(world, e, entities, bullets, world.rng, dt);
        }
    }

    void tickMeteorQuips(float dt) {
        if (world.meteorPhase != MeteorPhase::Warning) return;
        if (world.meteorTimer >= dt*2.f) return;
        for (auto& e : entities) {
            if (!e.alive || e.quipShown) continue;
            setMeteorMsg(e.name+": \""+e.meteorQuip+"\"");
            e.quipShown = true;
            break;
        }
    }

    void update(float dt) {
        dt = std::clamp(dt, 0.f, 0.1f);
        clearExpiredMessages(dt);
        tickEntities(dt);
        tickBots(dt);

        // Bullet physics + hit resolution
        auto hits = tickBullets(bullets, entities, world, dt);
        for (auto& h : hits) {
            for (auto& e : entities) {
                if (e.id != h.targetId || !e.alive) continue;
                bool wasAlive = e.alive;
                applyDamage(e, h.damage);
                if (wasAlive && !e.alive) {
                    // Find nearest alive shooter to attribute kill
                    for (auto& k : entities) {
                        if (!k.alive || k.id == e.id) continue;
                        if (dist2(k.pos, e.pos) < 400.f) {
                            applyKillReward(k);
                            if (k.isPlayer)
                                setFeed(std::string(RED) + "ELIMINATED " + e.name + RST);
                            break;
                        }
                    }
                }
                break;
            }
        }
        tickMeteorQuips(dt);
        world.tickMeteor(dt, entities);
        world.tickSafeZone(dt, entities);
        world.tickRelays(dt, entities);
        world.tickFractureCores(dt, entities);
        if (!player().alive) running = false;
        if (playerWon())     running = false;
    }

    void renderEndScreen() const {
        std::cout << "\033[2J\033[H\n";
        if (playerWon()) {
            std::cout << YEL << BOLD
                      << "  ★ VICTORY ROYALE ★\n\n" << RST
                      << "  Operator: " << player().name << "\n"
                      << "  Kills:    " << player().kills << "\n"
                      << "  HP left:  " << player().hp<<"/"<<player().maxHp << "\n\n";
        } else {
            std::cout << RED << BOLD
                      << "  ELIMINATED\n\n" << RST
                      << "  Operator: " << player().name << "\n"
                      << "  Placed:   #" << playerPlacement() << "\n"
                      << "  Kills:    " << player().kills << "\n\n";
        }
        // Closing quip
        const CharacterDef* def = findCharacter(player().characterId);
        if (def) std::cout << "  " << DIM << "\"" << def->meteorQuip << "\"" << RST << "\n\n";
    }

    void run() {
        platformInit();
        std::cout << "\033[2J";
        auto last = Clock::now();
        while (running) {
            auto now = Clock::now();
            float dt = std::chrono::duration<float>(now-last).count();
            last = now;
            handleInput();
            update(dt);
            renderFrame(world, entities, killFeed, meteorMsg, 0);
            sleepMs(50);
        }
        renderEndScreen();
    }
};

// ── Headless sim ──────────────────────────────────────────────────────────────
int runSim(unsigned seed) {
    Game game(seed, 0, true);
    game.player().alive = false;
    float elapsed = 0.f;
    int ticksLeft = 10000;
    while (game.aliveCount() > 1 && ticksLeft-- > 0) {
        constexpr float dt = 0.05f;
        elapsed += dt;
        game.update(dt);    }
    std::cout << "=== SIM COMPLETE (t=" << (int)elapsed << "s) ===\n";
    for (auto& e : game.entities) {
        if (e.isPlayer) continue;
        std::cout << (e.alive?"WINNER  ":"dead    ")
                  << std::left << std::setw(30) << e.name
                  << " kills=" << e.kills
                  << " hp="    << std::setw(4) << e.hp
                  << " weapon="<< e.weapon.name << "\n";
    }
    return game.aliveCount() <= 1 ? 0 : 1;
}

// ── Entry ─────────────────────────────────────────────────────────────────────
int main(int argc, char** argv) {
    unsigned seed = (unsigned)std::time(nullptr);
    if (argc > 1 && std::strcmp(argv[1], "--sim") == 0)
        return runSim(seed);

    // Story screens then character select
    showStoryScreen();
    int chosen = showCharacterSelect();
    if (chosen < 0 || chosen >= (int)CHARACTERS.size()) chosen = 0;

    Game game(seed, chosen);
    game.run();
    return 0;
}
