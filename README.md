# RUN DOWN
### *Starfall Royale — Last operator standing.*

> Built on the `claude/starfall-royale-prototype-0YwGL` branch.  
> TypeScript prototype → C++17 standalone port.

---

## THE STORY

**HELIX CORPORATION**  
They rebuilt the world. Then decided who got to live in it.

After the Resource Collapse of 2041, Helix Corp emerged as the sole architect of civilization — controlling food, medicine, and the orbital infrastructure that kept satellites alive. Compliance was not optional. Resistance was logged, catalogued, and eventually... resolved.

**S.I.G.I.L.**  
*Strategic Interdiction and Guided Impact Lattice.*  
A network of kinetic bombardment platforms in low orbit. Each node can place a precision meteorite strike anywhere on the surface within 90 seconds. Helix deployed it to end two border conflicts. Then they kept it running. Nobody asked why.

**THE PROVING GROUND**  
Operatives who know too much. Defectors. Rivals. Anyone Helix wants gone but can't officially touch. They're dropped into a designated zone and the SIGIL clock starts ticking. Only the last one standing leaves.

Helix calls it "resolution". Everyone else calls it the **Run Down**.

---

## OPERATORS

15 characters — each with a unique passive, ability, and voice.

| ID | Name | Title | Passive | Ability |
|---|---|---|---|---|
| `vex` | Vex "Glitch" Calder | The Phantom | +10% speed, 25% faster reloads | Phase Skip — teleport 250 units |
| `brutus` | Brutus Hale | The Wall | +80 max HP | Titan Guard — absorb all damage 6s, release as shockwave |
| `nyra` | Nyra Solis | The Solar | Starts with 75 shield | Solar Bloom — heal 60 HP, mark enemies +40% dmg 5s |
| `kade` | Kade "Lockjaw" Mercer | The Tracker | +15 HP on kill | Trapline — mark all enemies, +40% outgoing dmg 6s |
| `iris` | Iris Venn | The Fracture | 15% incoming dmg deflected | Mind Fracture — enemies can't target 4s |
| `rook` | Rook Ashfall | The Smoke | +20 HP, +20 shield | Smoke Reign — damage immunity 3s, double speed |
| `talon` | Talon Rhee | The Predator | All weapons +15% dmg | Predator Leap — launch 200 units, target +50% dmg 5s |
| `voss` | Dr. Quillan "Pulse" Voss | The Surgeon | +25 max HP, starts with 50 shield | Bio Surge — instant heal 80 HP |
| `sable` | Sable Korr | The Tether | 20% faster reloads | Shadow Bind — all damage dealt +45% 5s |
| `orin` | Orin "Scrap" Dax | The Salvager | Starts with triple mats | Junk Fortress — instant +100 materials |
| `lyric` | Lyric Vale | The Resonance | All weapons +20% dmg | Sonic Crescendo — knockback + +50% dmg 5s |
| `magnus` | Magnus Drift | The Gravity | +25% dmg, -10% speed | Gravity Well — pull enemies to center, +50% dmg 5s |
| `eira` | Eira Frost | The Glacier | 20% incoming dmg deflected | Cryo Veil — damage immunity 4s, ice barriers |
| `jax` | Jax "Overclock" Renn | The Overclocked | +25% movement speed | Adrenal Override — double fire rate + speed 5s, drains 5 HP/s |
| `kael` | Kael Umbra | The Void | 15% dmg resistance, 20% faster reloads | Void Step — intangible 5s, passes through obstacles |

---

## MECHANICS

### SIGIL Bombardment — 6 Phases

```
Calm → Warning → Inbound → Impact → Aftershock → Clear → Calm...
```

- **Calm** — SIGIL is targeting. Timer counts down (delayed if you hold relays).
- **Warning** — Each operator broadcasts their meteor quip. Strike zones appear.
- **Inbound** — Kinetic rods begin descent. `⊙` markers show impact zones. 2–8 seconds to move.
- **Impact** — Primary strikes land. Craters form. **Fracture Cores spawn** at each impact site.
- **Aftershock** — Secondary strikes scatter near original positions.
- **Clear** — Debris settles. Safe zone shrinks. Next cycle begins faster.

### Fracture Cores `⬡`

Crystallized spacetime energy left at impact craters.

- **Pick up** — Walk over a `⬡` tile.
- **Effect** — Ability cooldown reduced. All damage increased. Cooldown drains 50% faster.
- **Cost** — After 8 seconds, drains 5 HP/sec until it kills you.

High risk. High upside. Use the window.

### Helix Relays `▣`

SIGIL targeting infrastructure. Three per map.

- **Capture** — Stand on the relay tile for 5 seconds.
- **Effect** — Disrupts SIGIL coordination. Each captured relay adds 8 seconds to the next bombardment cycle. Supply cache reward: +40 HP, +30 shield, full ammo.
- **Cooldown** — 60 seconds before the relay reactivates.

Control the relays. Buy time. Bleed Helix dry.

### Safe Zone

The Proving Ground contracts each cycle. Outside the boundary:
- 1.5 HP/sec storm damage on first cycle, increases each round.
- Damage resistance passives apply.
- Move toward `safeCenter` — it never moves.

### Weapons

| Weapon | Rarity | Damage | Range | Fire Rate |
|---|---|---|---|---|
| Pistol | Common | 12 | 7 | 2.0/s |
| SMG | Common | 8 | 5 | 5.0/s |
| Shotgun | Rare | 32 | 3 | 1.0/s |
| AR | Rare | 18 | 9 | 3.0/s |
| Sniper | Epic | 60 | 16 | 0.5/s |
| Gold SCAR | Legendary | 30 | 10 | 4.0/s |
| Rocket | Legendary | 80 | 8 | 0.3/s |

Loot crates also restore 25 shield and 20 building materials.

---

## BUILD

### Requirements

- `g++` with C++17 support (`g++ 9+`)
- Linux, macOS, or Windows (MSVC / MinGW)
- No external dependencies

### Compile

```bash
git clone https://github.com/cloudygetty-ai/run-down
cd run-down
git checkout claude/starfall-royale-prototype-0YwGL

# Build
make

# Or manually
g++ -std=c++17 -O2 -Wall main.cpp -o rundown
```

### Run

```bash
# Full game — story → character select → match → game over
./rundown

# Skip story screens
./rundown --nostory

# Headless bot simulation (CI/balance testing)
./rundown --sim
```

---

## CONTROLS

| Key | Action |
|---|---|
| `W A S D` | Move |
| `SPACE` | Shoot nearest target |
| `E` | Activate ability |
| `B` | Build wall (costs 10 mats) |
| `Q` | Quit |

---

## PROJECT STRUCTURE

```
run-down/
├── main.cpp                  — Game loop, input, screens, sim mode
├── Makefile
└── src/
    ├── types.h               — Vec2, Entity, Weapon, Ability, Bullet, Tile, all structs
    ├── characters.h          — All 15 operators: passives, abilities, lore, meteor quips
    ├── world.h               — Map generation, SIGIL 6-phase meteor, relays, fracture cores, safe zone
    ├── physics.h             — Substep bullet travel (no tunneling), LOS, explosion splash
    ├── combat.h              — Loot table, damage calc, tryShoot, tickEntity, activateAbility
    ├── ai.h                  — Bot FSM: Wander/Loot/Hunt/Flee/CaptureRelay, bullet spawning
    ├── renderer.h            — ANSI terminal: story screens, character select, game HUD, game over
    └── platform.h            — Cross-platform raw input (Windows + POSIX)
```

---

## ARCHITECTURE

```
main.cpp
  │
  ├── showStoryScreen()        → 5 lore beats, key-gated
  ├── showCharacterSelect()    → stat bars, ability preview, ↑↓ navigate
  │
  └── Game
        ├── World              → map + all world systems
        │     ├── tickMeteor()
        │     ├── tickSafeZone()
        │     ├── tickRelays()
        │     └── tickFractureCores()
        │
        ├── entities[]         → player + 14 bots (one per unused character)
        ├── bullets[]          → live projectiles (physics substep)
        │
        ├── update(dt)
        │     ├── tickEntities()
        │     ├── tickBots() → botThink() per bot
        │     ├── tickBullets() → HitEvent[] → applyDamage()
        │     └── world.tick*()
        │
        └── renderFrame()      → ANSI map + HUD
```

**Bot state machine:** `Wander → Hunt / Loot / CaptureRelay / Flee → UseAbility`

Bots are character-aware — passives affect speed, damage, and resistance; ability heuristics fire on low HP, close combat, meteor threat, or storm exposure.

---

## TYPESCRIPT PROTOTYPE

The full React Native game prototype lives on this branch:

```
src/
├── core/         — gameEngine, meteor phases, physics
├── services/     — ai, weapons, state (Zustand)
├── screens/      — LobbyScreen, GameScreen, GameOverScreen
├── components/   — GameMap, HUD, Joystick, MeteorZoneOverlay, BuildPieceView
└── types/        — TypeScript interfaces
```

The C++ port in `cpp/` is a faithful translation of the core engine — same tick logic, same character data, same 6-phase SIGIL system — compiled to a standalone terminal executable.

---

## ROADMAP

- [ ] SDL2 graphics layer — sprite rendering, particle effects for meteor impacts
- [ ] Touch / virtual joystick for mobile SDL2 port
- [ ] Fracture Core visual effect (pulsing glow radius)
- [ ] Sound events (impact, ability activation, kill)
- [ ] Network multiplayer via UDP (authoritative server tick)
- [ ] Save / leaderboard persistence

---

*cloudygetty-ai · Run Down / Starfall Royale*  
*C++17 engine port — zero dependencies, full operator roster*
