import * as THREE from 'three';
import { ROSTER } from '../engine/data/characters';
import { buildRig } from './rig';
import { createToonGradient } from './scene';

/**
 * Character-select portraits.
 *
 * Each portrait is the fighter's actual in-game rig, rendered once into an
 * offscreen canvas and handed back as a data URL. Using the real model rather
 * than an illustration means a portrait can never drift out of sync with the
 * character it represents — change a design table and the select screen updates
 * itself.
 *
 * One renderer is created, used for every fighter, and disposed. WebGL contexts
 * are a scarce browser resource and a per-card renderer would exhaust them.
 */

const WIDTH = 260;
const HEIGHT = 320;

/** A relaxed three-quarter stance — readable, and not mid-attack. */
function poseForPortrait(rig: ReturnType<typeof buildRig>): void {
  const j = rig.joints;
  j.torso.rotation.y = 0.5;
  j.torso.rotation.x = rig.design.build.stanceLean;
  j.head.rotation.y = -0.25;
  // Hands at chest height, not at the chin: a high guard hides the chest and
  // shoulder line, which is most of what distinguishes these silhouettes.
  j.shoulderL.rotation.set(-0.22, 0, 0.5);
  j.elbowL.rotation.x = -0.66;
  j.shoulderR.rotation.set(-0.12, 0, -0.42);
  j.elbowR.rotation.x = -0.5;
  j.hipL.rotation.set(-0.18, 0, 0.12);
  j.kneeL.rotation.x = 0.3;
  j.hipR.rotation.set(0.2, 0, -0.1);
  j.kneeR.rotation.x = 0.26;
}

export function renderPortraits(): Map<string, string> {
  const portraits = new Map<string, string>();

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  // Lit far hotter than the arena: several fighters wear near-black palettes,
  // and at thumbnail size an accurate-but-dim portrait reads as an empty card.
  const key = new THREE.DirectionalLight(0xfff4e0, 4.2);
  key.position.set(3, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 2.2);
  fill.position.set(-2, 2, 6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x8b5cf6, 2.6);
  rim.position.set(-4, 3, -3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xb9a8e0, 1.4));

  const camera = new THREE.PerspectiveCamera(34, WIDTH / HEIGHT, 0.1, 40);
  const gradient = createToonGradient();

  for (const character of ROSTER) {
    const rig = buildRig(character.id, gradient);
    poseForPortrait(rig);
    scene.add(rig.root);
    // Aura is noise at thumbnail size and hides the silhouette.
    rig.aura.visible = false;

    // Frame the fighter by their own height so a 0.9-scale Sei and a 1.28
    // Korvath both fill the card instead of one looking lost in it.
    const height = 1.8 * rig.design.build.height;
    camera.position.set(1.35, height * 0.6, 3.0);
    camera.lookAt(0, height * 0.48, 0);

    renderer.render(scene, camera);
    portraits.set(character.id, canvas.toDataURL('image/png'));

    scene.remove(rig.root);
    rig.dispose();
  }

  gradient.dispose();
  renderer.dispose();
  return portraits;
}
