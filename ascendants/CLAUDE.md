# CLAUDE.md — ASCENDANTS

Repo-specific operating rules. Read `README.md` first for what the game is.

---

## The one rule that breaks everything if you get it wrong

**`step()` must stay pure and deterministic.**

`src/engine/sim/step.ts` takes `(state, inputs, config)` and returns a new
state. Rollback re-runs past frames on both peers and compares checksums. If a
single operation is non-deterministic, matches desync and the failure is
silent — two players quietly playing different games.

Inside `src/engine/**` you may **never**:

- call `Math.sin`, `Math.cos`, `Math.tan`, `Math.atan`, `Math.atan2`
  (use `engine/math/trig.ts` — they are implementation-defined and drift)
- call `Math.random` (use `engine/math/rng.ts`, whose state lives in `MatchState`)
- read a clock (`Date.now`, `performance.now`)
- import from `render`, `ui`, `net`, `client`, or `three`
- store `undefined` in state that gets snapshotted
- mutate a `Vec3` component in place — always assign a whole new vector
  (snapshots share vector references precisely because they are immutable)

`Math.sqrt`, `Math.abs`, `Math.round`, `Math.floor`, `Math.min/max` and
`Math.imul` are all exactly specified and safe.

The lint config enforces the import boundary. It cannot catch the rest — you
have to.

After any engine change, run `npm test`. `sim/step.test.ts` and
`net/rollback.test.ts` are the guards; if either fails, determinism is broken
and nothing else matters until it is fixed.

---

## Layering

```
engine  →  (nothing)
net     →  engine
render  →  engine
ui      →  engine, render
client  →  everything
server  →  net/protocol only
```

Dependencies flow one way. No upward imports, ever.

Appearance lives in `render/design/`, not in the engine. A character's colours
must never be able to influence a hitbox.

---

## Where things live

| You want to change | Go to |
|---|---|
| Frame data, hitboxes, move properties | `engine/data/universal.ts`, `engine/data/specials/<name>.ts` |
| Character stats and pronouns | `engine/data/characters.ts` |
| Physics, meters, round timings | `engine/data/constants.ts` |
| Finisher names, the announcer callout | `engine/data/finishers.ts` |
| How a fighter looks | `render/design/index.ts` |
| How a fighter animates | `render/pose.ts` |
| Hit priority (invuln → armor → parry → block → counter) | `engine/combat/resolve.ts` |
| Netcode | `net/rollback.ts` |

Prefer data over logic. Most balance changes should be a number in a table, not
a branch in a function.

---

## Adding a character

1. Add stats, lore and `pronoun` to `engine/data/characters.ts`.
2. Add `engine/data/specials/<id>.ts` with three specials and one super, and
   register it in `engine/data/moves.ts`.
3. Add an Erasure to `engine/data/finishers.ts`.
4. Add a `FighterDesign` to `render/design/index.ts`.

Move ownership is derived from the id prefix (`sei.updraft` belongs to `sei`,
`u.*` to everyone), so there is no second list to keep in sync.

New designs must pass the silhouette test: blacked out at thumbnail size, the
fighter should still be identifiable. Check the shoulder width and height
against the existing six before picking colours.

---

## Conventions

- TypeScript strict, including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. No `any`.
- One file, one job. Past ~200 lines, ask whether it should be split.
- Comments explain **why**, never what. If a line needs a comment to say what it
  does, rename something instead.
- Tests co-located as `Module.test.ts`.
- Frame counts, not seconds, anywhere near gameplay. A fighting game's feel
  lives in exact frame advantage.

## Before committing

```bash
npm run type-check && npm run lint && npm test && npm run build
```

All four must pass.

## Commit format

```
feat(engine): add beam clash contest
fix(net): correct rollback depth accounting
chore(render): tune impact flash scale
```
