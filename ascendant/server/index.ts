import { WebSocketServer, type WebSocket } from 'ws';
import { decode, encode, isClientMessage, PROTOCOL_VERSION, type PlayerIndex, type ServerMessage } from '../src/net/protocol';
import { Lobby } from './lobby';

/**
 * Match relay.
 *
 * Forwards input and checksum traffic between the two clients in a room and
 * does nothing else. It deliberately holds no game state — see lobby.ts for
 * why that is the right shape for a rollback title.
 */

const PORT = Number(process.env.PORT ?? 8787);
const STALE_ROOM_MS = 5 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 1000;

const lobby = new Lobby();
const server = new WebSocketServer({ port: PORT });

type Session = { roomId: string; index: PlayerIndex } | null;

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(encode(message));
  }
}

server.on('connection', (socket: WebSocket) => {
  let session: Session = null;

  socket.on('message', (raw: unknown) => {
    const message = decode(String(raw));
    if (!message || !isClientMessage(message)) {
      return;
    }

    if (message.type === 'hello') {
      if (message.version !== PROTOCOL_VERSION) {
        send(socket, { type: 'error', reason: `protocol ${PROTOCOL_VERSION} required` });
        socket.close();
        return;
      }
      const seat = lobby.join(message.roomId, socket, message.characterId);
      if (!seat) {
        send(socket, { type: 'error', reason: 'room full' });
        socket.close();
        return;
      }
      session = { roomId: message.roomId, index: seat.index };
      send(socket, { type: 'assign', playerIndex: seat.index, roomId: message.roomId });

      // Both seats filled: hand out the shared seed and start the match.
      const room = lobby.get(message.roomId);
      if (room && room.seats.length === 2 && !room.started) {
        room.started = true;
        const characterIds: [string, string] = [
          room.seats[0]?.characterId ?? 'vanta',
          room.seats[1]?.characterId ?? 'korvath',
        ];
        for (const occupant of room.seats) {
          send(occupant.socket, {
            type: 'start',
            seed: room.seed,
            characterIds,
            stageId: room.stageId,
          });
        }
      }
      return;
    }

    if (!session) {
      return;
    }

    if (message.type === 'ping') {
      send(socket, { type: 'pong', sent: message.sent });
      return;
    }

    // Everything else is relayed verbatim to the opponent.
    if (message.type === 'input' || message.type === 'checksum' || message.type === 'bye') {
      for (const peer of lobby.others(session.roomId, session.index)) {
        send(peer.socket, message);
      }
    }
  });

  socket.on('close', () => {
    if (!session) {
      return;
    }
    for (const peer of lobby.others(session.roomId, session.index)) {
      send(peer.socket, { type: 'bye', reason: 'opponent disconnected' });
    }
    lobby.leave(session.roomId, session.index);
  });
});

const pruneTimer = setInterval(() => {
  lobby.pruneStale(STALE_ROOM_MS);
}, PRUNE_INTERVAL_MS);

// HEALTH / PRESSURE: a heartbeat the host can scrape without a metrics stack.
const heartbeat = setInterval(() => {
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'ascendant-relay',
      level: 'info',
      event: 'heartbeat',
      data: { rooms: lobby.roomCount, players: lobby.playerCount },
    })}\n`,
  );
}, 30000);

function shutdown(): void {
  clearInterval(pruneTimer);
  clearInterval(heartbeat);
  server.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.stdout.write(`ascendant relay listening on :${PORT}\n`);
