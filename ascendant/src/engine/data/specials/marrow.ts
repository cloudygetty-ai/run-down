import { Button } from '../../types/input';
import type { Move } from '../../types/move';
import { beam, blast, cost, hit, input, move } from '../builders';

const QCF = [2, 3, 6];
const QCB = [2, 1, 4];
const DOWN_DOWN = [2, 2];
const SUPER_MOTION = [2, 3, 6, 2, 3, 6];

/** MARROW — controls space with layered projectiles; loses badly up close. */
export const MARROW_MOVES: readonly Move[] = [
  move({
    id: 'marrow.lance',
    name: 'Marrow Lance',
    kind: 'special',
    input: input(QCF, Button.Ki),
    startup: 16,
    active: 1,
    recovery: 26,
    hit: hit({ damage: 0 }),
    cost: cost(25),
    airOk: true,
    projectile: beam({
      speed: 0.95,
      radius: 0.6,
      lifetime: 60,
      clashPower: 6,
      hit: hit({ damage: 95, chipDamage: 18, hitstun: 28, blockstun: 18, hitstop: 10, pushback: 0.2 }),
    }),
  }),
  move({
    id: 'marrow.tether',
    name: 'Tether Orb',
    kind: 'special',
    input: input(QCB, Button.Ki),
    startup: 14,
    active: 1,
    recovery: 22,
    hit: hit({ damage: 0 }),
    cost: cost(15),
    airOk: true,
    // Slow and homing: it does little on its own, but it takes away the
    // opponent's option to simply stand still and block.
    projectile: blast({
      speed: 0.22,
      radius: 0.42,
      lifetime: 150,
      homing: 0.045,
      clashPower: 1,
      hit: hit({ damage: 55, chipDamage: 10, hitstun: 24, blockstun: 15, hitstop: 7, pushback: 0.1 }),
    }),
  }),
  move({
    id: 'marrow.bulwarkWall',
    name: 'Standing Wall',
    kind: 'special',
    input: input(DOWN_DOWN, Button.Ki),
    startup: 12,
    active: 1,
    recovery: 20,
    hit: hit({ damage: 0 }),
    cost: cost(20),
    // A stationary, high-clash barrier that eats incoming fireballs outright.
    projectile: blast({
      speed: 0,
      radius: 0.9,
      lifetime: 180,
      clashPower: 9,
      hit: hit({ damage: 30, chipDamage: 6, hitstun: 18, blockstun: 12, hitstop: 5, pushback: 0.06 }),
    }),
  }),
  move({
    id: 'marrow.eventHorizon',
    name: 'Event Horizon',
    kind: 'super',
    input: input(SUPER_MOTION, Button.Ki),
    startup: 11,
    active: 1,
    recovery: 48,
    hit: hit({ damage: 0 }),
    cost: cost(0, 0, 3000),
    invuln: { start: 1, end: 10, kind: 'full' },
    projectile: beam({
      speed: 1.05,
      radius: 1.35,
      lifetime: 90,
      clashPower: 20,
      hit: hit({
        damage: 330,
        chipDamage: 55,
        hitstun: 50,
        blockstun: 28,
        hitstop: 18,
        knockdown: true,
        pushback: 0.4,
      }),
    }),
  }),
];
