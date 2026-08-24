import type { WebSocket } from 'ws';
import type { PlayerIndex } from '../src/net/protocol';

/**
 * Room management.
 *
 * The server is a relay, not an authority: it never simulates the match. Both
 * clients run the identical deterministic simulation and only exchange inputs,
 * so the server's entire job is to pair two people, tell them which side they
 * are on, and forward bytes. That keeps hosting costs near zero and means the
 * server can never be the thing that desyncs a match.
 */

export type Seat = {
  socket: WebSocket;
  index: PlayerIndex;
  characterId: string;
  alive: boolean;
};

export type Room = {
  id: string;
  seats: Seat[];
  seed: number;
  stageId: string;
  started: boolean;
  createdAt: number;
};

export class Lobby {
  private readonly rooms = new Map<string, Room>();

  /** Seat a player, creating the room if needed. Null means the room is full. */
  join(roomId: string, socket: WebSocket, characterId: string): Seat | null {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        seats: [],
        // Seeded from the room so both clients agree without extra messages.
        seed: hashString(roomId),
        stageId: 'crater',
        started: false,
        createdAt: Date.now(),
      };
      this.rooms.set(roomId, room);
    }
    if (room.seats.length >= 2) {
      return null;
    }
    const seat: Seat = {
      socket,
      index: room.seats.length === 0 ? 0 : 1,
      characterId,
      alive: true,
    };
    room.seats.push(seat);
    return seat;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /** Everyone in the room except the given seat — the relay target. */
  others(roomId: string, index: PlayerIndex): Seat[] {
    const room = this.rooms.get(roomId);
    return room ? room.seats.filter((s) => s.index !== index && s.alive) : [];
  }

  leave(roomId: string, index: PlayerIndex): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    for (const seat of room.seats) {
      if (seat.index === index) {
        seat.alive = false;
      }
    }
    if (room.seats.every((s) => !s.alive)) {
      this.rooms.delete(roomId);
    }
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  get playerCount(): number {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += room.seats.filter((s) => s.alive).length;
    }
    return total;
  }

  /** Drop rooms nobody ever finished joining, so abandoned ids cannot pile up. */
  pruneStale(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [id, room] of this.rooms) {
      if (!room.started && room.createdAt < cutoff && room.seats.length < 2) {
        this.rooms.delete(id);
        removed++;
      }
    }
    return removed;
  }
}

/** Deterministic 32-bit hash so both clients derive the same match seed. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash;
}
