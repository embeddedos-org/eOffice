import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import crypto from 'crypto';
import { verifyToken } from '../middleware/auth';

interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; ch: number };
  ws: WebSocket;
}

interface CollabRoom {
  docId: string;
  users: Map<string, CollabUser>;
  content: string;
  version: number;
}

const rooms = new Map<string, CollabRoom>();
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
let colorIdx = 0;

const MAX_ROOMS = 50;
const MAX_USERS_PER_ROOM = 20;
const MAX_MESSAGE_SIZE = 64 * 1024; // 64KB

export function setupCollaboration(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws/collab', maxPayload: MAX_MESSAGE_SIZE });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    // Authenticate via query param token
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      ws.close(4001, 'Authentication required');
      return;
    }

    let userId = '';
    let currentRoom = '';
    const userName = (payload.username as string) || 'Anonymous';

    ws.on('message', (data: Buffer) => {
      if (data.length > MAX_MESSAGE_SIZE) {
        ws.close(4002, 'Message too large');
        return;
      }

      try {
        const msg = JSON.parse(data.toString());
        switch (msg.type) {
          case 'join': {
            if (rooms.size >= MAX_ROOMS && !rooms.has(msg.docId)) {
              ws.send(JSON.stringify({ type: 'error', message: 'Maximum room limit reached' }));
              return;
            }

            userId = crypto.randomUUID().slice(0, 8);
            currentRoom = msg.docId;
            const color = COLORS[colorIdx++ % COLORS.length];

            if (!rooms.has(currentRoom)) {
              rooms.set(currentRoom, {
                docId: currentRoom,
                users: new Map(),
                content: msg.content || '',
                version: 0,
              });
            }

            const room = rooms.get(currentRoom)!;

            if (room.users.size >= MAX_USERS_PER_ROOM) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
              return;
            }

            room.users.set(userId, { id: userId, name: userName, color, ws });

            ws.send(JSON.stringify({
              type: 'init',
              userId,
              color,
              content: room.content,
              version: room.version,
              users: Array.from(room.users.values()).map((u) => ({
                id: u.id, name: u.name, color: u.color, cursor: u.cursor,
              })),
            }));

            broadcast(room, userId, {
              type: 'user-joined',
              user: { id: userId, name: userName, color },
            });
            break;
          }
          case 'edit': {
            const room = rooms.get(currentRoom);
            if (!room) break;
            room.content = msg.content;
            room.version++;
            broadcast(room, userId, {
              type: 'edit',
              userId,
              content: msg.content,
              version: room.version,
              position: msg.position,
            });
            break;
          }
          case 'cursor': {
            const room = rooms.get(currentRoom);
            if (!room) break;
            const user = room.users.get(userId);
            if (user) user.cursor = msg.cursor;
            broadcast(room, userId, {
              type: 'cursor',
              userId,
              cursor: msg.cursor,
            });
            break;
          }
          case 'selection': {
            const room = rooms.get(currentRoom);
            if (!room) break;
            broadcast(room, userId, {
              type: 'selection',
              userId,
              selection: msg.selection,
            });
            break;
          }
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const room = rooms.get(currentRoom)!;
        room.users.delete(userId);
        broadcast(room, userId, { type: 'user-left', userId });
        if (room.users.size === 0) {
          setTimeout(() => {
            const r = rooms.get(currentRoom);
            if (r && r.users.size === 0) rooms.delete(currentRoom);
          }, 300000);
        }
      }
    });
  });

  console.log('  WebSocket collaboration server ready at /ws/collab');
  return wss;
}

function broadcast(room: CollabRoom, excludeId: string, msg: object): void {
  const data = JSON.stringify(msg);
  room.users.forEach((user) => {
    if (user.id !== excludeId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(data);
    }
  });
}
