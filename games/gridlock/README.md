# GRIDLOCK

> **Everything runs through you.**
>
> An isometric neon city-builder. Zone it, power it, cool it, and keep the whole
> thing moving — while the planet keeps score.

Open `games/gridlock/index.html` in a browser. No build step, no dependencies,
no server required.

---

## What makes it not-SimCity

SimCity's core loop is zone → watch it fill. GRIDLOCK keeps that loop and adds
three pressures that make every tile placement a decision:

### 1. Adjacency synergy — placement is a puzzle

The same building is worth materially more or less depending on what it touches.
Commerce beside housing sells more. Housing beside a foundry loses approval.
A server farm on the waterfront dumps its heat into the bay.

| Synergy | Subject | Neighbour | Effect | Cap |
|---|---|---|---|---|
| Foot Traffic | Commercial | Residential | +8% revenue each | 4 |
| Retail Cluster | Commercial | Commercial | +5% revenue each | 2 |
| Supply Chain | Industry | Industry | +7% revenue each | 3 |
| Direct Feed | Data | Power | +9% revenue each | 2 |
| Coolant Draw | Data | Open water | −18% heat each | 3 |
| Green Outlook | Residential | Green | +2.5 appeal each | 3 |
| Downwind | Residential | Industry | −3.5 appeal each | 3 |
| Connected | Residential | Transit | +6% housing each | 2 |
| Canopy | Green | Green | +12% cooling each | 3 |
| Campus | Data | Civic | +15% research each | 2 |
| Shoreline | Residential | Open water | +1.5 appeal each | 3 |

The inspector shows exactly what a tile *would* score before you commit.

### 2. The Heat Index — your industry cooks the planet you build on

Generators, factories, and server farms emit heat. Past **55** the index raises
city-wide cooling demand and starts costing approval; at **88** the city is in
crisis and the whole map takes on a red cast. Parks, sky gardens, and carbon
scrubbers pull it back. There is no way to build a large dirty city and ignore it.

### 3. Crisis cards — the world interrupts you

Twelve cards, each fired by real conditions in your city, each pausing the game
to force a trade with no clean answer:

- **Grid Surge** — shed load city-wide, or run the plants hot and gamble one.
- **Heatwave** — ration water and take the anger, or buy reserves at spot price.
- **Corporate Bid** — 18,000 credits now for a decade of thermal load.
- **Transit Strike** — meet their terms, or break the strike and be remembered.
- **Arrival Wave** — open the gates, or seal the perimeter.
- …plus Data Breach, Sovereign Grant, Ground Tremor, Smog Alert, Fusion
  Breakthrough, Blackout Riots, and the Pulse Festival.

Cards you have not seen are three times as likely to be drawn, so the deck stays
surprising well into a long game.

---

## The three chains

A structure produces nothing unless all three hold:

```
road ──▶ power ──▶ water ──▶ live
```

1. **Road** — it must touch a road wired back to the Nexus. Cut the street and
   the district goes dark. The HUD shows a pulsing `N CUT OFF` chip.
2. **Power** — when supply falls short, rationing is deterministic and
   priority-ordered: water plants and clinics stay lit, factories go dark first.
3. **Water** — resolved *after* power, so an unpowered pump makes no water. The
   failure cascades in one direction, on purpose.

---

## Progression

Research is the only thing that advances the era, and academies and labs are the
only things that bank it.

| Era | Name | Research | Unlocks |
|---|---|---|---|
| 1 | Diesel Age | — | Habitat blocks, markets, fabricators, diesel, solar, pumps |
| 2 | Solar Age | 120 | Sky lofts, plazas, robotics, server farms, wind, geothermal, desal, arena, transit |
| 3 | Fusion Age | 640 | Arcology spires, corporate towers, orbital foundries, AI labs, fusion, scrubbers, mag-lev |

Build and power the **Zero Point** interchange to win. Eleven directives run in a
queue of three, paying out credits and research as you clear them.

---

## Controls

| Input | Action |
|---|---|
| Click a structure, then click/drag the map | Build (drag is how you lay roads) |
| Right-drag, or drag with no tool held | Pan |
| Wheel | Zoom toward the cursor |
| `Space` | Pause / resume |
| `1` `2` `3` | Speed |
| `X` | Bulldoze (35% refund) |
| `O` | Cycle map view |
| `S` | Save · `H` Help · `Esc` Drop tool |
| `` ` `` | Telemetry overlay |

Five map views: **City**, **Desirability**, **Utilities**, **Services**,
**Emissions**.

---

## Architecture

Zero-build ES modules. The simulation core is pure and runs headless in Node,
which is what makes it testable.

```
games/gridlock/
├── index.html            — static shell; all structure, no logic
├── styles.css            — obsidian / gold / violet theme
└── src/
    ├── config/           — DATA ONLY: balance, catalog, synergy, eras, crises, directives
    │   ├── balance.js        every tuning knob in the game
    │   ├── buildings.js      31 structures, signed power/water convention
    │   ├── synergy.js        the adjacency rule table
    │   ├── events.js         the crisis deck
    │   └── directives.js     the objective queue
    ├── core/             — PURE SIM: no DOM, no clock, no Math.random
    │   ├── rng.js            seeded streams + value noise
    │   ├── grid.js           terrain generation and neighbourhood queries
    │   ├── state.js          construction, cloning, logging
    │   ├── commands.js       place / demolish / tax / speed, all validated here
    │   ├── network.js        road connectivity from the Nexus
    │   ├── rationing.js      deterministic priority-ordered shortfalls
    │   ├── synergy.js        adjacency scoring
    │   ├── fields.js         desirability and service coverage
    │   ├── stats.js          the one grid scan per month
    │   ├── economy.js        approval, migration, heat
    │   ├── events.js         crisis draw and effect interpretation
    │   ├── directives.js     objective evaluation
    │   └── simulate.js       tickMonth(state) → state
    ├── render/           — canvas: iso projection, terrain, structures, overlays, effects
    ├── ui/               — DOM: hud, build palette, inspector, panels, modal, toasts
    ├── io/               — input, localStorage persistence, WebAudio
    └── telemetry/        — HEALTH / PRESSURE / EFFICIENCY probes
```

**State flows one way.** Input produces a command, the command returns a *new*
state, the renderer and UI read it. `tickMonth(state) → state` is pure: no
wall-clock reads, no `Math.random`, no DOM. Every stochastic decision draws from
`(seed, rollCount)`, so a save file replays exactly and every crisis outcome is
reproducible.

**Buildings are data.** Adding a structure to `config/buildings.js` makes it
appear in the palette, on the map, and in the economy with no other code change —
the renderer draws every structure procedurally from its catalog entry.

---

## Tests

```bash
cd games/gridlock
npm test        # node --test tests/*.test.mjs
```

77 tests, no framework and no dependencies:

| Suite | Covers |
|---|---|
| `grid` | terrain determinism, buildable centre, neighbour clipping, seeded RNG |
| `iso` | projection round-trip under zoom and pan, tile picking, camera clamps |
| `commands` | every placement rule, refunds, the un-removable Nexus, clamped settings |
| `network` | road connectivity, orphan islands, deterministic rationing order |
| `synergy` | per-neighbour multipliers, caps, penalties, non-mutating preview |
| `simulate` | tick purity and determinism, growth, brownouts, heat bounds, solvency |
| `events` | deck integrity, cost gating, seeded risk, the Nexus surviving destruction |
| `conditions` | crisis trigger conditions, grace period, cooldown, single-crisis rule |
| `directives` | queue refill, streak reset, rewards, victory |
| `balance` | a fixed district over 10 years: fills, pays for itself, stays cool |

The `conditions` suite includes a guard that no crisis condition compares the
clamped utility ratio against a value above 1 — a bug that shipped once and made
Grid Surge fire every single month.

## Telemetry

Press `` ` `` in game, or load `?debug=1`, for the live HEALTH / PRESSURE /
EFFICIENCY readout: frame rate, draw and tick cost, heap, dropped-frame rate,
and particle count. A built-out city ticks in well under 1ms and draws in ~3ms.
