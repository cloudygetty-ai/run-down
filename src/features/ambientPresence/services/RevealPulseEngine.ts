import { REVEAL_INTERVAL_MS, REVEAL_DURATION_MS } from '../types';

export type PulseHandler = (isActive: boolean) => void;

// Drives the 5-minute breathing cycle: fires handler(true) every REVEAL_INTERVAL_MS,
// then fires handler(false) exactly REVEAL_DURATION_MS later.
export class RevealPulseEngine {
  private cycleId: ReturnType<typeof setInterval> | null = null;
  private endId: ReturnType<typeof setTimeout> | null = null;
  private readonly handler: PulseHandler;

  constructor(handler: PulseHandler) {
    this.handler = handler;
  }

  start(): void {
    this.stop();
    this.cycleId = setInterval(() => this.fire(), REVEAL_INTERVAL_MS);
  }

  stop(): void {
    if (this.cycleId !== null) clearInterval(this.cycleId);
    if (this.endId !== null) clearTimeout(this.endId);
    this.cycleId = null;
    this.endId = null;
  }

  // Triggers a pulse immediately, independent of the recurring cycle.
  fireImmediate(): void {
    this.fire();
  }

  private fire(): void {
    this.handler(true);
    this.endId = setTimeout(() => this.handler(false), REVEAL_DURATION_MS);
  }
}
