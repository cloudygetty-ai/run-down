// src/characters.h
#pragma once
#include "types.h"

namespace rd {

inline const std::vector<CharacterDef> CHARACTERS = {
  { "vex","Vex \"Glitch\" Calder","The Phantom",
    "Quantum systems engineer who learned to weaponize lag. Blinks in and out of reality like a bad signal.",
    "I felt that before it landed. I hate this.","#aa44ff",
    {"Unstable signal. +10% move speed, 25% faster reloads.",0,0,0,1.1f,1.0f,0.0f,0.75f,0,0},
    {"Phase Skip","Teleports forward 250 units, leaves decoy echo.",14.f,0.f,EffectType::None}},

  { "brutus","Brutus Hale","The Wall",
    "Walked through a building collapse once. The building lost.",
    "Good. Something to hit back.","#888888",
    {"Ironclad frame. +80 max HP.",80,0,0,1.0f,1.0f,0.0f,1.0f,0,0},
    {"Titan Guard","Absorbs all damage for 6s, releases as shockwave.",28.f,6.f,EffectType::DamageImmunity}},

  { "nyra","Nyra Solis","The Solar",
    "Channelled solar energy into her biology. Warm to the touch. Lethal at range.",
    "A core. Finally. Stay back — it's mine.","#ffaa00",
    {"Solar resilience. Starts with 75 shield.",0,0,75,1.0f,1.0f,0.0f,1.0f,0,0},
    {"Solar Bloom","Heals 60 HP. Marks enemies for +40% damage for 5s.",22.f,5.f,EffectType::DamageBoost}},

  { "kade","Kade \"Lockjaw\" Mercer","The Tracker",
    "Never loses a mark. Patience measured in days. Mercy measured in zero.",
    "Sky just did my job for me.","#cc6633",
    {"Efficient hunter. Each kill restores 15 HP.",0,0,0,1.0f,1.0f,0.0f,1.0f,15,0},
    {"Trapline","Marks all enemies. +40% outgoing damage for 6s.",18.f,6.f,EffectType::DamageBoost}},

  { "iris","Iris Venn","The Fracture",
    "Psy-ops operator. Convinced three people they were somewhere else simultaneously.",
    "Controlled impact. Someone aimed that.","#cc44aa",
    {"Misdirection mastery. 15% incoming damage deflected.",0,0,0,1.0f,1.0f,0.15f,1.0f,0,0},
    {"Mind Fracture","Enemies cannot accurately target for 4s.",20.f,4.f,EffectType::DamageImmunity}},

  { "rook","Rook Ashfall","The Smoke",
    "Tactical specialist. Controls terrain. The smoke is never random.",
    "New cover. Adapt.","#446688",
    {"Prepared entry. +20 max HP, +20 max shield.",20,20,0,1.0f,1.0f,0.0f,1.0f,0,0},
    {"Smoke Reign","Damage immunity 3s, double movement speed.",16.f,3.f,EffectType::DamageImmunity}},

  { "talon","Talon Rhee","The Predator",
    "Apex hunter from a collapsed nation. Tracks by sound. Closes in silence.",
    "Flushed them right out. Efficient.","#882222",
    {"Predator instinct. All weapons +15% damage.",0,0,0,1.0f,1.15f,0.0f,1.0f,0,0},
    {"Predator Leap","Launches 200 units. Target takes +50% damage for 5s.",15.f,5.f,EffectType::DamageBoost}},

  { "voss","Dr. Quillan \"Pulse\" Voss","The Surgeon",
    "Field surgeon who operates on himself between engagements. The stitches are self-dissolving.",
    "Triage priority just changed.","#4488ff",
    {"Biological optimization. +25 max HP, starts with 50 shield.",25,0,50,1.0f,1.0f,0.0f,1.0f,0,0},
    {"Bio Surge","Instantly heals 80 HP.",20.f,0.f,EffectType::None}},

  { "sable","Sable Korr","The Tether",
    "Former intelligence broker. Knows that information shared is pain shared.",
    "Accelerated evolution. The weak are being selected out.","#9933cc",
    {"Precision focus. Reloads 20% faster.",0,0,0,1.0f,1.0f,0.0f,0.8f,0,0},
    {"Shadow Bind","All damage dealt +45% for 5s.",18.f,5.f,EffectType::DamageBoost}},

  { "orin","Orin \"Scrap\" Dax","The Salvager",
    "Built his first weapon from a vending machine and a door hinge. Still uses it.",
    "Free parts. I'll take it.","#cc8800",
    {"Resource specialist. Starts with triple mats.",0,0,0,1.0f,1.0f,0.0f,1.0f,0,200},
    {"Junk Fortress","Instantly grants +100 building materials.",15.f,0.f,EffectType::None}},

  { "lyric","Lyric Vale","The Resonance",
    "Sound engineer turned soldier. The blast radius is calculated, not accidental.",
    "Beautiful resonance. Terrible timing.","#44ccaa",
    {"Sonic amplification. All weapons +20% damage.",0,0,0,1.0f,1.2f,0.0f,1.0f,0,0},
    {"Sonic Crescendo","Knockback nearby enemies. +50% weapon damage for 5s.",20.f,5.f,EffectType::DamageBoost}},

  { "magnus","Magnus Drift","The Gravity",
    "Physicist who discovered the practical applications of his research. Immediately regretted it.",
    "This is my fault. Again.","#6644ff",
    {"Gravitational mass. +25% weapon damage, -10% speed.",0,0,0,0.9f,1.25f,0.0f,1.0f,0,0},
    {"Gravity Well","Pulls enemies to center. All pulled take +50% damage for 5s.",22.f,5.f,EffectType::DamageBoost}},

  { "eira","Eira Frost","The Glacier",
    "Cryogenic containment specialist. The \"containment\" part is optional.",
    "Heat. I despise heat.","#44ddff",
    {"Ice armor. 20% incoming damage deflected.",0,0,0,1.0f,1.0f,0.2f,1.0f,0,0},
    {"Cryo Veil","Damage immunity 4s. Ice barriers block bullets.",20.f,4.f,EffectType::DamageImmunity}},

  { "jax","Jax \"Overclock\" Renn","The Overclocked",
    "Neural augmentations pushed past rated limits. The tremor is from the speed, not the fear.",
    "HA. Let's go again.","#ff4400",
    {"Overclocked. +25% movement speed.",0,0,0,1.25f,1.0f,0.0f,1.0f,0,0},
    {"Adrenal Override","Double fire rate and speed for 5s. Drains 5 HP/sec.",20.f,5.f,EffectType::RapidFire}},

  { "kael","Kael Umbra","The Void",
    "Emerged from a void experiment intact. Mostly. The parts that changed are the useful parts.",
    "The void remembers this energy.","#220044",
    {"Void-touched. 15% damage resistance, 20% faster reloads.",0,0,0,1.0f,1.0f,0.15f,0.8f,0,0},
    {"Void Step","Intangible 5s — damage immunity, passes through obstacles.",25.f,5.f,EffectType::DamageImmunity}},
};

inline const CharacterDef* findCharacter(const std::string& id) {
    for (auto& c : CHARACTERS) if (c.id == id) return &c;
    return &CHARACTERS[0];
}

inline Entity makeEntity(int eid, const CharacterDef& def, Vec2 pos, bool isPlayer = false) {
    Entity e;
    e.id          = eid;
    e.characterId = def.id;
    e.name        = isPlayer ? def.name : def.name;
    e.passive     = def.passive;
    e.ability     = def.ability;
    e.ability.cooldownLeft = 0;
    e.meteorQuip  = def.meteorQuip;
    e.isPlayer    = isPlayer;
    e.pos         = pos;
    e.maxHp       = 100 + def.passive.maxHealthBonus;
    e.hp          = e.maxHp;
    e.maxShield   = 100 + def.passive.maxShieldBonus;
    e.shield      = def.passive.startingShield;
    e.mats        = 50 + def.passive.materialsBonus;
    return e;
}

} // namespace rd
