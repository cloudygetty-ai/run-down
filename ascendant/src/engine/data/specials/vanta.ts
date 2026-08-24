import { Button } from '../../types/input';
import type { Move } from '../../types/move';
import { beam, blast, box, cost, hit, input, move } from '../builders';

const QCF = [2, 3, 6];
const QCB = [2, 1, 4];
const DP = [6, 2, 3];
const SUPER_MOTION = [2, 3, 6, 2, 3, 6];

/** VANTA — the reference kit. Every archetype is measured against this one. */
export const VANTA_MOVES: readonly Move[] = [
  move({
    id: 'vanta.riftPalm',
    name: 'Rift Palm',
    kind: 'special',
    input: input(QCF, Button.Ki),
    startup: 14,
    active: 1,
    recovery: 24,
    hit: hit({ damage: 0 }),
    cost: cost(12),
    airOk: true,
    projectile: blast({
      speed: 0.5,
      radius: 0.5,
      hit: hit({ damage: 65, chipDamage: 12, hitstun: 22, blockstun: 16, hitstop: 8, pushback: 0.15 }),
      clashPower: 2,
    }),
  }),
  move({
    id: 'vanta.ascensionKnee',
    name: 'Ascension Knee',
    kind: 'special',
    input: input(DP, Button.Heavy),
    startup: 6,
    active: 6,
    recovery: 28,
    // Invulnerable on the way up: the universal answer to jump-ins, and
    // deliberately unsafe on block so it cannot be thrown out for free.
    hit: hit({
      damage: 95,
      hitstun: 34,
      blockstun: 16,
      hitstop: 11,
      launch: 0.42,
      juggleCost: 2,
      pushback: 0.12,
    }),
    hitboxes: [box(0.6, 1.5, 0.55, 1.3, 6, 11)],
    invuln: { start: 1, end: 7, kind: 'full' },
    travel: { forward: 0.12, up: 0.34 },
  }),
  move({
    id: 'vanta.phaseStep',
    name: 'Phase Step',
    kind: 'special',
    input: input(QCB, Button.Light),
    startup: 4,
    active: 1,
    recovery: 12,
    hit: hit({ damage: 0 }),
    cost: cost(8),
    airOk: true,
    // Passes through fireballs but not fists — a positioning tool, not an escape.
    invuln: { start: 1, end: 12, kind: 'projectile' },
    travel: { forward: 0.62, up: 0 },
  }),
  move({
    id: 'vanta.eclipse',
    name: 'Eclipse Cannon',
    kind: 'super',
    input: input(SUPER_MOTION, Button.Ki),
    startup: 9,
    active: 1,
    recovery: 44,
    hit: hit({ damage: 0 }),
    cost: cost(0, 0, 3000),
    invuln: { start: 1, end: 8, kind: 'full' },
    projectile: beam({
      speed: 0.9,
      radius: 1.0,
      lifetime: 80,
      clashPower: 12,
      hit: hit({
        damage: 280,
        chipDamage: 45,
        hitstun: 46,
        blockstun: 26,
        hitstop: 16,
        knockdown: true,
        pushback: 0.35,
      }),
    }),
  }),
];
