#pragma once
#include <string>

// ── Character stats (balance fields only — no UI strings, no portraits) ────────
struct CharacterStats {
    std::string id;
    float speedMult        = 1.0f;
    float damageMult       = 1.0f;
    float damageResistance = 0.0f;  // 0.0–1.0 fraction of incoming damage blocked
    float killHealAmount   = 0.0f;
    float reloadMult       = 1.0f;  // < 1.0 = faster
    float maxHealthBonus   = 0.0f;
    float maxShieldBonus   = 0.0f;
    float startingShield   = 0.0f;
    float materialsBonus   = 0.0f;
    // Ability
    float abilityCooldownMs = 14000.0f;
    float abilityDurationMs = 0.0f;
};

// Returns character stats by id. Falls back to vex if id is unknown.
const CharacterStats& getCharacter(const std::string& id);

// The default character used when no id is specified
const std::string& defaultCharacterId();
