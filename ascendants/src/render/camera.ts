import * as THREE from 'three';
import type { Fighter } from '../engine/types/fighter';
import type { MatchState } from '../engine/types/match';

/**
 * The fighting camera.
 *
 * It sits perpendicular to the line between the two fighters and pulls back as
 * they separate, so the pair always reads as a side-on matchup no matter where
 * they are in a round arena. That is the one job: a camera that chases the
 * player instead of framing the fight makes spacing unreadable, and spacing is
 * the game.
 *
 * The perpendicular is chosen once and then kept unless the fighters actually
 * swap sides — otherwise the camera would swing wildly whenever they orbit each
 * other.
 */

const BASE_DISTANCE = 6.4;
const DISTANCE_PER_SEPARATION = 0.82;
const MAX_DISTANCE = 20;
const HEIGHT_BASE = 2.15;
const HEIGHT_PER_ALTITUDE = 0.62;
const FOLLOW = 0.12;
const SHAKE_DECAY = 0.86;

export type FightCamera = {
  update: (state: MatchState, deltaSeconds: number) => void;
  shake: (amount: number) => void;
};

function midpoint(a: Fighter, b: Fighter, out: THREE.Vector3): void {
  out.set(
    (a.pos.x + b.pos.x) / 2,
    (a.pos.y + b.pos.y) / 2,
    (a.pos.z + b.pos.z) / 2,
  );
}

export function createFightCamera(camera: THREE.PerspectiveCamera): FightCamera {
  const center = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const lookTarget = new THREE.Vector3(0, 1.2, 0);
  const axis = new THREE.Vector3(1, 0, 0);
  let side = 1;
  let shakeAmount = 0;

  const update = (state: MatchState, deltaSeconds: number): void => {
    const [a, b] = state.fighters;
    midpoint(a, b, center);

    const dx = b.pos.x - a.pos.x;
    const dz = b.pos.z - a.pos.z;
    const separation = Math.hypot(dx, dz);

    if (separation > 0.001) {
      // Perpendicular to the fighter axis on the ground plane.
      const nx = -dz / separation;
      const nz = dx / separation;
      // Flip only when the fighters have genuinely crossed over, so the shot
      // stays stable while they circle.
      if (axis.x * nx + axis.z * nz < -0.35) {
        side = -side;
      }
      axis.set(nx, 0, nz);
    }

    const distance = Math.min(MAX_DISTANCE, BASE_DISTANCE + separation * DISTANCE_PER_SEPARATION);
    const altitude = Math.max(a.pos.y, b.pos.y);

    desired.set(
      center.x + axis.x * distance * side,
      HEIGHT_BASE + altitude * HEIGHT_PER_ALTITUDE,
      center.z + axis.z * distance * side,
    );

    // Frame-rate independent smoothing: the same feel at 60 and 144 Hz.
    const blend = 1 - Math.pow(1 - FOLLOW, deltaSeconds * 60);
    camera.position.lerp(desired, blend);

    lookTarget.lerp(
      new THREE.Vector3(center.x, center.y + 1.3 + altitude * 0.25, center.z),
      blend,
    );

    if (shakeAmount > 0.001) {
      const magnitude = shakeAmount * 0.35;
      camera.position.x += (Math.random() - 0.5) * magnitude;
      camera.position.y += (Math.random() - 0.5) * magnitude;
      shakeAmount *= SHAKE_DECAY;
    } else {
      shakeAmount = 0;
    }

    camera.lookAt(lookTarget);
  };

  const shake = (amount: number): void => {
    shakeAmount = Math.min(1.5, Math.max(shakeAmount, amount));
  };

  return { update, shake };
}
