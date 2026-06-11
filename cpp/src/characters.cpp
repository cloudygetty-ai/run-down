#include "characters.h"
#include <unordered_map>
#include <string>

// WHY: static map initialised once — lookup is O(1) and zero heap allocation per call.
static const std::unordered_map<std::string, CharacterStats>& characterMap() {
    static const std::unordered_map<std::string, CharacterStats> map = {
        { "vex",    { "vex",    1.1f,  1.0f,  0.0f,  0.0f,  0.75f, 0.0f,  0.0f,  0.0f,  0.0f,  14000.0f, 0.0f    } },
        { "brutus", { "brutus", 1.0f,  1.0f,  0.0f,  0.0f,  1.0f,  80.0f, 0.0f,  0.0f,  0.0f,  28000.0f, 6000.0f } },
        { "nyra",   { "nyra",   1.0f,  1.0f,  0.0f,  0.0f,  1.0f,  0.0f,  0.0f,  75.0f, 0.0f,  22000.0f, 5000.0f } },
        { "kade",   { "kade",   1.0f,  1.0f,  0.0f,  15.0f, 1.0f,  0.0f,  0.0f,  0.0f,  0.0f,  18000.0f, 6000.0f } },
        { "iris",   { "iris",   1.0f,  1.0f,  0.15f, 0.0f,  1.0f,  0.0f,  0.0f,  0.0f,  0.0f,  20000.0f, 4000.0f } },
        { "rook",   { "rook",   1.0f,  1.0f,  0.0f,  0.0f,  1.0f,  20.0f, 20.0f, 0.0f,  0.0f,  16000.0f, 3000.0f } },
        { "talon",  { "talon",  1.0f,  1.15f, 0.0f,  0.0f,  1.0f,  0.0f,  0.0f,  0.0f,  0.0f,  15000.0f, 5000.0f } },
        { "voss",   { "voss",   1.0f,  1.0f,  0.0f,  0.0f,  1.0f,  25.0f, 0.0f,  50.0f, 0.0f,  20000.0f, 0.0f    } },
        { "sable",  { "sable",  1.0f,  1.0f,  0.0f,  0.0f,  0.8f,  0.0f,  0.0f,  0.0f,  0.0f,  18000.0f, 5000.0f } },
        { "orin",   { "orin",   1.0f,  1.0f,  0.0f,  0.0f,  1.0f,  0.0f,  0.0f,  0.0f,  200.0f,15000.0f, 0.0f    } },
        { "lyric",  { "lyric",  1.0f,  1.2f,  0.0f,  0.0f,  1.0f,  0.0f,  0.0f,  0.0f,  0.0f,  20000.0f, 5000.0f } },
        { "magnus", { "magnus", 0.9f,  1.25f, 0.0f,  0.0f,  1.0f,  0.0f,  0.0f,  0.0f,  0.0f,  22000.0f, 5000.0f } },
        { "eira",   { "eira",   1.0f,  1.0f,  0.2f,  0.0f,  1.0f,  0.0f,  0.0f,  0.0f,  0.0f,  20000.0f, 4000.0f } },
        { "jax",    { "jax",    1.25f, 1.0f,  0.0f,  0.0f,  1.0f,  0.0f,  0.0f,  0.0f,  0.0f,  20000.0f, 5000.0f } },
        { "kael",   { "kael",   1.0f,  1.0f,  0.15f, 0.0f,  0.8f,  0.0f,  0.0f,  0.0f,  0.0f,  25000.0f, 5000.0f } },
    };
    return map;
}

const CharacterStats& getCharacter(const std::string& id) {
    const auto& m = characterMap();
    auto it = m.find(id);
    if (it == m.end()) {
        return m.at("vex");
    }
    return it->second;
}

const std::string& defaultCharacterId() {
    static const std::string def = "vex";
    return def;
}
