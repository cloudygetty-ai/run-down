import * as THREE from 'three';
import { designFor, type FighterDesign } from './design';
import { boxPart, capsule, createAura, createMaterials, limb, scarLines, spherePart, type RigMaterials } from './rigParts';

/**
 * Fighter assembly.
 *
 * The rig is a plain Object3D hierarchy with named joints. Posing is done by
 * writing rotations onto those joints (see pose.ts) — there is no skinning and
 * no animation data, which keeps every frame of every character inspectable and
 * tweakable as numbers.
 */

export type RigJoints = {
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  elbowL: THREE.Group;
  shoulderR: THREE.Group;
  elbowR: THREE.Group;
  hipL: THREE.Group;
  kneeL: THREE.Group;
  hipR: THREE.Group;
  kneeR: THREE.Group;
};

export type Rig = {
  design: FighterDesign;
  root: THREE.Group;
  joints: RigJoints;
  materials: RigMaterials;
  aura: THREE.Points;
  /** Trailing copies used by fighters whose ascended form leaves afterimages. */
  afterimages: THREE.Group[];
  dispose: () => void;
};

const BASE = {
  hipHeight: 0.92,
  torsoLength: 0.58,
  neckHeight: 0.6,
  headRadius: 0.155,
  shoulderY: 0.5,
  upperArm: 0.31,
  forearm: 0.29,
  armRadius: 0.072,
  thigh: 0.44,
  shin: 0.42,
  legRadius: 0.1,
};

function addCostume(
  design: FighterDesign,
  joints: RigJoints,
  materials: RigMaterials,
  scale: number,
  shoulderWidth: number,
): void {
  const { costume } = design;

  if (costume.shoulders === 'stone') {
    for (const side of [-1, 1]) {
      const pad = boxPart(0.3 * scale, 0.18 * scale, 0.3 * scale, materials.secondary, materials.outline);
      pad.position.set(side * shoulderWidth * 1.05, BASE.shoulderY * scale, 0);
      joints.torso.add(pad);
    }
  } else if (costume.shoulders === 'single') {
    const pad = boxPart(0.26 * scale, 0.16 * scale, 0.28 * scale, materials.trim, materials.outline);
    pad.position.set(shoulderWidth * 1.05, BASE.shoulderY * scale, 0);
    joints.torso.add(pad);
  } else if (costume.shoulders === 'pads') {
    for (const side of [-1, 1]) {
      const pad = boxPart(0.22 * scale, 0.1 * scale, 0.24 * scale, materials.trim, materials.outline);
      pad.position.set(side * shoulderWidth, BASE.shoulderY * scale, 0);
      joints.torso.add(pad);
    }
  }

  if (costume.top === 'halfCape' || costume.top === 'coat') {
    const length = costume.top === 'coat' ? 0.95 : 0.7;
    const cape = boxPart(
      shoulderWidth * 1.9,
      length * scale,
      0.05 * scale,
      materials.secondary,
      materials.outline,
    );
    cape.position.set(0, (BASE.shoulderY - length / 2) * scale, -0.16 * scale);
    joints.torso.add(cape);
  }

  if (costume.legs === 'skirtPanels') {
    for (const side of [-1, 1]) {
      const panel = boxPart(0.16 * scale, 0.42 * scale, 0.06 * scale, materials.trim, materials.outline);
      panel.position.set(side * 0.16 * scale, -0.2 * scale, 0.02 * scale);
      joints.hips.add(panel);
    }
  } else if (costume.legs === 'robe') {
    const robe = boxPart(0.42 * scale, 0.86 * scale, 0.3 * scale, materials.primary, materials.outline);
    robe.position.y = -0.42 * scale;
    joints.hips.add(robe);
  }

  if (costume.belt !== 'none') {
    const belt = boxPart(
      0.4 * scale,
      costume.belt === 'heavy' ? 0.12 * scale : 0.07 * scale,
      0.3 * scale,
      costume.belt === 'chain' ? materials.trim : materials.secondary,
      materials.outline,
    );
    joints.hips.add(belt);
  }

  const scarMaterial = materials.glow;
  joints.torso.add(
    scarLines(costume.scarring, 0.42 * scale, BASE.torsoLength * scale, scarMaterial),
  );
}

function addHair(design: FighterDesign, joints: RigJoints, materials: RigMaterials, scale: number): void {
  const r = BASE.headRadius * design.build.headSize * scale;
  switch (design.hair) {
    case 'bald':
      return;
    case 'braid': {
      const cap = spherePart(r * 1.08, materials.hair, materials.outline);
      cap.scale.set(1, 0.9, 1);
      joints.head.add(cap);
      const braid = capsule(r * 0.3, r * 4.4, materials.hair, materials.outline);
      braid.position.set(0, -r * 2.3, -r * 1.0);
      joints.head.add(braid);
      return;
    }
    case 'bob': {
      const cap = spherePart(r * 1.14, materials.hair, materials.outline);
      cap.scale.set(1, 0.95, 1.05);
      cap.position.y = r * 0.1;
      joints.head.add(cap);
      return;
    }
    case 'hooded': {
      const hood = spherePart(r * 1.5, materials.primary, materials.outline);
      hood.scale.set(1, 1.2, 1.1);
      hood.position.set(0, r * 0.15, -r * 0.15);
      joints.head.add(hood);
      return;
    }
    case 'sleek': {
      const cap = spherePart(r * 1.06, materials.hair, materials.outline);
      cap.scale.set(1, 0.8, 1.2);
      cap.position.set(0, r * 0.15, -r * 0.2);
      joints.head.add(cap);
      return;
    }
    case 'wild': {
      for (let i = 0; i < 7; i++) {
        const spike = capsule(r * 0.2, r * (1.1 + (i % 3) * 0.5), materials.hair, materials.outline);
        const angle = (i / 7) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * r * 0.6, r * 1.1, Math.sin(angle) * r * 0.6);
        spike.rotation.set(Math.sin(angle) * 0.7, 0, -Math.cos(angle) * 0.7);
        joints.head.add(spike);
      }
      return;
    }
    default:
      return;
  }
}

export function buildRig(characterId: string, gradient: THREE.DataTexture): Rig {
  const design = designFor(characterId);
  const materials = createMaterials(design.palette, gradient);
  const { build } = design;
  const s = build.height;
  const shoulderWidth = 0.21 * build.shoulderWidth * s;
  const hipWidth = 0.13 * build.hipWidth * s;
  const armR = BASE.armRadius * build.limbThickness * s;
  const legR = BASE.legRadius * build.limbThickness * s;

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = BASE.hipHeight * s;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);

  const chest = capsule(0.2 * build.shoulderWidth * s, BASE.torsoLength * s * 0.7, materials.primary, materials.outline);
  chest.position.y = BASE.torsoLength * s * 0.42;
  torso.add(chest);

  const pelvis = capsule(0.16 * build.hipWidth * s, 0.12 * s, materials.primary, materials.outline);
  hips.add(pelvis);

  const head = new THREE.Group();
  head.position.y = BASE.neckHeight * s;
  torso.add(head);
  const skull = spherePart(BASE.headRadius * build.headSize * s, materials.skin, materials.outline);
  head.add(skull);
  const eyes = new THREE.Mesh(
    new THREE.BoxGeometry(0.11 * s, 0.022 * s, 0.01 * s),
    materials.glow,
  );
  eyes.position.set(0, 0.02 * s, BASE.headRadius * build.headSize * s * 0.95);
  head.add(eyes);

  const makeArm = (side: number): [THREE.Group, THREE.Group] => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderWidth, BASE.shoulderY * s, 0);
    torso.add(shoulder);
    shoulder.add(limb(armR, BASE.upperArm * s, materials.skin, materials.outline));

    const elbow = new THREE.Group();
    elbow.position.y = -BASE.upperArm * s;
    shoulder.add(elbow);
    elbow.add(
      limb(
        armR * 0.92,
        BASE.forearm * s,
        design.costume.handWraps ? materials.trim : materials.skin,
        materials.outline,
      ),
    );
    const hand = spherePart(armR * 1.25, materials.skin, materials.outline);
    hand.position.y = -BASE.forearm * s;
    elbow.add(hand);
    return [shoulder, elbow];
  };

  const makeLeg = (side: number): [THREE.Group, THREE.Group] => {
    const hip = new THREE.Group();
    hip.position.set(side * hipWidth, -0.04 * s, 0);
    hips.add(hip);
    hip.add(limb(legR, BASE.thigh * s, materials.primary, materials.outline));

    const knee = new THREE.Group();
    knee.position.y = -BASE.thigh * s;
    hip.add(knee);
    knee.add(limb(legR * 0.88, BASE.shin * s, materials.secondary, materials.outline));
    const foot = boxPart(legR * 2.1, legR * 1.1, legR * 3.2, materials.secondary, materials.outline);
    foot.position.set(0, -BASE.shin * s, legR * 0.7);
    knee.add(foot);
    return [hip, knee];
  };

  const [shoulderL, elbowL] = makeArm(-1);
  const [shoulderR, elbowR] = makeArm(1);
  const [hipL, kneeL] = makeLeg(-1);
  const [hipR, kneeR] = makeLeg(1);

  const joints: RigJoints = {
    hips, torso, head, shoulderL, elbowL, shoulderR, elbowR, hipL, kneeL, hipR, kneeR,
  };

  addCostume(design, joints, materials, s, shoulderWidth);
  addHair(design, joints, materials, s);

  const aura = createAura(design.aura.particles, design.palette.auraCore, 0.19 * s);
  root.add(aura);

  const afterimages: THREE.Group[] = [];
  for (let i = 0; i < design.ascended.afterimages; i++) {
    const ghost = new THREE.Group();
    ghost.visible = false;
    afterimages.push(ghost);
  }

  const dispose = (): void => {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
      }
    });
    for (const material of materials.all) {
      material.dispose();
    }
  };

  return { design, root, joints, materials, aura, afterimages, dispose };
}
