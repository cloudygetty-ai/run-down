import * as THREE from 'three';
import { ARENA_RADIUS } from '../engine/data/constants';
import { getCharacter } from '../engine/data/characters';
import type { EffectEvent, MatchState } from '../engine/types/match';
import { createFightCamera, type FightCamera } from './camera';
import { createImpactPool, createProjectileView, updateAura } from './effects';
import { poseRig } from './pose';
import { buildRig, type Rig } from './rig';
import { createScene, type SceneBundle } from './scene';
import { createStage, type Stage } from './stage';

/**
 * The bridge from simulation state to pixels.
 *
 * The view is strictly a reader: it never writes to MatchState and holds no
 * authority over anything. That separation is what allows the renderer to skip
 * frames, interpolate, or be swapped out entirely without touching the game.
 *
 * Effects are passed in accumulated rather than read off the current state,
 * because the simulation may have advanced several frames since the last draw
 * and a dropped impact flash is a dropped piece of feedback.
 */

const SHAKE_THRESHOLD = 0.8;
const WALL_MARGIN = 1.6;

export class MatchView {
  private readonly bundle: SceneBundle;
  private readonly stage: Stage;
  private readonly rigs: [Rig, Rig];
  private readonly impacts = createImpactPool();
  private readonly projectiles = createProjectileView();
  private readonly camera: FightCamera;
  private readonly accents: [string, string];
  private elapsed = 0;

  constructor(canvas: HTMLCanvasElement, characterIds: readonly [string, string]) {
    this.bundle = createScene(canvas);
    this.stage = createStage(this.bundle.gradient);
    this.bundle.scene.add(this.stage.group);

    this.rigs = [
      buildRig(characterIds[0], this.bundle.gradient),
      buildRig(characterIds[1], this.bundle.gradient),
    ];
    for (const rig of this.rigs) {
      this.bundle.scene.add(rig.root);
    }

    this.bundle.scene.add(this.impacts.group);
    this.bundle.scene.add(this.projectiles.group);
    this.camera = createFightCamera(this.bundle.camera);
    this.accents = [
      getCharacter(characterIds[0]).accent,
      getCharacter(characterIds[1]).accent,
    ];
  }

  resize(): void {
    this.bundle.resize();
  }

  render(state: MatchState, effects: readonly EffectEvent[], deltaSeconds: number): void {
    this.elapsed += deltaSeconds;

    for (const index of [0, 1] as const) {
      const fighter = state.fighters[index];
      const rig = this.rigs[index];

      rig.root.position.set(fighter.pos.x, fighter.pos.y, fighter.pos.z);
      rig.root.rotation.y = fighter.facing;
      // An erased fighter sinks out of the arena rather than simply vanishing.
      rig.root.visible = fighter.state !== 'erased' || fighter.stateFrame < 60;
      if (fighter.state === 'erased') {
        rig.root.position.y -= fighter.stateFrame * 0.02;
      }

      poseRig(rig, fighter, this.elapsed);
      updateAura(rig, fighter, this.elapsed);

      const radius = Math.hypot(fighter.pos.x, fighter.pos.z);
      if (radius > ARENA_RADIUS - WALL_MARGIN) {
        this.stage.pulseBarrier(fighter.pos.x, fighter.pos.z, 0.5);
      }
    }

    this.impacts.spawn(effects);
    for (const effect of effects) {
      if (effect.power >= SHAKE_THRESHOLD || effect.kind === 'erasure') {
        this.camera.shake(Math.min(1.2, effect.power * 0.6));
      }
    }
    this.impacts.update();

    this.projectiles.sync(state.projectiles, this.accents, [
      state.fighters[0].pos,
      state.fighters[1].pos,
    ]);
    this.stage.update(this.elapsed);
    this.camera.update(state, deltaSeconds);

    this.bundle.renderer.render(this.bundle.scene, this.bundle.camera);
  }

  /**
   * Whether the opponent currently sits to the screen-right of this fighter.
   *
   * The client needs this to translate "player pressed right" into "toward the
   * opponent". It is derived from the live camera orientation, so it stays
   * correct through cross-ups and camera side flips alike.
   */
  towardSign(state: MatchState, index: 0 | 1): number {
    const self = state.fighters[index];
    const opponent = state.fighters[index === 0 ? 1 : 0];
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.bundle.camera.quaternion);
    const toOpponent = new THREE.Vector3(
      opponent.pos.x - self.pos.x,
      0,
      opponent.pos.z - self.pos.z,
    );
    if (toOpponent.lengthSq() < 1e-6) {
      return 1;
    }
    return right.dot(toOpponent) >= 0 ? 1 : -1;
  }

  /** Exposed so the client can report EFFICIENCY telemetry without a global. */
  get drawInfo(): THREE.WebGLInfo['render'] {
    return this.bundle.renderer.info.render;
  }

  dispose(): void {
    for (const rig of this.rigs) {
      rig.dispose();
    }
    this.stage.dispose();
    this.impacts.dispose();
    this.projectiles.dispose();
    this.bundle.dispose();
  }
}
