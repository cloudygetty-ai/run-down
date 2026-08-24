import { Button } from '../../types/input';
import type { Move } from '../../types/move';
import { blast, box, cost, hit, input, move } from '../builders';

const QCF = [2, 3, 6];
const QCB = [2, 1, 4];
const DP = [6, 2, 3];
const SUPER_MOTION = [2, 3, 6, 2, 3, 6];

/** HELIOS — the highest damage in the game on the shortest health bar. */
export const HELIOS_MOVES: readonly Move[] = [
  move({
    id: 'helios.solarFang',
    name: 'Solar Fang',
    kind: 'special',
    input: input(QCF, Button.Heavy),
    startup: 16,
    active: 4,
    recovery: 26,
    hit: hit({
      damage: 130,
      chipDamage: 22,
      hitstun: 32,
      blockstun: 20,
      hitstop: 13,
      launch: 0.2,
      pushback: 0.24,
      driveDamageOnBlock: 300,
    }),
    hitboxes: [box(1.0, 1.3, 0.55, 1.3, 16, 19)],
    cancels: ['@super'],
    travel: { forward: 0.24, up: 0 },
  }),
  move({
    id: 'helios.corona',
    name: 'Corona Rise',
    kind: 'special',
    input: input(DP, Button.Heavy),
    startup: 7,
    active: 6,
    recovery: 32,
    hit: hit({
      damage: 110,
      hitstun: 36,
      blockstun: 16,
      hitstop: 12,
      launch: 0.45,
      juggleCost: 2,
      pushback: 0.14,
    }),
    hitboxes: [box(0.6, 1.55, 0.58, 1.35, 7, 12)],
    invuln: { start: 1, end: 8, kind: 'full' },
    travel: { forward: 0.1, up: 0.38 },
  }),
  move({
    id: 'helios.flare',
    name: 'Flare',
    kind: 'special',
    input: input(QCB, Button.Ki),
    startup: 12,
    active: 1,
    recovery: 20,
    hit: hit({ damage: 0 }),
    cost: cost(18),
    airOk: true,
    projectile: blast({
      speed: 0.55,
      radius: 0.55,
      lifetime: 70,
      clashPower: 3,
      hit: hit({ damage: 75, chipDamage: 15, hitstun: 24, blockstun: 16, hitstop: 9, pushback: 0.18 }),
    }),
  }),
  move({
    id: 'helios.supernova',
    name: 'Supernova',
    kind: 'super',
    input: input(SUPER_MOTION, Button.Heavy),
    startup: 9,
    active: 6,
    recovery: 50,
    hit: hit({
      damage: 360,
      chipDamage: 60,
      hitstun: 56,
      hitstop: 24,
      knockdown: true,
      guardBreak: true,
      pushback: 0.45,
      juggleCost: 0,
    }),
    hitboxes: [box(1.2, 1.2, 1.6, 2.0, 9, 14)],
    cost: cost(0, 0, 3000),
    invuln: { start: 1, end: 8, kind: 'full' },
  }),
];
