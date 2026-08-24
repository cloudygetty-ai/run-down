import type * as THREE from 'three';
import { getMove } from '../engine/data/moves';
import type { Fighter } from '../engine/types/fighter';
import type { Rig } from './rig';

/**
 * Procedural posing.
 *
 * Every pose is a set of target joint rotations that the rig eases toward, so
 * transitions blend for free and no state needs an explicit animation. Attack
 * poses read the move's own frame data, which means a frame-data change
 * retimes the animation automatically instead of desynchronising from it.
 *
 * This runs on the render side and may use wall-clock time — nothing here can
 * affect the simulation.
 */

type Pose = Partial<Record<keyof Rig['joints'], [number, number, number]>>;

const BLEND = 0.35;
const SNAP = 0.75;

function ease(joint: THREE.Group, target: [number, number, number], rate: number): void {
  joint.rotation.x += (target[0] - joint.rotation.x) * rate;
  joint.rotation.y += (target[1] - joint.rotation.y) * rate;
  joint.rotation.z += (target[2] - joint.rotation.z) * rate;
}

/** Which limb leads a move, inferred from its id. */
function limbOf(moveId: string): 'punch' | 'kick' | 'cast' {
  const id = moveId.toLowerCase();
  if (/kick|heel|knee|sweep|2h|airh|talon|updraft|dive|step/.test(id)) {
    return 'kick';
  }
  if (/blast|palm|lance|flare|beam|eclipse|horizon|tether|wall|nova|ki/.test(id)) {
    return 'cast';
  }
  return 'punch';
}

const IDLE: Pose = {
  torso: [0, 0.22, 0],
  shoulderL: [-0.5, 0, 0.32],
  elbowL: [-1.05, 0, 0],
  shoulderR: [-0.35, 0, -0.28],
  elbowR: [-0.85, 0, 0],
  hipL: [-0.16, 0, 0.1],
  kneeL: [0.28, 0, 0],
  hipR: [0.2, 0, -0.08],
  kneeR: [0.24, 0, 0],
};

const GUARD: Pose = {
  torso: [0.1, 0.35, 0],
  shoulderL: [-1.5, 0, 0.5],
  elbowL: [-1.7, 0, 0],
  shoulderR: [-1.4, 0, -0.45],
  elbowR: [-1.75, 0, 0],
  hipL: [-0.2, 0, 0.12],
  kneeL: [0.4, 0, 0],
  hipR: [0.14, 0, -0.1],
  kneeR: [0.34, 0, 0],
};

const PARRY: Pose = {
  torso: [-0.08, 0.1, 0],
  shoulderL: [-1.9, 0, 0.2],
  elbowL: [-0.5, 0, 0],
  shoulderR: [-0.4, 0, -0.3],
  elbowR: [-1.2, 0, 0],
};

const CHARGE: Pose = {
  torso: [-0.22, 0, 0],
  head: [-0.3, 0, 0],
  shoulderL: [0.5, 0, 0.55],
  elbowL: [-1.9, 0, 0],
  shoulderR: [0.5, 0, -0.55],
  elbowR: [-1.9, 0, 0],
  hipL: [-0.35, 0, 0.2],
  kneeL: [0.7, 0, 0],
  hipR: [-0.35, 0, -0.2],
  kneeR: [0.7, 0, 0],
};

const HITSTUN: Pose = {
  torso: [0.35, 0, 0],
  head: [0.3, 0, 0],
  shoulderL: [0.6, 0, 0.7],
  elbowL: [-0.4, 0, 0],
  shoulderR: [0.6, 0, -0.7],
  elbowR: [-0.4, 0, 0],
  hipL: [0.25, 0, 0.15],
  hipR: [0.25, 0, -0.15],
};

const LAUNCHED: Pose = {
  torso: [-0.5, 0, 0],
  shoulderL: [2.2, 0, 0.5],
  shoulderR: [2.2, 0, -0.5],
  elbowL: [-0.3, 0, 0],
  elbowR: [-0.3, 0, 0],
  hipL: [-0.5, 0, 0.2],
  kneeL: [0.9, 0, 0],
  hipR: [-0.35, 0, -0.2],
  kneeR: [0.7, 0, 0],
};

const FLY: Pose = {
  torso: [0.25, 0, 0],
  shoulderL: [1.1, 0, 0.45],
  elbowL: [-0.6, 0, 0],
  shoulderR: [1.1, 0, -0.45],
  elbowR: [-0.6, 0, 0],
  hipL: [-0.15, 0, 0.1],
  kneeL: [0.45, 0, 0],
  hipR: [-0.1, 0, -0.1],
  kneeR: [0.35, 0, 0],
};

const KNOCKDOWN: Pose = {
  torso: [0.1, 0, 0],
  shoulderL: [1.6, 0, 0.9],
  shoulderR: [1.6, 0, -0.9],
  hipL: [-0.9, 0, 0.2],
  kneeL: [1.2, 0, 0],
  hipR: [-0.8, 0, -0.2],
  kneeR: [1.1, 0, 0],
};

const DAZED: Pose = {
  torso: [0.28, 0, 0],
  head: [0.45, 0, 0],
  shoulderL: [0.3, 0, 0.25],
  elbowL: [-0.2, 0, 0],
  shoulderR: [0.3, 0, -0.25],
  elbowR: [-0.2, 0, 0],
  hipL: [-0.1, 0, 0.15],
  kneeL: [0.35, 0, 0],
  hipR: [-0.05, 0, -0.15],
  kneeR: [0.3, 0, 0],
};

/** Attack poses interpolate between wind-up, extension and recovery. */
function attackPose(fighter: Fighter): Pose {
  if (fighter.moveId === null) {
    return IDLE;
  }
  const move = getMove(fighter.moveId);
  const frame = fighter.moveFrame;
  const extended = frame >= move.startup && frame <= move.startup + move.active;
  const limb = limbOf(move.id);

  if (limb === 'cast') {
    return extended
      ? {
          torso: [0, 0.1, 0],
          shoulderL: [-1.55, 0, 0.15],
          elbowL: [-0.1, 0, 0],
          shoulderR: [-1.55, 0, -0.15],
          elbowR: [-0.1, 0, 0],
          hipL: [-0.25, 0, 0.12],
          kneeL: [0.4, 0, 0],
        }
      : {
          torso: [-0.15, 0.5, 0],
          shoulderL: [-0.2, 0, 0.9],
          elbowL: [-2.2, 0, 0],
          shoulderR: [-0.2, 0, -0.9],
          elbowR: [-2.2, 0, 0],
        };
  }

  if (limb === 'kick') {
    return extended
      ? {
          torso: [0.1, 0.15, 0],
          hipR: [-1.5, 0, -0.1],
          kneeR: [0.15, 0, 0],
          hipL: [0.2, 0, 0.1],
          kneeL: [0.3, 0, 0],
          shoulderL: [-0.9, 0, 0.8],
          shoulderR: [-0.5, 0, -0.6],
        }
      : {
          torso: [-0.1, 0.45, 0],
          hipR: [-0.5, 0, -0.2],
          kneeR: [1.4, 0, 0],
          shoulderL: [-0.6, 0, 0.5],
          shoulderR: [-0.4, 0, -0.4],
        };
  }

  return extended
    ? {
        torso: [0, -0.32, 0],
        shoulderR: [-1.62, 0, -0.05],
        elbowR: [-0.06, 0, 0],
        shoulderL: [-0.3, 0, 0.9],
        elbowL: [-1.9, 0, 0],
        hipR: [-0.3, 0, -0.1],
        kneeR: [0.4, 0, 0],
      }
    : {
        torso: [0, 0.6, 0],
        shoulderR: [-0.5, 0, -0.75],
        elbowR: [-2.1, 0, 0],
        shoulderL: [-1.2, 0, 0.4],
        elbowL: [-1.4, 0, 0],
      };
}

function poseFor(fighter: Fighter): { pose: Pose; rate: number } {
  switch (fighter.state) {
    case 'attack':
      return { pose: attackPose(fighter), rate: SNAP };
    case 'guard':
    case 'blockstun':
      return { pose: GUARD, rate: SNAP };
    case 'parry':
      return { pose: PARRY, rate: SNAP };
    case 'charge':
      return { pose: CHARGE, rate: BLEND };
    case 'hitstun':
      return { pose: HITSTUN, rate: SNAP };
    case 'launched':
      return { pose: LAUNCHED, rate: BLEND };
    case 'knockdown':
    case 'wakeup':
      return { pose: KNOCKDOWN, rate: BLEND };
    case 'fly':
      return { pose: FLY, rate: BLEND };
    case 'dazed':
    case 'erased':
      return { pose: DAZED, rate: BLEND };
    default:
      return { pose: IDLE, rate: BLEND };
  }
}

export function poseRig(rig: Rig, fighter: Fighter, timeSec: number): void {
  const { pose, rate } = poseFor(fighter);
  const joints = rig.joints;

  for (const key of Object.keys(joints) as (keyof Rig['joints'])[]) {
    const target = pose[key] ?? IDLE[key] ?? [0, 0, 0];
    ease(joints[key], target, rate);
  }

  // Breathing and walk cycle ride on top of the pose rather than replacing it,
  // so a fighter never looks frozen between actions.
  const bob = Math.sin(timeSec * 3.4) * 0.012;
  const walking = fighter.state === 'walk' || fighter.state === 'dash';
  if (walking) {
    const cycle = Math.sin(timeSec * 13) * 0.55;
    joints.hipL.rotation.x += cycle;
    joints.hipR.rotation.x -= cycle;
    joints.shoulderL.rotation.x -= cycle * 0.5;
    joints.shoulderR.rotation.x += cycle * 0.5;
  }
  joints.hips.position.y = rig.design.build.height * 0.92 + bob;
  joints.torso.rotation.x += rig.design.build.stanceLean;

  // Hitstop is sold by a hard freeze plus a shake, not by slowing anything down.
  if (fighter.hitstop > 0) {
    joints.hips.position.x = (fighter.hitstop % 2 === 0 ? 1 : -1) * 0.03;
  } else {
    joints.hips.position.x = 0;
  }
}
