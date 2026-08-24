/**
 * Wire protocol.
 *
 * Messages are JSON: at two players and a handful of messages per frame the
 * bandwidth is irrelevant, and being able to read a packet capture during a
 * desync investigation is worth far more than the bytes saved.
 *
 * Inputs are the exception that matters — every input message carries a short
 * window of recent frames rather than a single frame. UDP-style loss over a
 * WebSocket is rare but reordering and stalls are not, and redundancy means a
 * dropped packet costs nothing instead of forcing a rollback.
 */

export const PROTOCOL_VERSION = 1;

export type PlayerIndex = 0 | 1;

export type HelloMessage = {
  type: 'hello';
  version: number;
  roomId: string;
  characterId: string;
};

/** Server tells a client which side it is playing. */
export type AssignMessage = {
  type: 'assign';
  playerIndex: PlayerIndex;
  roomId: string;
};

export type StartMessage = {
  type: 'start';
  seed: number;
  characterIds: [string, string];
  stageId: string;
};

export type InputMessage = {
  type: 'input';
  /** Frame of the LAST input in `packed`; earlier entries precede it. */
  frame: number;
  packed: number[];
};

/** Periodic state hash so a desync is caught immediately, not eventually. */
export type ChecksumMessage = {
  type: 'checksum';
  frame: number;
  value: number;
};

export type PingMessage = { type: 'ping'; sent: number };
export type PongMessage = { type: 'pong'; sent: number };
export type ByeMessage = { type: 'bye'; reason: string };
export type ErrorMessage = { type: 'error'; reason: string };

export type ClientMessage = HelloMessage | InputMessage | ChecksumMessage | PingMessage | PongMessage | ByeMessage;
export type ServerMessage = AssignMessage | StartMessage | InputMessage | ChecksumMessage | PingMessage | PongMessage | ByeMessage | ErrorMessage;
export type NetMessage = ClientMessage | ServerMessage;

/**
 * Narrow a decoded frame to the half of the protocol a client can receive.
 *
 * `hello` is the only message a client never gets, so the guard is cheap — but
 * it exists so a peer cannot smuggle an unexpected shape into the client's
 * message handlers.
 */
export function isServerMessage(message: NetMessage): message is ServerMessage {
  return message.type !== 'hello';
}

/** The mirror of the above, for the server's receive path. */
export function isClientMessage(message: NetMessage): message is ClientMessage {
  return message.type !== 'assign' && message.type !== 'start' && message.type !== 'error';
}

export function encode(message: NetMessage): string {
  return JSON.stringify(message);
}

/**
 * Parse a frame off the wire. Returns null rather than throwing: a malformed
 * message from a peer must never be able to take down the match loop.
 */
export function decode(raw: string): NetMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const candidate = parsed as { type?: unknown };
    return typeof candidate.type === 'string' ? (parsed as NetMessage) : null;
  } catch {
    return null;
  }
}
