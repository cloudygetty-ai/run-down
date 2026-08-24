import { cpuInput, type Difficulty } from '../engine/ai/cpu';
import { createMatch } from '../engine/sim/init';
import { step } from '../engine/sim/step';
import { NEUTRAL_INPUT, packInput, unpackInput, type FrameInputs, type PlayerInput } from '../engine/types/input';
import type { EffectEvent, MatchConfig, MatchState } from '../engine/types/match';
import { RollbackSession } from '../net/rollback';
import { PROTOCOL_VERSION } from '../net/protocol';
import type { Transport } from '../net/transport';

/**
 * Match runners.
 *
 * Offline and online play differ only in where the second player's input comes
 * from, so they share one interface and the game loop never branches on mode.
 * Offline deliberately skips the rollback session entirely — with both inputs
 * known there is nothing to predict, and paying for snapshots would be waste.
 */

export interface MatchRunner {
  readonly state: MatchState;
  readonly frame: number;
  /** Effects produced since the last call; draining keeps the buffer bounded. */
  drainEffects(): EffectEvent[];
  advance(localInput: PlayerInput, secondInput?: PlayerInput): boolean;
  dispose(): void;
}

const MAX_BUFFERED_EFFECTS = 256;

abstract class BaseRunner {
  protected effects: EffectEvent[] = [];

  protected collect(state: MatchState): void {
    if (state.effects.length === 0) {
      return;
    }
    this.effects.push(...state.effects);
    if (this.effects.length > MAX_BUFFERED_EFFECTS) {
      this.effects.splice(0, this.effects.length - MAX_BUFFERED_EFFECTS);
    }
  }

  drainEffects(): EffectEvent[] {
    const drained = this.effects;
    this.effects = [];
    return drained;
  }
}

export type LocalMode = { kind: 'cpu'; difficulty: Difficulty } | { kind: 'versus' };

export class LocalMatch extends BaseRunner implements MatchRunner {
  state: MatchState;
  private currentFrame = 0;

  constructor(
    private readonly config: MatchConfig,
    private readonly mode: LocalMode,
    private readonly localIndex: 0 | 1 = 0,
  ) {
    super();
    this.state = createMatch(config);
  }

  get frame(): number {
    return this.currentFrame;
  }

  advance(localInput: PlayerInput, secondInput: PlayerInput = NEUTRAL_INPUT): boolean {
    const remoteIndex = this.localIndex === 0 ? 1 : 0;
    const remote =
      this.mode.kind === 'cpu'
        ? cpuInput(this.state, remoteIndex, this.mode.difficulty)
        : secondInput;

    const inputs: FrameInputs =
      this.localIndex === 0 ? [localInput, remote] : [remote, localInput];

    this.state = step(this.state, inputs, this.config);
    this.collect(this.state);
    this.currentFrame += 1;
    return true;
  }

  dispose(): void {
    this.effects = [];
  }
}

const INPUT_REDUNDANCY = 6;

export class OnlineMatch extends BaseRunner implements MatchRunner {
  private readonly session: RollbackSession;
  private disconnected = false;
  private disconnectReason = '';

  constructor(
    config: MatchConfig,
    private readonly localIndex: 0 | 1,
    private readonly transport: Transport,
    roomId: string,
    characterId: string,
  ) {
    super();
    this.session = new RollbackSession(config, localIndex);

    this.transport.onMessage((message) => {
      if (message.type === 'input') {
        // Messages carry a window of frames; the session ignores anything it
        // has already confirmed, so replays are free.
        const oldest = message.frame - message.packed.length + 1;
        message.packed.forEach((packed, offset) => {
          this.session.addRemoteInput(oldest + offset, unpackInput(packed));
        });
        return;
      }
      if (message.type === 'checksum') {
        this.session.verifyChecksum(message.frame, message.value);
        return;
      }
      if (message.type === 'bye' || message.type === 'error') {
        this.disconnected = true;
        this.disconnectReason = message.reason;
      }
    });

    this.transport.onClose((reason) => {
      this.disconnected = true;
      this.disconnectReason = reason;
    });

    this.transport.send({
      type: 'hello',
      version: PROTOCOL_VERSION,
      roomId,
      characterId,
    });
  }

  get state(): MatchState {
    return this.session.current;
  }

  get frame(): number {
    return this.session.frame;
  }

  get isDisconnected(): boolean {
    return this.disconnected;
  }

  get reason(): string {
    return this.disconnectReason;
  }

  get telemetry(): RollbackSession['telemetry'] {
    return this.session.telemetry;
  }

  get rttMs(): number {
    return this.transport.rttMs;
  }

  /** Returns false when stalled waiting on the opponent. */
  advance(localInput: PlayerInput): boolean {
    if (this.disconnected) {
      return false;
    }
    const frame = this.session.frame;
    this.session.addLocalInput(frame, localInput);

    if (!this.session.advance()) {
      return false;
    }
    this.collect(this.session.current);

    const bundle = this.session.recentLocalInputs(INPUT_REDUNDANCY);
    this.transport.send({
      type: 'input',
      frame: bundle.frame,
      packed: bundle.packed.map(packInput),
    });

    // Periodic hash exchange: a desync is caught in under a second rather than
    // being noticed when the two screens visibly disagree.
    if (frame % 30 === 0) {
      const value = this.session.checksumAt(frame);
      if (value !== undefined) {
        this.transport.send({ type: 'checksum', frame, value });
      }
    }
    return true;
  }

  dispose(): void {
    this.effects = [];
    this.transport.close('match ended');
  }

  get localPlayerIndex(): 0 | 1 {
    return this.localIndex;
  }
}
