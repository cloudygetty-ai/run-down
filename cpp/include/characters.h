#pragma once
#include "types.h"
#include <vector>
#include <string>
#include <algorithm>

// Character roster — ported from src/core/characters/characters.ts
// Each CharacterStats carries lore and abilityDescription from the TS source.

inline const std::vector<CharacterStats>& allCharacters() {
    static const std::vector<CharacterStats> CHARACTERS = {
        {
            "vex",
            "Vex \"Glitch\" Calder",
            "The Phantom",
            "Quantum systems engineer who learned to weaponize lag. Blinks in and out of reality like a bad signal.",
            "Phase Skip: Teleports forward 250 units and leaves a decoy echo at the origin.",
            "I felt that before it landed. I hate this.",
            "#aa44ff",
            {
                "Unstable signal. +10% movement speed and 25% faster reloads.",
                0.f, 0.f, 0.f,
                1.1f, 1.f, 0.f, 0.75f, 0.f, 0.f,
            },
            {
                "Phase Skip",
                "Teleports forward 250 units and leaves a decoy echo at the origin.",
                14000.f, 0.f, AbilityEffectType::none,
            },
        },
        {
            "brutus",
            "Brutus Hale",
            "The Wall",
            "Walked through a building collapse once. The building lost.",
            "Titan Guard: Deploys a frontal energy shield, absorbing all incoming damage for 6 seconds before releasing it as a shockwave.",
            "Good. Something to hit back.",
            "#888888",
            {
                "Ironclad frame. +80 max HP.",
                80.f, 0.f, 0.f,
                1.f, 1.f, 0.f, 1.f, 0.f, 0.f,
            },
            {
                "Titan Guard",
                "Deploys a frontal energy shield, absorbing all incoming damage for 6 seconds before releasing it as a shockwave.",
                28000.f, 6000.f, AbilityEffectType::damage_immunity,
            },
        },
        {
            "nyra",
            "Nyra Solis",
            "The Solar",
            "Channelled solar energy into her biology. Warm to the touch. Lethal at range.",
            "Solar Bloom: Emits a healing flare — instantly restores 60 HP — while enemies within range are marked for +40% bonus damage for 5 seconds.",
            "A core. Finally. Stay back — it's mine.",
            "#ffaa00",
            {
                "Solar resilience. Starts each match with 75 shield.",
                0.f, 0.f, 75.f,
                1.f, 1.f, 0.f, 1.f, 0.f, 0.f,
            },
            {
                "Solar Bloom",
                "Emits a healing flare — instantly restores 60 HP — while enemies within range are marked for +40% bonus damage for 5 seconds.",
                22000.f, 5000.f, AbilityEffectType::damage_boost,
            },
        },
        {
            "kade",
            "Kade \"Lockjaw\" Mercer",
            "The Tracker",
            "Never loses a mark. Patience measured in days. Mercy measured in zero.",
            "Trapline: Activates hidden snares — marks all enemies and increases outgoing damage by 40% for 6 seconds.",
            "Sky just did my job for me.",
            "#cc6633",
            {
                "Efficient hunter. Each elimination restores 15 HP.",
                0.f, 0.f, 0.f,
                1.f, 1.f, 0.f, 1.f, 15.f, 0.f,
            },
            {
                "Trapline",
                "Activates hidden snares — marks all enemies and increases outgoing damage by 40% for 6 seconds.",
                18000.f, 6000.f, AbilityEffectType::damage_boost,
            },
        },
        {
            "iris",
            "Iris Venn",
            "The Fracture",
            "Psy-ops operator. Convinced three people they were somewhere else simultaneously.",
            "Mind Fracture: Deploys hallucinations — enemies cannot accurately target for 4 seconds, effectively granting damage immunity.",
            "Controlled impact. Someone aimed that.",
            "#cc44aa",
            {
                "Misdirection mastery. 15% of all incoming damage is deflected.",
                0.f, 0.f, 0.f,
                1.f, 1.f, 0.15f, 1.f, 0.f, 0.f,
            },
            {
                "Mind Fracture",
                "Deploys hallucinations — enemies cannot accurately target for 4 seconds, effectively granting damage immunity.",
                20000.f, 4000.f, AbilityEffectType::damage_immunity,
            },
        },
        {
            "rook",
            "Rook Ashfall",
            "The Smoke",
            "Tactical specialist. Controls terrain. The smoke is never random.",
            "Smoke Reign: Blankets the area — grants damage immunity for 3 seconds and doubles movement speed within the smoke.",
            "New cover. Adapt.",
            "#446688",
            {
                "Prepared entry. +20 max HP and +20 max shield.",
                20.f, 20.f, 0.f,
                1.f, 1.f, 0.f, 1.f, 0.f, 0.f,
            },
            {
                "Smoke Reign",
                "Blankets the area — grants damage immunity for 3 seconds and doubles movement speed within the smoke.",
                16000.f, 3000.f, AbilityEffectType::damage_immunity,
            },
        },
        {
            "talon",
            "Talon Rhee",
            "The Predator",
            "Apex hunter from a collapsed nation. Tracks by sound. Closes in silence.",
            "Predator Leap: Launches forward 200 units and marks the target, increasing all damage dealt to them by 50% for 5 seconds.",
            "Flushed them right out. Efficient.",
            "#882222",
            {
                "Predator instinct. All weapons deal +15% damage.",
                0.f, 0.f, 0.f,
                1.f, 1.15f, 0.f, 1.f, 0.f, 0.f,
            },
            {
                "Predator Leap",
                "Launches forward 200 units and marks the target, increasing all damage dealt to them by 50% for 5 seconds.",
                15000.f, 5000.f, AbilityEffectType::damage_boost,
            },
        },
        {
            "voss",
            "Dr. Quillan \"Pulse\" Voss",
            "The Surgeon",
            "Field surgeon who operates on himself between engagements. The stitches are self-dissolving.",
            "Bio Surge: Sends a restorative wave — instantly heals 80 HP.",
            "Triage priority just changed.",
            "#4488ff",
            {
                "Biological optimization. +25 max HP and starts with 50 shield.",
                25.f, 0.f, 50.f,
                1.f, 1.f, 0.f, 1.f, 0.f, 0.f,
            },
            {
                "Bio Surge",
                "Sends a restorative wave — instantly heals 80 HP.",
                20000.f, 0.f, AbilityEffectType::none,
            },
        },
        {
            "sable",
            "Sable Korr",
            "The Tether",
            "Former intelligence broker. Knows that information shared is pain shared.",
            "Shadow Bind: Tethers enemies — damage dealt to any target is increased by 45% for 5 seconds as the bind amplifies all hits.",
            "Accelerated evolution. The weak are being selected out.",
            "#9933cc",
            {
                "Precision focus. Weapon reloads 20% faster.",
                0.f, 0.f, 0.f,
                1.f, 1.f, 0.f, 0.8f, 0.f, 0.f,
            },
            {
                "Shadow Bind",
                "Tethers enemies — damage dealt to any target is increased by 45% for 5 seconds as the bind amplifies all hits.",
                18000.f, 5000.f, AbilityEffectType::damage_boost,
            },
        },
        {
            "orin",
            "Orin \"Scrap\" Dax",
            "The Salvager",
            "Built his first weapon from a vending machine and a door hinge. Still uses it.",
            "Junk Fortress: Scavenges nearby debris — instantly grants +100 of each building material.",
            "Free parts. I'll take it.",
            "#cc8800",
            {
                "Resource specialist. Starts with triple building materials.",
                0.f, 0.f, 0.f,
                1.f, 1.f, 0.f, 1.f, 0.f, 200.f,
            },
            {
                "Junk Fortress",
                "Scavenges nearby debris — instantly grants +100 of each building material.",
                15000.f, 0.f, AbilityEffectType::none,
            },
        },
        {
            "lyric",
            "Lyric Vale",
            "The Resonance",
            "Sound engineer turned soldier. The blast radius is calculated, not accidental.",
            "Sonic Crescendo: Charges a focused sound blast — knocks back nearby enemies and deals +50% weapon damage for 5 seconds.",
            "Beautiful resonance. Terrible timing.",
            "#44ccaa",
            {
                "Sonic amplification. All weapons deal +20% damage.",
                0.f, 0.f, 0.f,
                1.f, 1.2f, 0.f, 1.f, 0.f, 0.f,
            },
            {
                "Sonic Crescendo",
                "Charges a focused sound blast — knocks back nearby enemies and deals +50% weapon damage for 5 seconds.",
                20000.f, 5000.f, AbilityEffectType::damage_boost,
            },
        },
        {
            "magnus",
            "Magnus Drift",
            "The Gravity",
            "Physicist who discovered the practical applications of his research. Immediately regretted it.",
            "Gravity Well: Pulls enemies toward a central point — all pulled targets take +50% weapon damage for 5 seconds.",
            "This is my fault. Again.",
            "#6644ff",
            {
                "Gravitational mass. +25% weapon damage, -10% movement speed.",
                0.f, 0.f, 0.f,
                0.9f, 1.25f, 0.f, 1.f, 0.f, 0.f,
            },
            {
                "Gravity Well",
                "Pulls enemies toward a central point — all pulled targets take +50% weapon damage for 5 seconds.",
                22000.f, 5000.f, AbilityEffectType::damage_boost,
            },
        },
        {
            "eira",
            "Eira Frost",
            "The Glacier",
            "Cryogenic containment specialist. The \"containment\" part is optional.",
            "Cryo Veil: Freezes the surrounding ground — grants damage immunity for 4 seconds and creates ice barriers that block bullets.",
            "Heat. I despise heat.",
            "#44ddff",
            {
                "Ice armor. 20% of all incoming damage is deflected.",
                0.f, 0.f, 0.f,
                1.f, 1.f, 0.2f, 1.f, 0.f, 0.f,
            },
            {
                "Cryo Veil",
                "Freezes the surrounding ground — grants damage immunity for 4 seconds and creates ice barriers that block bullets.",
                20000.f, 4000.f, AbilityEffectType::damage_immunity,
            },
        },
        {
            "jax",
            "Jax \"Overclock\" Renn",
            "The Overclocked",
            "Neural augmentations pushed past rated limits. The tremor in his hands is from the speed, not the fear.",
            "Adrenal Override: Pushes all systems past the limit — doubles fire rate and movement speed for 5 seconds, but drains 5 HP per second during the effect.",
            "HA. Let's go again.",
            "#ff4400",
            {
                "Overclocked systems. +25% movement speed.",
                0.f, 0.f, 0.f,
                1.25f, 1.f, 0.f, 1.f, 0.f, 0.f,
            },
            {
                "Adrenal Override",
                "Pushes all systems past the limit — doubles fire rate and movement speed for 5 seconds, but drains 5 HP per second during the effect.",
                20000.f, 5000.f, AbilityEffectType::rapid_fire,
            },
        },
        {
            "kael",
            "Kael Umbra",
            "The Void",
            "Emerged from a void experiment intact. Mostly. The parts that changed are the useful parts.",
            "Void Step: Becomes intangible for 5 seconds — grants damage immunity and passes through all obstacles.",
            "The void remembers this energy.",
            "#220044",
            {
                "Void-touched. 15% damage resistance and 20% faster reloads.",
                0.f, 0.f, 0.f,
                1.f, 1.f, 0.15f, 0.8f, 0.f, 0.f,
            },
            {
                "Void Step",
                "Becomes intangible for 5 seconds — grants damage immunity and passes through all obstacles.",
                25000.f, 5000.f, AbilityEffectType::damage_immunity,
            },
        },
    };
    return CHARACTERS;
}

inline const CharacterStats* getCharacter(const std::string& id) {
    for (const auto& c : allCharacters()) {
        if (c.id == id) return &c;
    }
    return &allCharacters()[0];
}

inline const CharacterStats& defaultCharacter() {
    return allCharacters()[0];
}
