/**
 * Runtime self-report. Per the engine contract every non-trivial module must
 * answer three questions at runtime: am I alive, how hard am I working, and
 * what am I leaking.
 *
 * Zero cost when nothing reads it — the probes are two counters and an EMA.
 */

const EMA = (prev, next, alpha = 0.12) => (prev === 0 ? next : prev * (1 - alpha) + next * alpha);

export const createTelemetry = () => {
  const t = {
    frames: 0, ticks: 0, drops: 0,
    frameMs: 0, drawMs: 0, tickMs: 0,
    lastFrameAt: 0, startedAt: Date.now(),
  };

  return {
    /** Called once per animation frame with the frame delta. */
    frame(deltaMs) {
      t.frames += 1;
      t.frameMs = EMA(t.frameMs, deltaMs);
      if (deltaMs > 50) t.drops += 1; // Below ~20fps counts as a dropped frame.
      t.lastFrameAt = Date.now();
    },
    draw(ms) { t.drawMs = EMA(t.drawMs, ms); },
    tick(ms) { t.ticks += 1; t.tickMs = EMA(t.tickMs, ms); },

    /** HEALTH — is the loop alive and recent? */
    health() {
      const silentMs = Date.now() - t.lastFrameAt;
      return { alive: silentMs < 2000, silentMs, upMs: Date.now() - t.startedAt, frames: t.frames };
    },
    /** PRESSURE — how hard is it working? */
    pressure() {
      return {
        fps: t.frameMs > 0 ? 1000 / t.frameMs : 0,
        drawMs: t.drawMs,
        tickMs: t.tickMs,
        ticks: t.ticks,
      };
    },
    /** EFFICIENCY — what is it leaking? */
    efficiency() {
      const heap = typeof performance !== 'undefined' && performance.memory
        ? performance.memory.usedJSHeapSize / 1048576
        : null;
      return { heapMb: heap, dropRate: t.frames ? t.drops / t.frames : 0 };
    },
    snapshot() {
      return { health: this.health(), pressure: this.pressure(), efficiency: this.efficiency() };
    },
  };
};
