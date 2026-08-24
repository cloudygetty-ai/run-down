import type { Hitbox, HitProps, InvulnWindow, Move, MoveCost, MoveInput, MoveKind, ProjectileSpec } from '../types/move';
import { vec3, type Vec3 } from '../math/vec3';

/**
 * Terse constructors for the move tables.
 *
 * WHY: frame data is read far more often than it is written — during balance
 * passes an engineer scans dozens of moves at once. Defaults here mean each
 * move entry states only what makes it different, so the tables stay legible.
 */

const DEFAULT_HIT: HitProps = {
  damage: 0,
  chipDamage: 0,
  hitstun: 16,
  blockstun: 12,
  hitstop: 6,
  pushback: 0.09,
  launch: 0,
  juggleCost: 1,
  knockdown: false,
  wallBounce: false,
  guardBreak: false,
  kiGainOnHit: 3,
  kiGainOnBlock: 1,
  driveDamageOnBlock: 120,
};

export function hit(overrides: Partial<HitProps> & { damage: number }): HitProps {
  return { ...DEFAULT_HIT, ...overrides };
}

/** Capsule hitbox in fighter-local space; +z is forward. */
export function box(
  forward: number,
  height: number,
  radius: number,
  length: number,
  startFrame: number,
  endFrame: number,
): Hitbox {
  return { offset: vec3(0, height, forward), radius, length, startFrame, endFrame };
}

export function cost(ki = 0, drive = 0, superMeter = 0): MoveCost {
  return { ki, drive, superMeter };
}

export const NO_COST: MoveCost = { ki: 0, drive: 0, superMeter: 0 };

export function input(motion: readonly number[], button: number, holdDir?: number): MoveInput {
  return holdDir === undefined ? { motion, button } : { motion, button, holdDir };
}

export function blast(overrides: Partial<ProjectileSpec> & { hit: HitProps }): ProjectileSpec {
  return {
    kind: 'blast',
    speed: 0.42,
    radius: 0.45,
    lifetime: 90,
    spawnOffset: vec3(0, 1.1, 0.9),
    homing: 0,
    clashPower: 1,
    pierce: false,
    ...overrides,
  };
}

export function beam(overrides: Partial<ProjectileSpec> & { hit: HitProps }): ProjectileSpec {
  return {
    kind: 'beam',
    speed: 0.85,
    radius: 0.8,
    lifetime: 70,
    spawnOffset: vec3(0, 1.15, 1.1),
    homing: 0,
    clashPower: 4,
    pierce: true,
    ...overrides,
  };
}

export type MoveSpec = {
  id: string;
  name: string;
  kind: MoveKind;
  input: MoveInput;
  startup: number;
  active: number;
  recovery: number;
  hit: HitProps;
  hitboxes?: readonly Hitbox[];
  cost?: MoveCost;
  cancels?: readonly string[];
  groundOk?: boolean;
  airOk?: boolean;
  travel?: { forward: number; up: number };
  projectile?: ProjectileSpec;
  invuln?: InvulnWindow;
  finisher?: boolean;
};

/**
 * Assemble a Move. Optional fields are attached only when present so the
 * result satisfies exactOptionalPropertyTypes and never carries `undefined`
 * into a state snapshot.
 */
export function move(spec: MoveSpec): Move {
  return {
    id: spec.id,
    name: spec.name,
    kind: spec.kind,
    input: spec.input,
    startup: spec.startup,
    active: spec.active,
    recovery: spec.recovery,
    hitboxes: spec.hitboxes ?? [],
    hit: spec.hit,
    cost: spec.cost ?? NO_COST,
    cancels: spec.cancels ?? [],
    groundOk: spec.groundOk ?? true,
    airOk: spec.airOk ?? false,
    ...(spec.travel ? { travel: spec.travel } : {}),
    ...(spec.projectile ? { projectile: spec.projectile } : {}),
    ...(spec.invuln ? { invuln: spec.invuln } : {}),
    ...(spec.finisher ? { finisher: spec.finisher } : {}),
  };
}

export function localOffset(forward: number, height: number): Vec3 {
  return vec3(0, height, forward);
}
