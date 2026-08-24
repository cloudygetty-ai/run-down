import * as THREE from 'three';

/**
 * Renderer and lighting.
 *
 * The look is cel-shaded: flat banded lighting, hard rim light, heavy bloom-ish
 * additive effects. That is achieved with MeshToonMaterial and a two-step
 * gradient ramp rather than a post-processing stack, which keeps the frame
 * budget almost entirely free for the simulation and the particle work.
 */

export type SceneBundle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Shared two-band ramp; every toon material samples this. */
  gradient: THREE.DataTexture;
  resize: () => void;
  dispose: () => void;
};

/** A hard two-step ramp: lit or unlit, with no soft falloff between. */
export function createToonGradient(steps = 3): THREE.DataTexture {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    // Bias the ramp dark so the lit band reads as a highlight, not a wash.
    const value = Math.round(60 + (195 * i) / Math.max(1, steps - 1));
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function createScene(canvas: HTMLCanvasElement): SceneBundle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x05040a, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0714, 0.012);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  camera.position.set(0, 4, -10);

  // Key light casts the shadows; the two rims are what actually sell the
  // silhouette against a dark stage.
  const key = new THREE.DirectionalLight(0xfff4e0, 2.1);
  key.position.set(6, 14, -8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -22;
  scene.add(key);

  const rimViolet = new THREE.DirectionalLight(0x8b5cf6, 1.5);
  rimViolet.position.set(-10, 6, 9);
  scene.add(rimViolet);

  const rimAmber = new THREE.DirectionalLight(0xffa14a, 0.9);
  rimAmber.position.set(9, 3, 11);
  scene.add(rimAmber);

  scene.add(new THREE.HemisphereLight(0x4c3a7a, 0x120a1c, 0.7));

  const gradient = createToonGradient();

  const resize = (): void => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    // Cap the device pixel ratio: a fighting game must hold 60fps far more
    // than it needs a razor-sharp image on a high-DPI panel.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  };
  resize();

  const dispose = (): void => {
    gradient.dispose();
    renderer.dispose();
  };

  return { renderer, scene, camera, gradient, resize, dispose };
}
