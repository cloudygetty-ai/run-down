import * as THREE from 'three';
import { ARENA_CEILING, ARENA_RADIUS } from '../engine/data/constants';

/**
 * The arena: a cracked crater floor under an open sky, ringed by an energy
 * barrier that only becomes visible when someone is pushed into it.
 *
 * The barrier is the readable version of a rule the simulation already
 * enforces — fighters cannot leave the disc — and showing it only on contact
 * keeps the space feeling open while still explaining the wall.
 */

export type Stage = {
  group: THREE.Group;
  /** Flash the barrier where a fighter hit it. */
  pulseBarrier: (x: number, z: number, strength: number) => void;
  update: (timeSec: number) => void;
  dispose: () => void;
};

export function createStage(gradient: THREE.DataTexture): Stage {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  const floorGeometry = new THREE.CircleGeometry(ARENA_RADIUS, 96);
  floorGeometry.rotateX(-Math.PI / 2);
  const floorMaterial = new THREE.MeshToonMaterial({
    color: 0x241a33,
    gradientMap: gradient,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.receiveShadow = true;
  group.add(floor);
  disposables.push(floorGeometry, floorMaterial);

  // Concentric rings give the eye a sense of distance and closing speed.
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x6d28d9,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });
  disposables.push(ringMaterial);
  for (const radius of [6, 12, 18, ARENA_RADIUS - 0.4]) {
    const ringGeometry = new THREE.RingGeometry(radius - 0.06, radius, 96);
    ringGeometry.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 0.01;
    group.add(ring);
    disposables.push(ringGeometry);
  }

  const barrierGeometry = new THREE.CylinderGeometry(
    ARENA_RADIUS,
    ARENA_RADIUS,
    ARENA_CEILING,
    72,
    1,
    true,
  );
  const barrierMaterial = new THREE.MeshBasicMaterial({
    color: 0x8b5cf6,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
  barrier.position.y = ARENA_CEILING / 2;
  group.add(barrier);
  disposables.push(barrierGeometry, barrierMaterial);

  const impactGeometry = new THREE.SphereGeometry(1.6, 16, 12);
  const impactMaterial = new THREE.MeshBasicMaterial({
    color: 0xc4b5fd,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const impact = new THREE.Mesh(impactGeometry, impactMaterial);
  impact.visible = false;
  group.add(impact);
  disposables.push(impactGeometry, impactMaterial);

  let barrierFlash = 0;

  const pulseBarrier = (x: number, z: number, strength: number): void => {
    impact.position.set(x, 1.4, z);
    impact.visible = true;
    barrierFlash = Math.min(1, strength);
  };

  const update = (timeSec: number): void => {
    // Slow breathing on the barrier so the arena never looks frozen.
    barrierMaterial.opacity = 0.04 + Math.sin(timeSec * 0.8) * 0.012 + barrierFlash * 0.3;
    if (barrierFlash > 0) {
      barrierFlash = Math.max(0, barrierFlash - 0.05);
      impactMaterial.opacity = barrierFlash * 0.7;
      impact.scale.setScalar(1 + (1 - barrierFlash) * 0.45);
      if (barrierFlash === 0) {
        impact.visible = false;
      }
    }
  };

  const dispose = (): void => {
    for (const item of disposables) {
      item.dispose();
    }
  };

  return { group, pulseBarrier, update, dispose };
}
