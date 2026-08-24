import { cloneState } from '../engine/sim/clone';
import { checksum } from '../engine/sim/hash';
import { createMatch } from '../engine/sim/init';
import { step } from '../engine/sim/step';
import { NEUTRAL_INPUT, type FrameInputs, type PlayerInput } from '../engine/types/input';
import type { MatchConfig, MatchState } from '../engine/types/match';

/**
 * Rollback netcode.
 *
 * The local player's input is applied the frame it is pressed, so the game
 * never feels laggy. The remote player's input has not arrived yet, so it is
 * predicted — repeat what they did last frame, which is right the large
 * majority of the time because inputs are held across frames.
 *
 * When the real input arrives and contradicts the prediction, the session
 * rewinds to that frame, corrects it, and re-simulates forward at full speed.
 * The player sees a small visual snap instead of input delay, which is the
 * trade every modern fighting game makes.
 *
 * The whole scheme rests on `step` being pure and deterministic. If that ever
 * stops being true, this class silently produces two different matches.
 */

export const MAX_ROLLBACK_FRAMES = 12;
const RING_SIZE = 64;

export type RollbackTelemetry = {
  /** HEALTH: frames simulated since the session started. */
  framesSimulated: number;
  /** PRESSURE: how often prediction was wrong and cost a resimulation. */
  rollbacks: number;
  resimulatedFrames: number;
  deepestRollback: number;
  /** EFFICIENCY: frames the local player was held back waiting on a peer. */
  stalledFrames: number;
  /** FAILURE: confirmed checksum disagreements with the remote peer. */
  desyncs: number;
  lastConfirmedFrame: number;
};

type Ring<T> = (T | undefined)[];

function ringGet<T>(ring: Ring<T>, frame: number): T | undefined {
  return frame < 0 ? undefined : ring[frame % RING_SIZE];
}

function ringSet<T>(ring: Ring<T>, frame: number, value: T): void {
  ring[frame % RING_SIZE] = value;
}

export class RollbackSession {
  private state: MatchState;
  private currentFrame = 0;
  /** Inputs actually confirmed by their owner, per player. */
  private readonly confirmed: [Ring<PlayerInput>, Ring<PlayerInput>] = [[], []];
  /** Inputs actually used to simulate each frame, per player. */
  private readonly used: [Ring<PlayerInput>, Ring<PlayerInput>] = [[], []];
  private readonly snapshots: Ring<MatchState> = [];
  private readonly checksums: Ring<number> = [];
  private rewindTo = -1;
  private remoteConfirmedThrough = -1;

  readonly telemetry: RollbackTelemetry = {
    framesSimulated: 0,
    rollbacks: 0,
    resimulatedFrames: 0,
    deepestRollback: 0,
    stalledFrames: 0,
    desyncs: 0,
    lastConfirmedFrame: -1,
  };

  constructor(
    private readonly config: MatchConfig,
    private readonly localPlayer: 0 | 1,
  ) {
    this.state = createMatch(config);
  }

  get frame(): number {
    return this.currentFrame;
  }

  get current(): MatchState {
    return this.state;
  }

  private get remotePlayer(): 0 | 1 {
    return this.localPlayer === 0 ? 1 : 0;
  }

  addLocalInput(frame: number, input: PlayerInput): void {
    ringSet(this.confirmed[this.localPlayer], frame, input);
  }

  /**
   * Accept a remote input. If it contradicts what was predicted for a frame
   * already simulated, schedule a rewind to that frame.
   */
  addRemoteInput(frame: number, input: PlayerInput): void {
    if (frame <= this.remoteConfirmedThrough || frame < this.currentFrame - MAX_ROLLBACK_FRAMES) {
      return;
    }
    ringSet(this.confirmed[this.remotePlayer], frame, input);
    if (frame > this.remoteConfirmedThrough) {
      this.remoteConfirmedThrough = frame;
      this.telemetry.lastConfirmedFrame = frame;
    }

    if (frame >= this.currentFrame) {
      return;
    }
    const predicted = ringGet(this.used[this.remotePlayer], frame);
    if (predicted && predicted.dir === input.dir && predicted.buttons === input.buttons) {
      return;
    }
    this.rewindTo = this.rewindTo < 0 ? frame : Math.min(this.rewindTo, frame);
  }

  /** Repeat the peer's last known input — right most of the time, cheap always. */
  private predictRemote(frame: number): PlayerInput {
    for (let f = frame; f >= Math.max(0, frame - MAX_ROLLBACK_FRAMES); f--) {
      const known = ringGet(this.confirmed[this.remotePlayer], f);
      if (known) {
        return known;
      }
    }
    return NEUTRAL_INPUT;
  }

  private inputsFor(frame: number): FrameInputs {
    const local =
      ringGet(this.confirmed[this.localPlayer], frame) ?? NEUTRAL_INPUT;
    const remote =
      ringGet(this.confirmed[this.remotePlayer], frame) ?? this.predictRemote(frame - 1);
    ringSet(this.used[this.localPlayer], frame, local);
    ringSet(this.used[this.remotePlayer], frame, remote);
    return this.localPlayer === 0 ? [local, remote] : [remote, local];
  }

  private simulateFrame(): void {
    ringSet(this.snapshots, this.currentFrame, cloneState(this.state));
    this.state = step(this.state, this.inputsFor(this.currentFrame), this.config);
    ringSet(this.checksums, this.currentFrame, checksum(this.state));
    this.currentFrame += 1;
  }

  private resimulate(): void {
    const target = this.rewindTo;
    this.rewindTo = -1;
    const snapshot = ringGet(this.snapshots, target);
    if (!snapshot) {
      // Older than the ring can reach. Nothing correct is possible here, so
      // surface it rather than quietly playing a diverged match.
      this.telemetry.desyncs += 1;
      return;
    }

    const depth = this.currentFrame - target;
    this.telemetry.rollbacks += 1;
    this.telemetry.resimulatedFrames += depth;
    this.telemetry.deepestRollback = Math.max(this.telemetry.deepestRollback, depth);

    const resumeAt = this.currentFrame;
    this.state = cloneState(snapshot);
    this.currentFrame = target;
    while (this.currentFrame < resumeAt) {
      this.simulateFrame();
    }
  }

  /**
   * Advance one frame. Returns false when the session must wait for the peer —
   * running further would exceed the rollback budget and make a correction
   * impossible.
   */
  advance(): boolean {
    if (this.rewindTo >= 0) {
      this.resimulate();
    }
    if (this.currentFrame - this.remoteConfirmedThrough > MAX_ROLLBACK_FRAMES) {
      this.telemetry.stalledFrames += 1;
      return false;
    }
    this.simulateFrame();
    this.telemetry.framesSimulated += 1;
    return true;
  }

  /** Compare a peer's reported hash for a frame we have already simulated. */
  verifyChecksum(frame: number, value: number): boolean {
    const local = ringGet(this.checksums, frame);
    if (local === undefined) {
      return true;
    }
    if (local !== value) {
      this.telemetry.desyncs += 1;
      return false;
    }
    return true;
  }

  checksumAt(frame: number): number | undefined {
    return ringGet(this.checksums, frame);
  }

  /** Local inputs from the last `count` frames, for redundant transmission. */
  recentLocalInputs(count: number): { frame: number; packed: PlayerInput[] } {
    const end = this.currentFrame - 1;
    const start = Math.max(0, end - count + 1);
    const packed: PlayerInput[] = [];
    for (let f = start; f <= end; f++) {
      packed.push(ringGet(this.confirmed[this.localPlayer], f) ?? NEUTRAL_INPUT);
    }
    return { frame: end, packed };
  }
}
