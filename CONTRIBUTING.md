# Contributing to Run Down

## Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<slug>` | `feat/spectator-mode` |
| Fix | `fix/<slug>` | `fix/meteor-blast-radius` |
| Claude session | `claude/<slug>` | `claude/bot-pathfinding` |
| Chore | `chore/<slug>` | `chore/upgrade-rn-073` |

## Commit format

```
<type>(<scope>): <short description>

<body — what and why, not how>
```

Types: `feat` `fix` `refactor` `perf` `test` `docs` `chore`

Scopes: `engine` `meteor` `physics` `ai` `weapons` `state` `hud` `map` `screens`

## PR checklist

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (no skipped tests without justification)
- [ ] New logic has co-located `*.test.ts`
- [ ] Pure functions stay pure (no side effects in `core/`)
- [ ] Zustand mutations go through store actions — never mutate state directly

## Architecture rules

- `src/core/` — pure functions only. No timers, no async, no imports from `services/`.
- `src/services/` — stateful singletons (Zustand store, reload timers, bot brains).
- `src/components/` — render only. No game logic.
- All new types go in `src/types/game.ts`.
