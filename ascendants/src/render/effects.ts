import * as THREE from 'three';
import { KI_MAX } from '../engine/data/constants';
import type { Fighter } from '../engine/types/fighter';
import type { EffectEvent, Projectile } from '../engine/types/match';
import type { Vec3 } from '../engine/math/vec3';
import type { Rig } from './rig';

/**
 * Visual effects: aura, impact flashes and projectile bodies.
 *
 * All three are pooled and reused. A fighting game spawns effects in bursts —
 * a super can produce dozens in two frames — and allocating during those bursts
 * is exactly when a garbage collection pause would be least forgivable.
 */

const IMPACT_POOL = 24;
const IMPACT_LIFE = 14;

/** Height of a fighter's chest, where beam distance is measured from. */
const CHEST_HEIGHT = 1.15;
/**
 * Arm reach (~0.6) plus a hair of clearance, so a beam leaves the hands with
 * daylight in front of them rather than starting inside the torso.
 */
const HAND_CLEARANCE = 0.62;

/** Reposition and fade a fighter's aura for the current frame. */
export function updateAura(rig: Rig, fighter: Fighter, timeSec: number): void {
  const material = rig.aura.material as THREE.PointsMaterial;
  const charging = fighter.state === 'charge';
  const kiRatio = fighter.ki / KI_MAX;

  // The aura is a readout, not decoration: how bright it is tells the opponent
  // how much ki you are holding, and it flares when you are charging.
  const targetOpacity = fighter.transformed ? 0.95 : charging ? 0.85 : kiRatio * 0.4;
  material.opacity += (targetOpacity - material.opacity) * 0.2;
  if (material.opacity < 0.01) {
    rig.aura.visible = false;
    return;
  }
  rig.aura.visible = true;

  const design = rig.design;
  const style = design.aura;
  const scale = fighter.transformed ? design.ascended.auraScale : 1;
  material.color.set(fighter.transformed ? design.ascended.auraCore : design.palette.auraCore);
  material.size = 0.19 * design.build.height * scale;

  const positions = rig.aura.geometry.getAttribute('position') as THREE.BufferAttribute;
  const count = positions.count;
  const height = 2.4 * design.build.height * scale;

  for (let i = 0; i < count; i++) {
    // Deterministic-looking scatter from the index keeps particles from
    // flickering between frames while still reading as chaotic motion.
    const seed = i * 12.9898;
    const angle = seed + timeSec * style.speed * (charging ? 2.2 : 1);
    const rise = (timeSec * style.speed * 0.8 + i / count) % 1;
    const spread = style.shape === 'flame' ? 1 - rise * 0.7 : style.shape === 'motes' ? 1 : 1 - rise * 0.3;
    const radius = style.radius * scale * spread * (0.4 + ((i * 7) % 10) / 14);

    positions.setXYZ(
      i,
      Math.cos(angle) * radius,
      rise * height + (style.shape === 'heavy' ? -0.3 : 0),
      Math.sin(angle) * radius,
    );
  }
  positions.needsUpdate = true;
}

export type ImpactPoolHandle = {
  group: THREE.Group;
  spawn: (events: readonly EffectEvent[]) => void;
  update: () => void;
  dispose: () => void;
};

const EFFECT_COLORS: Record<EffectEvent['kind'], number> = {
  impact: 0xfff1c9,
  block: 0x8ab4ff,
  parry: 0x9dff7a,
  launch: 0xffd166,
  clash: 0xffffff,
  transform: 0xffe8a3,
  vanish: 0xc4b5fd,
  ko: 0xff5252,
  daze: 0xffb3b3,
  erasure: 0xff2d2d,
};

export function createImpactPool(): ImpactPoolHandle {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.5, 1);
  const meshes: THREE.Mesh[] = [];
  const lives: number[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];

  for (let i = 0; i < IMPACT_POOL; i++) {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    group.add(mesh);
    meshes.push(mesh);
    materials.push(material);
    lives.push(0);
  }

  let cursor = 0;

  const spawn = (events: readonly EffectEvent[]): void => {
    for (const event of events) {
      const mesh = meshes[cursor];
      const material = materials[cursor];
      if (!mesh || !material) {
        continue;
      }
      mesh.position.set(event.pos.x, event.pos.y + 1.1, event.pos.z);
      mesh.scale.setScalar(0.34 + event.power * 0.3);
      material.color.setHex(EFFECT_COLORS[event.kind] ?? 0xffffff);
      material.opacity = 0.95;
      mesh.visible = true;
      lives[cursor] = IMPACT_LIFE;
      // Oldest slot is overwritten first: under a burst, losing the earliest
      // flash is invisible, while dropping the newest would look broken.
      cursor = (cursor + 1) % IMPACT_POOL;
    }
  };

  const update = (): void => {
    for (let i = 0; i < meshes.length; i++) {
      const life = lives[i] ?? 0;
      if (life <= 0) {
        continue;
      }
      const mesh = meshes[i];
      const material = materials[i];
      const next = life - 1;
      lives[i] = next;
      if (!mesh || !material) {
        continue;
      }
      const t = next / IMPACT_LIFE;
      material.opacity = t * 0.95;
      // Grow modestly: a flash that expands faster than it fades ends up a
      // screen-filling blob that hides the two fighters it is reporting on.
      mesh.scale.multiplyScalar(1.045);
      mesh.rotation.y += 0.2;
      if (next <= 0) {
        mesh.visible = false;
      }
    }
  };

  const dispose = (): void => {
    geometry.dispose();
    for (const material of materials) {
      material.dispose();
    }
  };

  return { group, spawn, update, dispose };
}

export type ProjectileViewHandle = {
  group: THREE.Group;
  sync: (
    projectiles: readonly Projectile[],
    accents: readonly [string, string],
    ownerPositions: readonly [Vec3, Vec3],
  ) => void;
  dispose: () => void;
};

/** Keeps one mesh alive per live projectile id, creating and retiring on demand. */
export function createProjectileView(): ProjectileViewHandle {
  const group = new THREE.Group();
  const blastGeometry = new THREE.SphereGeometry(1, 14, 10);
  // Tapered: narrow where it leaves the caster's hands, wide at the leading
  // edge. A uniform tube reads as a wall with no direction to it, so the flare
  // is what tells you at a glance which way the beam is travelling.
  const beamGeometry = new THREE.CylinderGeometry(1, 0.3, 1, 14, 1, true);
  beamGeometry.rotateX(Math.PI / 2);
  // After the rotation the wide end sits at +Z. Shifting the body to z <= 0
  // makes the projectile's position the leading TIP, with the beam extending
  // back to the caster rather than straddling the position and engulfing them.
  beamGeometry.translate(0, 0, -0.5);
  const active = new Map<number, THREE.Mesh>();

  const sync = (
    projectiles: readonly Projectile[],
    accents: readonly [string, string],
    ownerPositions: readonly [Vec3, Vec3],
  ): void => {
    const seen = new Set<number>();

    for (const projectile of projectiles) {
      seen.add(projectile.id);
      let mesh = active.get(projectile.id);
      if (!mesh) {
        const material = new THREE.MeshBasicMaterial({
          color: accents[projectile.owner],
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        mesh = new THREE.Mesh(
          projectile.kind === 'beam' ? beamGeometry : blastGeometry,
          material,
        );
        group.add(mesh);
        active.set(projectile.id, mesh);
      }

      mesh.position.set(projectile.pos.x, projectile.pos.y, projectile.pos.z);
      if (projectile.kind === 'beam') {
        // A beam spans from its owner's hands to its leading tip, so its length
        // is the distance actually travelled — not a constant, which would
        // either overshoot behind the caster or fall short of them.
        const origin = ownerPositions[projectile.owner];
        // Distance is measured from the caster's chest, but the beam must leave
        // the HANDS with a little daylight in front of them — anchored at the
        // chest it starts inside the torso. HAND_CLEARANCE is the arm reach
        // plus a small gap, subtracted from the length so the tail moves
        // forward while the leading tip stays put.
        const travelled = Math.hypot(
          projectile.pos.x - origin.x,
          projectile.pos.y - (origin.y + CHEST_HEIGHT),
          projectile.pos.z - origin.z,
        );
        const length = Math.max(0.8, travelled - HAND_CLEARANCE);
        mesh.scale.set(projectile.radius, projectile.radius, length);
        mesh.lookAt(
          projectile.pos.x + projectile.vel.x,
          projectile.pos.y + projectile.vel.y,
          projectile.pos.z + projectile.vel.z,
        );
      } else {
        const pulse = projectile.clashWith >= 0 ? 1.5 : 1;
        mesh.scale.setScalar(projectile.radius * pulse);
      }
    }

    for (const [id, mesh] of active) {
      if (seen.has(id)) {
        continue;
      }
      group.remove(mesh);
      (mesh.material as THREE.Material).dispose();
      active.delete(id);
    }
  };

  const dispose = (): void => {
    blastGeometry.dispose();
    beamGeometry.dispose();
    for (const mesh of active.values()) {
      (mesh.material as THREE.Material).dispose();
    }
    active.clear();
  };

  return { group, sync, dispose };
}
