# Run Down

A mobile battle royale game built with React Native. 100 players drop onto a map. Meteors rain from orbit. The last one standing wins.

No storm. No circle. Just rocks falling from the sky.

---

## Gameplay

- **100 players** spawn across a 1600×1600 map
- **Meteor bombardment** replaces the traditional shrinking zone — 6 phases, each tightening the safe shelter radius
- Players must stay inside the **shelter zone** or take continuous meteor damage
- Loot weapons, shoot enemies, build cover
- Bot AI fills the lobby — they flee meteors, engage enemies, and loot drops

### Controls (mobile)

| Input | Action |
|---|---|
| Left joystick | Move |
| Right side tap | Shoot |
| Reload button | Reload current weapon |
| Build toggle | Switch to build mode |
| Weapon slots | Tap to switch weapon |

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.72 |
| Language | TypeScript 5.0 |
| State | Zustand |
| Persistence | AsyncStorage |
| Testing | Jest + React Native Testing Library |

---

## Project Structure

```
src/
├── core/
│   ├── gameEngine/     — tick loop, input processing, game logic
│   ├── meteor/         — bombardment phases, impact detection
│   └── physics/        — collision detection
├── services/
│   ├── ai/             — bot decision-making (flee, engage, loot, wander)
│   ├── weapons/        — fire rate, spread, reload timers
│   └── state/          — Zustand global store
├── screens/            — Lobby, Game, GameOver
├── components/         — HUD, GameMap, Joystick, PlayerSprite, etc.
├── utils/              — math helpers, logger
└── types/              — TypeScript interfaces
```

---

## Setup

### Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio (for Android) or Xcode 14+ (for iOS)

### Install

```bash
git clone https://github.com/cloudygetty-ai/run-down.git
cd run-down
npm install
cp config.example.js config.js
```

### Run

```bash
# Android
npm run android

# iOS
npm run ios

# Metro bundler only
npm start
```

### Browser demo

Open `demo.html` directly in Chrome or Firefox — no server needed. Runs at native 4K resolution on high-DPI displays.

---

## Development

```bash
# Run tests
npm test

# Lint
npm run lint

# Type check
npm run type-check
```

Tests are co-located with source files (`Module.ts` → `Module.test.ts`).

All tests must pass and lint must be clean before committing.

---

## Architecture

### Game loop

Each tick (50ms):
1. Process player input
2. Tick bot AI decisions
3. Advance meteor bombardment phase
4. Run physics / collision detection
5. Update Zustand store → re-render

### Meteor phases

| Phase | Safe radius |
|---|---|
| 1 | 700 |
| 2 | 560 |
| 3 | 420 |
| 4 | 280 |
| 5 | 140 |
| 6 | 70 |

### Bot AI priority

1. Flee to shelter (if outside zone)
2. Engage nearest enemy (if within 150 units)
3. Pick up loot (if within 60 units)
4. Wander randomly

---

## License

MIT
