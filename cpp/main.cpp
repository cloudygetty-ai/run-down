// Run Down — C++ port
// Entry point. Includes all headers (header-only architecture).
// Supports two modes:
//   --sim  : headless 2000-tick bots-only run (exits 0)
//   (none) : interactive terminal loop

#include "include/types.h"
#include "include/balance.h"
#include "include/utils.h"
#include "include/characters.h"
#include "include/physics.h"
#include "include/weapons.h"
#include "include/meteor.h"
#include "include/state.h"
#include "include/engine.h"
#include "include/ai.h"

#include <iostream>
#include <string>
#include <cstring>
#include <cstdio>

// ── State summary printer ─────────────────────────────────────────────────────

static void printStateSummary(const GameState& gs) {
    // Count alive players
    int aliveCount = 0;
    const Player* human = nullptr;
    for (const auto& p : gs.players) {
        if (p.status == PlayerStatus::alive) ++aliveCount;
        if (p.isHuman) human = &p;
    }

    const char* phaseStr = "unknown";
    switch (gs.phase) {
        case GamePhase::lobby:     phaseStr = "lobby";     break;
        case GamePhase::dropping:  phaseStr = "dropping";  break;
        case GamePhase::playing:   phaseStr = "playing";   break;
        case GamePhase::game_over: phaseStr = "game_over"; break;
    }

    std::cout << "--- Tick " << gs.tickCount
              << " | Phase: " << phaseStr
              << " | Alive: " << aliveCount << " / " << (int)gs.players.size()
              << " | Shelter R: " << (int)gs.bombardment.shelterRadius << "\n";

    if (human) {
        std::cout << "  Player HP: " << (int)human->health
                  << " / " << (int)human->maxHealth
                  << "  Shield: " << (int)human->shield
                  << " / " << (int)human->maxShield
                  << "  Kills: " << human->kills
                  << "  Status: "
                  << (human->status == PlayerStatus::alive ? "alive" :
                      human->status == PlayerStatus::knocked ? "knocked" : "eliminated")
                  << "\n";
        std::cout << "  Char: " << human->characterId
                  << "  Ability CD: " << (int)human->abilityChargeMs << "ms\n";
    }

    if (gs.activeQuip.has_value())
        std::cout << "  Quip: \"" << *gs.activeQuip << "\"\n";

    if (gs.result.has_value()) {
        const GameResult& r = *gs.result;
        std::cout << "  RESULT: placement=" << r.placement
                  << " kills=" << r.kills
                  << " winner=\"" << r.winner << "\"\n";
    }
}

// ── Sim mode: headless 2000-tick bots-only run ────────────────────────────────

static int runSim() {
    std::cout << "[SIM] Initializing 100-player game (1 human + 99 bots)...\n";
    GameState gs = buildInitialState("vex");

    const int TOTAL_TICKS = 12000; // full game: ~10 min at 20 ticks/s, covers all 6 shelter phases
    const float DELTA_MS  = TICK_RATE_MS;

    for (int tick = 0; tick < TOTAL_TICKS; ++tick) {
        gs = tickGame(gs, DELTA_MS);
        gs = tickBots(gs, DELTA_MS);

        if (tick > 0 && tick % 200 == 0) {
            int alive = 0;
            for (const auto& p : gs.players)
                if (p.status == PlayerStatus::alive) ++alive;

            std::cout << "[SIM] tick=" << tick
                      << " alive=" << alive
                      << " phase=" << (gs.phase == GamePhase::game_over ? "game_over" : "playing")
                      << " shelter_r=" << (int)gs.bombardment.shelterRadius
                      << "\n";
        }

        if (gs.phase == GamePhase::game_over) {
            std::cout << "[SIM] Game over at tick " << tick << ".\n";
            if (gs.result.has_value())
                std::cout << "[SIM] Winner: \"" << gs.result->winner
                          << "\"  kills=" << gs.result->kills << "\n";
            break;
        }
    }

    std::cout << "[SIM] Complete.\n";
    return 0;
}

// ── Interactive terminal loop ─────────────────────────────────────────────────

static int runInteractive() {
    std::cout << "Run Down — Terminal Mode\n";
    std::cout << "Commands: Enter=+1 tick, s=+100 ticks, q=quit\n";
    std::cout << "Starting game...\n\n";

    GameState gs = buildInitialState("vex");

    const float DELTA_MS = TICK_RATE_MS;

    printStateSummary(gs);

    while (true) {
        std::cout << "\n> ";
        std::cout.flush();

        std::string line;
        if (!std::getline(std::cin, line)) break; // EOF

        if (line == "q" || line == "Q") {
            std::cout << "Goodbye.\n";
            break;
        }

        int advanceTicks = 1;
        if (line == "s" || line == "S") advanceTicks = 100;

        for (int i = 0; i < advanceTicks; ++i) {
            gs = tickGame(gs, DELTA_MS);
            gs = tickBots(gs, DELTA_MS);
            if (gs.phase == GamePhase::game_over) break;
        }

        printStateSummary(gs);

        if (gs.phase == GamePhase::game_over) {
            std::cout << "Game over. Press q to quit.\n";
        }
    }

    return 0;
}

// ── Entry point ───────────────────────────────────────────────────────────────

int main(int argc, char* argv[]) {
    bool simMode = false;
    for (int i = 1; i < argc; ++i) {
        if (std::strcmp(argv[i], "--sim") == 0) { simMode = true; break; }
    }
    return simMode ? runSim() : runInteractive();
}
