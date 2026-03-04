# Run Down

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.72-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Zustand-4.4-orange?style=flat-square" />
  <img src="https://img.shields.io/github/actions/workflow/status/cloudygetty-ai/run-down/ci.yml?style=flat-square&label=CI" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
</p>

> Mobile battle royale. 100 players. Meteors rain from orbit. Last one standing wins.
>
> No storm. No circle. Just rocks falling from the sky.

---

## Gameplay

- **100 players** spawn across a 1600×1600 map
- **Meteor bombardment** replaces the shrinking zone — 6 phases, each tightening the safe shelter radius
- Stay inside the **shelter zone** or take continuous meteor damage
- Loot weapons, shoot enemies, build cover
- **Bot AI** fills the lobby — bots flee meteors, engage enemies, and loot drops

### Controls (mobile)

| Input | Action |
|---|---|
| Left joystick | Move |
| Right side tap | Aim + shoot |
| Reload button | Reload active weapon |
| Build toggle | Switch to build mode |
| Weapon slots (1–3) | Tap to switch |

---

## Architecture

### Game Loop (50ms tick)

```
Input → moveHumanPlayer → tickBots → tickBombardment → applyMeteorDamage → checkWinCondition → Zustand → render
```

The tick function (`GameEngine.ts`) is **pure** — takes `(GameState, InputState, deltaMs)` → returns `GameState`. No side effects, no mocks needed in tests.

### Meteor Phases

| Phase | Shelter Radius | Damage/hit | Strike interval |
|---|---|---|---|
| 1 | 800 | 25 HP | 8s |
| 2 | 500 | 35 HP | 6s |
| 3 | 300 | 50 HP | 4s |
| 4 | 150 | 65 HP | 3s |
| 5 | 50 | 80 HP | 2s |
| 6 | 10 | 100 HP | 1s |

### Bot AI Priority

1. Flee to shelter (if outside zone)
2. Engage nearest enemy (if within 400 units)
3. Pick up loot (if within 60 units)
4. Wander randomly

### Weapon Stats

| Type | Damage | Fire Rate | Mag | Range |
|---|---|---|---|---|
| Assault Rifle | 35 | 5/s | 30 | 400 |
| SMG | 17 | 10/s | 35 | 200 |
| Shotgun | 110 | 0.8/s | 5 | 120 |
| Sniper | 100 | 0.5/s | 4 | 800 |
| Pickaxe | 20 | 0.9/s | ∞ | 60 |

Rarity multiplier applies to damage: Common 1.0× → Legendary 1.5×

---

## Project Structure

```
src/
├── core/
│   ├── gameEngine/       — pure tick function, shot resolution
│   ├── meteor/           — 6-phase bombardment, shelter zone shrink
│   └── physics/          — collision detection, bullet hit
├── services/
│   ├── ai/               — bot decision loop (flee, engage, loot, wander)
│   ├── weapons/          — fire rate, spread, reload timers
│   └── state/            — Zustand global store, initial state factory
├── screens/
│   ├── LobbyScreen.tsx
│   ├── GameScreen.tsx
│   └── GameOverScreen.tsx
├── components/
│   ├── GameMap.tsx
│   ├── HUD.tsx
│   ├── Joystick.tsx
│   ├── PlayerSprite.tsx
│   ├── MeteorZoneOverlay.tsx
│   ├── LootDropView.tsx
│   └── BuildPieceView.tsx
├── utils/                — math helpers (lerp, clamp, normalize, distance)
└── types/                — TypeScript interfaces (GameState, Player, Weapon…)
```

---

## Setup

### Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio (Android) or Xcode 14+ (iOS)

### Install

```bash
git clone https://github.com/cloudygetty-ai/run-down.git
cd run-down
npm install
cp config.example.js config.js
```

### Run

```bash
# iOS
npm run ios

# Android
npm run android

# Metro only
npm start
```

### Browser demo

Open `demo.html` directly in Chrome — no server needed. Runs at native 4K on high-DPI displays.

---

## Development

```bash
npm run type-check   # tsc --noEmit
npm run lint         # eslint src/
npm test             # jest (co-located *.test.ts files)
npm test -- --coverage
```

Tests are co-located: `Module.ts` → `Module.test.ts`. All tests must pass and lint must be clean before merge.

---

## Path Aliases

Configured in `tsconfig.json` and `babel.config.js`:

| Alias | Resolves to |
|---|---|
| `@core/*` | `src/core/*` |
| `@services/*` | `src/services/*` |
| `@screens/*` | `src/screens/*` |
| `@components/*` | `src/components/*` |
| `@utils/*` | `src/utils/*` |
| `@types/*` | `src/types/*` |

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.72 |
| Language | TypeScript 5.0 (strict) |
| State | Zustand 4.4 |
| Persistence | AsyncStorage |
| Testing | Jest + React Native Testing Library |
| Linting | ESLint + @react-native config |

---

## License

MIT
