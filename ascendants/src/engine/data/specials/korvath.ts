import { Button } from '../../types/input';
import type { Move } from '../../types/move';
import { box, cost, hit, input, move } from '../builders';

const QCF = [2, 3, 6];
const QCB = [2, 1, 4];
const DOWN_DOWN = [2, 2];
const SUPER_MOTION = [2, 3, 6, 2, 3, 6];

/** KORVATH — armor, command grabs, and no way to run away from him. */
export const KORVATH_MOVES: readonly Move[] = [
  move({
    id: 'korvath.quake',
    name: 'Quake Step',
    kind: 'special',
    input: input(QCF, Button.Heavy),
    startup: 22,
    active: 5,
    recovery: 30,
    // A ground-only shockwave: jumping beats it cleanly, which is the price of
    // a move that covers half the arena floor.
    hit: hit({
      damage: 110,
      chipDamage: 18,
      hitstun: 34,
      blockstun: 20,
      hitstop: 12,
      knockdown: true,
      pushback: 0.3,
      driveDamageOnBlock: 320,
    }),
    hitboxes: [box(2.4, 0.3, 0.7, 4.2, 22, 26)],
  }),
  move({
    id: 'korvath.grasp',
    name: 'Tectonic Grasp',
    kind: 'throw',
    input: input(QCB, Button.Light),
    startup: 8,
    active: 2,
    recovery: 34,
    hit: hit({
      damage: 150,
      hitstun: 46,
      hitstop: 18,
      knockdown: true,
      guardBreak: true,
      pushback: 0.2,
      kiGainOnHit: 10,
    }),
    hitboxes: [box(0.7, 1.1, 0.7, 0.8, 8, 9)],
  }),
  move({
    id: 'korvath.bulwark',
    name: 'Bulwark',
    kind: 'special',
    input: input(DOWN_DOWN, Button.Guard),
    startup: 4,
    active: 30,
    recovery: 14,
    hit: hit({ damage: 0 }),
    cost: cost(0, 500),
    // Two hits of armor with no offense of its own: it buys forward movement
    // through a fireball, which is exactly what this archetype lacks.
    invuln: { start: 1, end: 34, kind: 'armor', armorHits: 2 },
    travel: { forward: 0.18, up: 0 },
  }),
  move({
    id: 'korvath.gravityWell',
    name: 'Gravity Well',
    kind: 'super',
    input: input(SUPER_MOTION, Button.Heavy),
    startup: 10,
    active: 6,
    recovery: 46,
    hit: hit({
      damage: 320,
      hitstun: 54,
      hitstop: 22,
      knockdown: true,
      guardBreak: true,
      pushback: 0.1,
      juggleCost: 0,
    }),
    hitboxes: [box(1.4, 1.0, 1.9, 2.4, 10, 15)],
    cost: cost(0, 0, 3000),
    invuln: { start: 1, end: 9, kind: 'full' },
  }),
];
