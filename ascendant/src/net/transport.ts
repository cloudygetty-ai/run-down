import { decode, encode, isServerMessage, type ClientMessage, type ServerMessage } from './protocol';

/**
 * Transport abstraction.
 *
 * The rollback session knows nothing about sockets — it is handed inputs and
 * asked to advance. Keeping the socket behind this interface is what lets the
 * same session run against a real server, a loopback for tests, or a replay
 * file without changing a line of netcode.
 */

export type MessageHandler = (message: ServerMessage) => void;

export interface Transport {
  readonly connected: boolean;
  /** Round-trip time in milliseconds, or -1 before the first pong. */
  readonly rttMs: number;
  send(message: ClientMessage): void;
  onMessage(handler: MessageHandler): void;
  onClose(handler: (reason: string) => void): void;
  close(reason?: string): void;
}

const PING_INTERVAL_MS = 2000;

export class WebSocketTransport implements Transport {
  private socket: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private closeHandlers: ((reason: string) => void)[] = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private rtt = -1;
  /** Queued while the socket is still opening, flushed on connect. */
  private pending: string[] = [];

  constructor(private readonly url: string) {}

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  get rttMs(): number {
    return this.rtt;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;

      socket.onopen = () => {
        for (const queued of this.pending) {
          socket.send(queued);
        }
        this.pending = [];
        this.pingTimer = setInterval(() => {
          this.send({ type: 'ping', sent: Date.now() });
        }, PING_INTERVAL_MS);
        resolve();
      };

      socket.onerror = () => {
        reject(new Error(`Could not reach ${this.url}`));
      };

      socket.onclose = (event) => {
        this.stopPing();
        for (const handler of this.closeHandlers) {
          handler(event.reason || 'connection closed');
        }
      };

      socket.onmessage = (event) => {
        const message = decode(String(event.data));
        if (!message || !isServerMessage(message)) {
          return;
        }
        // Answer pings inline so latency measurement never depends on the
        // game loop still running.
        if (message.type === 'ping') {
          this.send({ type: 'pong', sent: message.sent });
          return;
        }
        if (message.type === 'pong') {
          this.rtt = Date.now() - message.sent;
          return;
        }
        for (const handler of this.handlers) {
          handler(message);
        }
      };
    });
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  send(message: ClientMessage): void {
    const raw = encode(message);
    if (this.connected) {
      this.socket?.send(raw);
    } else {
      this.pending.push(raw);
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  onClose(handler: (reason: string) => void): void {
    this.closeHandlers.push(handler);
  }

  close(reason = 'client closed'): void {
    this.stopPing();
    this.send({ type: 'bye', reason });
    this.socket?.close();
    this.socket = null;
  }
}

/** In-process transport used by tests and local practice against a script. */
export class LoopbackTransport implements Transport {
  private handlers: MessageHandler[] = [];
  private closeHandlers: ((reason: string) => void)[] = [];
  readonly sent: ClientMessage[] = [];
  connected = true;
  rttMs = 0;

  send(message: ClientMessage): void {
    this.sent.push(message);
  }

  /** Inject a message as though it had arrived from the server. */
  deliver(message: ServerMessage): void {
    for (const handler of this.handlers) {
      handler(message);
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  onClose(handler: (reason: string) => void): void {
    this.closeHandlers.push(handler);
  }

  close(reason = 'closed'): void {
    this.connected = false;
    for (const handler of this.closeHandlers) {
      handler(reason);
    }
  }
}
