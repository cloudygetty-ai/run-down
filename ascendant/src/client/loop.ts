import { TICK_MS } from '../engine/data/constants';

/**
 * Fixed-timestep game loop.
 *
 * The simulation must advance in whole 60Hz frames regardless of the display's
 * refresh rate — frame data is meaningless otherwise, and rollback requires
 * both peers to count frames the same way. Rendering runs at whatever rate the
 * browser offers; only the simulation is pinned.
 *
 * The accumulator is capped so a backgrounded tab that wakes with a two-second
 * debt does not try to simulate 120 frames in one go and lock the page. Time
 * beyond the cap is discarded, which shows up as a brief skip rather than a
 * freeze.
 */

const MAX_STEPS_PER_FRAME = 5;
const MAX_ACCUMULATED_MS = TICK_MS * 8;

export type LoopTelemetry = {
  /** HEALTH: rendered frames per second, smoothed. */
  fps: number;
  /** PRESSURE: simulation steps taken in the last rendered frame. */
  stepsLastFrame: number;
  /** EFFICIENCY: simulation time discarded because the tab fell behind. */
  droppedMs: number;
  totalSteps: number;
};

export type LoopCallbacks = {
  /** Advance one simulation frame. Return false to stall (e.g. awaiting a peer). */
  tick: () => boolean;
  render: (deltaSeconds: number) => void;
};

export class GameLoop {
  private running = false;
  private handle = 0;
  private lastTime = 0;
  private accumulator = 0;

  readonly telemetry: LoopTelemetry = {
    fps: 0,
    stepsLastFrame: 0,
    droppedMs: 0,
    totalSteps: 0,
  };

  constructor(private readonly callbacks: LoopCallbacks) {}

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.handle = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.handle);
  }

  get isRunning(): boolean {
    return this.running;
  }

  private readonly frame = (now: number): void => {
    if (!this.running) {
      return;
    }
    this.handle = requestAnimationFrame(this.frame);

    const elapsed = now - this.lastTime;
    this.lastTime = now;

    if (elapsed > 0) {
      // Smoothed so a single long frame does not make the readout jump.
      this.telemetry.fps += (1000 / elapsed - this.telemetry.fps) * 0.1;
    }

    this.accumulator += elapsed;
    if (this.accumulator > MAX_ACCUMULATED_MS) {
      this.telemetry.droppedMs += this.accumulator - MAX_ACCUMULATED_MS;
      this.accumulator = MAX_ACCUMULATED_MS;
    }

    let steps = 0;
    while (this.accumulator >= TICK_MS && steps < MAX_STEPS_PER_FRAME) {
      if (!this.callbacks.tick()) {
        // Stalled waiting on something external; keep the debt for next frame
        // rather than silently dropping frames the opponent will send.
        break;
      }
      this.accumulator -= TICK_MS;
      steps++;
    }

    this.telemetry.stepsLastFrame = steps;
    this.telemetry.totalSteps += steps;
    this.callbacks.render(elapsed / 1000);
  };
}
