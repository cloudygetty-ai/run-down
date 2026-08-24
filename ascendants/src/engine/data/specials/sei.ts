import { Button } from '../../types/input';
import type { Move } from '../../types/move';
import { box, cost, hit, input, move } from '../builders';

const QCF = [2, 3, 6];
const QCB = [2, 1, 4];
const DP = [6, 2, 3];
const SUPER_MOTION = [2, 3, 6, 2, 3, 6];

/** SEI — fastest kit in the game, and the lowest damage per touch. */
export const SEI_MOVES: readonly Move[] = [
  move({
    id: 'sei.nineStep',
    name: 'Nine Step',
    kind: 'special',
    input: input(QCB, Button.Light),
    startup: 10,
    active: 3,
    recovery: 16,
    hit: hit({ damage: 70, hitstun: 24, blockstun: 15, hitstop: 7, pushback: 0.08 }),
    hitboxes: [box(0.7, 1.2, 0.48, 0.9, 10, 12)],
    cost: cost(6),
    cancels: ['@super'],
    travel: { forward: 1.15, up: 0 },
  }),
  move({
    id: 'sei.razorRush',
    name: 'Razor Rush',
    kind: 'special',
    input: input(QCF, Button.Medium),
    startup: 12,
    active: 15,
    recovery: 22,
    // Three separate active windows, so each connects independently and the
    // string can be blocked partway through rather than being all-or-nothing.
    hit: hit({ damage: 30, hitstun: 18, blockstun: 13, hitstop: 5, juggleCost: 1, pushback: 0.04 }),
    hitboxes: [
      box(0.7, 1.2, 0.44, 0.9, 12, 14),
      box(0.85, 1.25, 0.44, 0.95, 18, 20),
      box(1.0, 1.3, 0.46, 1.0, 24, 26),
    ],
    cancels: ['@super'],
    travel: { forward: 0.22, up: 0 },
  }),
  move({
    id: 'sei.updraft',
    name: 'Updraft',
    kind: 'special',
    input: input(DP, Button.Medium),
    startup: 5,
    active: 5,
    recovery: 26,
    hit: hit({
      damage: 80,
      hitstun: 32,
      blockstun: 14,
      hitstop: 10,
      launch: 0.4,
      juggleCost: 2,
      pushback: 0.1,
    }),
    hitboxes: [box(0.55, 1.5, 0.5, 1.2, 5, 9)],
    invuln: { start: 1, end: 6, kind: 'full' },
    travel: { forward: 0.1, up: 0.36 },
  }),
  move({
    id: 'sei.thousandCuts',
    name: 'Thousand Cuts',
    kind: 'super',
    input: input(SUPER_MOTION, Button.Medium),
    startup: 7,
    active: 20,
    recovery: 40,
    hit: hit({
      damage: 60,
      hitstun: 20,
      hitstop: 8,
      juggleCost: 0,
      pushback: 0.03,
      kiGainOnHit: 0,
    }),
    hitboxes: [
      box(0.8, 1.2, 0.5, 1.1, 7, 9),
      box(0.9, 1.25, 0.5, 1.1, 12, 14),
      box(1.0, 1.3, 0.5, 1.1, 17, 19),
      box(1.1, 1.35, 0.55, 1.2, 22, 26),
    ],
    cost: cost(0, 0, 3000),
    invuln: { start: 1, end: 6, kind: 'full' },
    travel: { forward: 0.3, up: 0 },
  }),
];
