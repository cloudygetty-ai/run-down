#include "state_builder.h"
#include "game_engine.h"
#include "bot_service.h"
#include "balance.h"
#include <cstdio>
#include <cstring>
#include <string>

// ── --sim mode: run 2000 ticks bots-only, print progress ────────────────────

static const char* phaseStr(GamePhase p) {
    switch (p) {
        case GamePhase::Lobby:    return "lobby";
        case GamePhase::Dropping: return "dropping";
        case GamePhase::Playing:  return "playing";
        case GamePhase::GameOver: return "game_over";
        default:                  return "unknown";
    }
}

int main(int argc, char** argv) {
    bool simMode = false;
    for (int i = 1; i < argc; i++) {
        if (std::strcmp(argv[i], "--sim") == 0) { simMode = true; break; }
    }

    if (!simMode) {
        std::fprintf(stderr, "Usage: %s --sim\n", argv[0]);
        std::fprintf(stderr, "  --sim   Run a headless 2000-tick bot-only simulation.\n");
        return 1;
    }

    clearBotBrains();
    GameState state = buildInitialState("vex");

    const float deltaMs = TICK_RATE_MS;
    const int   MAX_TICKS = 2000;

    // Zero input — no human player is driving in sim mode
    InputState zeroInput{};

    std::printf("[sim] tick 0 | alive: %d | phase: %s\n",
        state.alivePlayers, phaseStr(state.phase));

    for (int tick = 1; tick <= MAX_TICKS; tick++) {
        // Run bots before the main tick so their actions feed into the same frame
        tickBots(state, deltaMs);
        tickGame(state, zeroInput, deltaMs);

        if (tick % 200 == 0) {
            std::printf("[sim] tick %d | alive: %d | phase: %s\n",
                tick, state.alivePlayers, phaseStr(state.phase));
        }

        if (state.phase == GamePhase::GameOver) {
            int kills     = state.result ? state.result->kills     : 0;
            int placement = state.result ? state.result->placement : 0;
            std::printf("[sim] game over at tick %d. placement: %d kills: %d\n",
                tick, placement, kills);
            return 0;
        }
    }

    std::printf("[sim] done. ticks: %d  final alive: %d\n", MAX_TICKS, state.alivePlayers);
    return 0;
}
