import * as THREE from 'three';
import type { Palette } from './design/types';

/**
 * Primitive builders for the procedural fighters.
 *
 * Nothing here loads an asset. A fighter is a few dozen capsules and boxes
 * arranged by numbers from the design table, which means a new character costs
 * one data entry instead of a modelling pipeline.
 */

export type RigMaterials = {
  skin: THREE.MeshToonMaterial;
  hair: THREE.MeshToonMaterial;
  primary: THREE.MeshToonMaterial;
  secondary: THREE.MeshToonMaterial;
  trim: THREE.MeshToonMaterial;
  glow: THREE.MeshBasicMaterial;
  outline: THREE.MeshBasicMaterial;
  all: THREE.Material[];
};

export function createMaterials(palette: Palette, gradient: THREE.DataTexture): RigMaterials {
  const toon = (color: string): THREE.MeshToonMaterial =>
    new THREE.MeshToonMaterial({ color, gradientMap: gradient });

  const skin = toon(palette.skin);
  const hair = toon(palette.hair);
  const primary = toon(palette.primary);
  const secondary = toon(palette.secondary);
  const trim = toon(palette.trim);
  const glow = new THREE.MeshBasicMaterial({
    color: palette.glow,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  // Backface-expanded shell: the cheapest convincing anime outline there is.
  const outline = new THREE.MeshBasicMaterial({ color: 0x05030a, side: THREE.BackSide });

  return {
    skin,
    hair,
    primary,
    secondary,
    trim,
    glow,
    outline,
    all: [skin, hair, primary, secondary, trim, glow, outline],
  };
}

const OUTLINE_SCALE = 1.07;

/** Wrap a mesh with its outline shell and return the pair as one object. */
export function outlined(mesh: THREE.Mesh, outline: THREE.Material): THREE.Mesh {
  const shell = new THREE.Mesh(mesh.geometry, outline);
  shell.scale.multiplyScalar(OUTLINE_SCALE);
  mesh.add(shell);
  mesh.castShadow = true;
  return mesh;
}

export function capsule(
  radius: number,
  length: number,
  material: THREE.Material,
  outline: THREE.Material,
): THREE.Mesh {
  const geometry = new THREE.CapsuleGeometry(radius, length, 4, 10);
  return outlined(new THREE.Mesh(geometry, material), outline);
}

export function boxPart(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  outline: THREE.Material,
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  return outlined(new THREE.Mesh(geometry, material), outline);
}

export function spherePart(
  radius: number,
  material: THREE.Material,
  outline: THREE.Material,
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 16, 12);
  return outlined(new THREE.Mesh(geometry, material), outline);
}

/** A limb segment hanging downward from its joint origin. */
export function limb(
  radius: number,
  length: number,
  material: THREE.Material,
  outline: THREE.Material,
): THREE.Mesh {
  const mesh = capsule(radius, length, material, outline);
  mesh.position.y = -length / 2;
  return mesh;
}

/**
 * Glowing scar lines across the torso — the mark of having survived the Herald.
 * Intensity comes from the design's `scarring` value.
 */
export function scarLines(
  intensity: number,
  width: number,
  height: number,
  material: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  if (intensity <= 0) {
    return group;
  }
  const count = Math.round(2 + intensity * 4);
  for (let i = 0; i < count; i++) {
    const geometry = new THREE.BoxGeometry(width * (0.3 + (i % 3) * 0.22), height * 0.035, 0.02);
    const line = new THREE.Mesh(geometry, material);
    line.position.set(
      (i % 2 === 0 ? 1 : -1) * width * 0.12,
      height * (0.18 - i * 0.09),
      width * 0.34,
    );
    line.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.5;
    group.add(line);
  }
  return group;
}

/** Particle aura. Positions are re-seeded each frame by the effects layer. */
export function createAura(count: number, color: string, size: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
