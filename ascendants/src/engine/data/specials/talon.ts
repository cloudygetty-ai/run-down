import { Button } from '../../types/input';
import type { Move } from '../../types/move';
import { box, cost, hit, input, move } from '../builders';

const QCF = [2, 3, 6];
const QCB = [2, 1, 4];
const SUPER_MOTION = [2, 3, 6, 2, 3, 6];

/** TALON — wins by answering. Almost every tool is conditional on the opponent. */
export const TALON_MOVES: readonly Move[] = [
  move({
    id: 'talon.counter',
    name: 'Counterweight',
    kind: 'special',
    input: input(QCB, Button.Guard),
    startup: 3,
    active: 4,
    recovery: 26,
    // Strike-invulnerable through the read window, then swings. Whiffing it
    // against a patient opponent is a full punish, which is the whole cost.
    hit: hit({
      damage: 120,
      hitstun: 36,
      blockstun: 18,
      hitstop: 14,
      knockdown: true,
      pushback: 0.22,
    }),
    hitboxes: [box(0.75, 1.2, 0.5, 1.0, 3, 6)],
    cost: cost(0, 500),
    invuln: { start: 1, end: 14, kind: 'strike' },
  }),
  move({
    id: 'talon.hookKick',
    name: 'Hook Kick',
    kind: 'special',
    input: input(QCF, Button.Heavy),
    startup: 14,
    active: 4,
    recovery: 22,
    hit: hit({
      damage: 100,
      chipDamage: 14,
      hitstun: 30,
      blockstun: 18,
      hitstop: 11,
      wallBounce: true,
      pushback: 0.26,
    }),
    hitboxes: [box(0.95, 1.35, 0.5, 1.15, 14, 17)],
    cancels: ['@super'],
    travel: { forward: 0.2, up: 0 },
  }),
  move({
    id: 'talon.airDive',
    name: 'Falling Talon',
    kind: 'special',
    input: input(QCF, Button.Medium),
    startup: 10,
    active: 6,
    recovery: 18,
    hit: hit({
      damage: 85,
      hitstun: 30,
      blockstun: 16,
      hitstop: 10,
      knockdown: true,
      juggleCost: 2,
      pushback: 0.14,
    }),
    hitboxes: [box(0.6, 0.6, 0.5, 1.1, 10, 15)],
    groundOk: false,
    airOk: true,
    travel: { forward: 0.42, up: -0.22 },
  }),
  move({
    id: 'talon.retribution',
    name: 'Retribution',
    kind: 'super',
    input: input(SUPER_MOTION, Button.Guard),
    startup: 8,
    active: 5,
    recovery: 44,
    hit: hit({
      damage: 310,
      hitstun: 52,
      hitstop: 20,
      knockdown: true,
      guardBreak: true,
      pushback: 0.3,
      juggleCost: 0,
    }),
    hitboxes: [box(1.0, 1.2, 0.6, 1.4, 8, 12)],
    cost: cost(0, 0, 3000),
    invuln: { start: 1, end: 10, kind: 'full' },
    travel: { forward: 0.28, up: 0 },
  }),
];
