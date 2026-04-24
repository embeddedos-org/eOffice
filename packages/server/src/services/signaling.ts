import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import crypto from 'crypto';

interface SignalUser {
  id: string;
  name: string;
  ws: WebSocket;
  roomId: string;
}

const signalRooms = new Map<string, Map<string, SignalUser>>();

export function setupSignaling(server: http.Server): void {
  const wss = new WebSocketServer({ server, path: '/ws/signal' });

  wss.on('connection', (ws: WebSocket) => {
    let user: SignalUser | null = null;

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'join-call': {
            const userId = crypto.randomUUID().slice(0, 8);
            const roomId = msg.roomId || 'default';
            user = { id: userId, name: msg.name || `User ${userId}`, ws, roomId };

            if (!signalRooms.has(roomId)) {
              signalRooms.set(roomId, new Map());
            }
            const room = signalRooms.get(roomId)!;
            room.set(userId, user);

            // Tell the new user about existing participants
            const existingUsers = Array.from(room.values())
              .filter((u) => u.id !== userId)
              .map((u) => ({ id: u.id, name: u.name }));

            ws.send(JSON.stringify({
              type: 'joined',
              userId,
              participants: existingUsers,
            }));

            // Tell existing users about the new participant
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

  // eslint-disable-next-line no-console
  console.log('  WebRTC signaling server ready at /ws/signal');
}

function broadcastSignal(room: Map<string, SignalUser>, excludeId: string, msg: object): void {
  const data = JSON.stringify(msg);
  room.forEach((u) => {
    if (u.id !== excludeId && u.ws.readyState === WebSocket.OPEN) {
      u.ws.send(data);
    }
  });
}
