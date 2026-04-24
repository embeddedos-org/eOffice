import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import crypto from 'crypto';
import { verifyToken } from '../middleware/auth';

interface SignalUser {
  id: string;
  name: string;
  ws: WebSocket;
  roomId: string;
}

const signalRooms = new Map<string, Map<string, SignalUser>>();

const MAX_ROOMS = 50;
const MAX_USERS_PER_ROOM = 20;
const MAX_MESSAGE_SIZE = 64 * 1024; // 64KB

export function setupSignaling(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws/signal', maxPayload: MAX_MESSAGE_SIZE });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    // Authenticate via query param token
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      ws.close(4001, 'Authentication required');
      return;
    }

    const authName = (payload.username as string) || 'Anonymous';
    let user: SignalUser | null = null;

    ws.on('message', (data: Buffer) => {
      if (data.length > MAX_MESSAGE_SIZE) {
        ws.close(4002, 'Message too large');
        return;
      }

      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'join-call': {
            const userId = crypto.randomUUID().slice(0, 8);
            const roomId = msg.roomId || 'default';

            if (signalRooms.size >= MAX_ROOMS && !signalRooms.has(roomId)) {
              ws.send(JSON.stringify({ type: 'error', message: 'Maximum room limit reached' }));
              return;
            }

            user = { id: userId, name: msg.name || authName, ws, roomId };

            if (!signalRooms.has(roomId)) {
              signalRooms.set(roomId, new Map());
            }
            const room = signalRooms.get(roomId)!;

            if (room.size >= MAX_USERS_PER_ROOM) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
              return;
            }

            room.set(userId, user);

            const existingUsers = Array.from(room.values())
              .filter((u) => u.id !== userId)
              .map((u) => ({ id: u.id, name: u.name }));

            ws.send(JSON.stringify({
              type: 'joined',
              userId,
              participants: existingUsers,
            }));

            broadcastSignal(room, userId, {
              type: 'peer-joined',
              peerId: userId,
              name: user.name,
            });
            break;
          }

          case 'offer':
          case 'answer':
          case 'ice-candidate': {
            if (!user) break;
            const room = signalRooms.get(user.roomId);
            if (!room) break;
            const target = room.get(msg.targetId);
            if (target && target.ws.readyState === WebSocket.OPEN) {
              target.ws.send(JSON.stringify({
                type: msg.type,
                fromId: user.id,
                fromName: user.name,
                sdp: msg.sdp,
                candidate: msg.candidate,
              }));
            }
            break;
          }

          case 'mute':
          case 'unmute':
          case 'camera-on':
          case 'camera-off':
          case 'screen-share':
          case 'screen-stop': {
            if (!user) break;
            const room = signalRooms.get(user.roomId);
            if (!room) break;
            broadcastSignal(room, user.id, {
              type: msg.type,
              peerId: user.id,
            });
            break;
          }

          case 'leave-call': {
            handleLeave();
            break;
          }
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', handleLeave);

    function handleLeave() {
      if (!user) return;
      const room = signalRooms.get(user.roomId);
      if (room) {
        room.delete(user.id);
        broadcastSignal(room, user.id, {
          type: 'peer-left',
          peerId: user.id,
        });
        if (room.size === 0) {
          signalRooms.delete(user.roomId);
        }
      }
      user = null;
    }
  });

  console.log('  WebRTC signaling server ready at /ws/signal');
  return wss;
}

function broadcastSignal(room: Map<string, SignalUser>, excludeId: string, msg: object): void {
  const data = JSON.stringify(msg);
  room.forEach((u) => {
    if (u.id !== excludeId && u.ws.readyState === WebSocket.OPEN) {
      u.ws.send(data);
    }
  });
}
