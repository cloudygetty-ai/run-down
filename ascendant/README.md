# ASCENDANT

> The sky fell. Some of us got back up.

A 3D arena fighter for the browser. Street Fighter 6's Drive system and frame
data, Mortal Kombat's round structure and finishers, and Dragon Ball's flight,
ki, beam clashes and transformations — running on a deterministic simulation
with rollback netcode.

No art assets. No game engine. Every fighter is built at runtime from a table
of numbers, and the whole simulation is one pure function.

---

## Play

```bash
npm install
npm run dev          # http://localhost:5173
npm run server       # relay on :8787, only needed for online play
```

| Mode | What it is |
|---|---|
| **Arcade** | You against the CPU, at three difficulties |
| **Local Versus** | Two players, one keyboard |
| **Online** | Rollback netcode; both players enter the same room code |

### Controls

| Input | Keyboard (P1) | Pad |
|---|---|---|
| Move / motions | `W` `A` `S` `D` | Stick / D-pad |
| Light · Medium · Heavy | `J` `K` `L` | ▢ · △ · ○ |
| Ki | `U` | ✕ |
| Guard | `Space` | RT |
| Drive (parry / impact) | `I` | LB |
| Dash | `Shift` | RB |
| Charge ki | `C` | RT |
| Vanish | `V` | R3 |

Player two uses the arrow keys and the numpad, or a second gamepad.

Directions are **relative to your opponent**: `6` is always toward them,
regardless of which side you are on, so motion inputs never flip.

---

## Systems

### Drive gauge — from Street Fighter 6

Six bars. Spend them on Drive Impact (armoured, wall-splats), Drive Parry
(absorbs and refunds a bar), Drive Rush, and Overdrive specials. Blocking burns
it. Empty the gauge and you enter **Burnout**: no drive options, chip damage
can kill you, and your blockstun grows. It is the game's central risk dial.

### Ki gauge — from Dragon Ball

Pays for blasts, flight, Vanish and transformation. It barely regenerates on
its own — the fast way to fill it is the **charge stance**, which leaves you
completely defenceless. That trade is the whole point.

**Vanish** lets you spend 25 ki mid-combo to blink behind your attacker and
reset to neutral. Without it a single launcher would mean watching an unbroken
juggle; with it, offence has to respect the escape.

**Ascend** at full ki for +25% damage and +18% speed, paid for by ki draining
continuously until you drop out of it.

### Beam clash

Two projectiles meeting head-on enter a contested clash. Beams are just
projectiles with high clash power, so the beam struggle falls out of ordinary
collision rather than needing a bespoke system.

### Rounds and the Erasure — from Mortal Kombat

Best of three, 99 seconds. **Fatal Blow** is available once per match, only
below 30% health, fully invulnerable on the way in.

A match-ending blow does not kill. It leaves the loser standing, swaying and
helpless while the announcer calls:

> ## PUT HER UNDER.

The pronoun comes from the loser's character sheet — `HER`, `HIM` or `THEM`.
The winner then has 200 frames to land their character's **Erasure**. Let the
window lapse and the match simply ends. The finisher is an option the player
takes, never a cutscene the game plays at them.

| Fighter | Erasure |
|---|---|
| VANTA | Event Silence |
| KORVATH | Burial Rite |
| SEI | The Tenth Step |
| MARROW | Long Dark |
| TALON | Final Reply |
| HELIOS | Total Eclipse |

---

## Roster

| | Fighter | Archetype | Reads as |
|---|---|---|---|
| **V** | **VANTA** · The Even Hand | Balanced reference kit | Even shoulders, long braid |
| **K** | **KORVATH** · Sunken Colossus | Armour and command grabs | A block; widest shoulders |
| **S** | **SEI** · Nine Steps | Rushdown, lowest damage | A sliver; split skirt panels |
| **M** | **MARROW** · The Long Dark | Zoner, layered projectiles | A vertical line; hooded |
| **T** | **TALON** · Counterweight | Counters and punishes | Wiry, chain belt |
| **H** | **HELIOS** · Last Light | Glass cannon | Broad top, burnt half-cape |

Every design is built to pass the silhouette test: blacked out at thumbnail
size, you should still know who you are looking at. That drove the proportions
far more than the colour did.

---

## Architecture

```
src/
├── engine/          pure simulation — no DOM, no three.js, no network
│   ├── math/        deterministic trig, seeded PRNG, vectors
│   ├── data/        frame data, roster, tuning constants, erasures
│   ├── input/       ring buffer + motion recognition
│   ├── combat/      capsules, damage, drive, ki, projectiles, resolution
│   ├── fighter/     state machine, locomotion, physics
│   ├── match/       round flow and the Erasure window
│   ├── ai/          deterministic CPU opponent
│   └── sim/         step() · snapshot · checksum
├── net/             rollback session, protocol, transports
├── render/          three.js scene, procedural rigs, poses, VFX, camera
├── ui/              HUD, menus, styles
└── client/          input mapping, fixed-timestep loop, bootstrap
server/              WebSocket relay + lobby
```

Dependencies flow one way, and a lint rule enforces it: **the engine may not
import from `render`, `ui`, `net`, `client`, or `three`.** That boundary is
what keeps the simulation deterministic and portable.

### Determinism

`step(state, inputs, config)` is pure. Same state plus same inputs always
produces the same next state, on every machine.

That is harder than it sounds in JavaScript, and it drove three decisions:

- **`Math.sin`, `Math.cos` and `Math.atan2` are banned in the engine.** IEEE-754
  exactly specifies `+ - * /` and `sqrt`, but the transcendental functions are
  implementation-defined and drift between engines and CPUs. One ULP of drift in
  a facing angle desyncs a match within seconds. `engine/math/trig.ts` provides
  polynomial replacements using only exactly-specified operations.
- **`Math.random` is banned.** A seeded xorshift128 lives in the state and is
  snapshot and restored with everything else.
- **No clocks.** Nothing in the simulation may read the time.

`checksum()` hashes floats by their exact bit pattern, so a one-ULP divergence
is caught on the frame it happens rather than after it grows visible.

### Rollback netcode

Your input applies the frame you press it. Your opponent's has not arrived yet,
so it is predicted — repeat their last input, which is right most of the time
because inputs are held across frames. When the real input contradicts the
prediction, the session rewinds, corrects, and re-simulates forward at speed.

The test suite proves the property that matters: a peer running with six frames
of delay lands on a **byte-identical** state to a peer with none.

The server is a relay, not an authority. It pairs two players, tells each which
side they are on, and forwards inputs. It never simulates a match, so it can
never be the thing that desyncs one.

---

## Development

```bash
npm run type-check   # tsc --noEmit, strict
npm run lint         # eslint, including the layering rule
npm test             # vitest — 91 tests
npm run build        # production bundle
```

Tests are co-located (`Module.ts` → `Module.test.ts`). The suite covers
deterministic trig and PRNG, motion recognition and its leniency, capsule
collision, the damage pipeline, drive and burnout, the full round and Erasure
flow, simulation purity and rollback replay, and two-peer netcode convergence.

### Tuning the game

Almost all balance lives in data, not logic:

| Change | File |
|---|---|
| Frame data, hitboxes, damage | `engine/data/universal.ts`, `engine/data/specials/*` |
| Character stats | `engine/data/characters.ts` |
| Physics, meters, timings | `engine/data/constants.ts` |
| Finisher names and the callout | `engine/data/finishers.ts` |
| Fighter appearance | `render/design/index.ts` |

---

## License

MIT
