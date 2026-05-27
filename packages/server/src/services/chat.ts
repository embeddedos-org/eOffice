import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface ChatUser {
  id: string;
  name: string;
  ws: WebSocket;
  channelId: string;
  status: 'online' | 'away' | 'busy' | 'dnd';
}

interface ChatMessage {
  type: string;
  channelId?: string;
  userId?: string;
  userName?: string;
  content?: string;
  messageId?: string;
  replyTo?: string;
  reaction?: string;
  targetMessageId?: string;
  timestamp?: number;
}

const channels = new Map<string, Set<ChatUser>>();
const messageHistory = new Map<string, Array<{
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  replyTo?: string;
  reactions: Map<string, Set<string>>;
}>>();

export function setupChat(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws/chat') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    let currentUser: ChatUser | null = null;

    ws.on('message', (data) => {
      try {
        const msg: ChatMessage = JSON.parse(data.toString());

        switch (msg.type) {
          case 'join': {
            currentUser = {
              id: msg.userId || generateId(),
              name: msg.userName || 'Anonymous',
              ws,
              channelId: msg.channelId || 'general',
              status: 'online',
            };

            if (!channels.has(currentUser.channelId)) {
              channels.set(currentUser.channelId, new Set());
            }
            channels.get(currentUser.channelId)!.add(currentUser);

            // Send join confirmation with message history
            const history = messageHistory.get(currentUser.channelId) || [];
            ws.send(JSON.stringify({
              type: 'joined',
              userId: currentUser.id,
              channelId: currentUser.channelId,
              users: getChannelUsers(currentUser.channelId),
              history: history.slice(-50).map(m => ({
                ...m,
                reactions: Object.fromEntries(
                  Array.from(m.reactions.entries()).map(([emoji, users]) => [emoji, Array.from(users)])
                ),
              })),
            }));

            // Broadcast user joined
            broadcastToChannel(currentUser.channelId, {
              type: 'user-joined',
              userId: currentUser.id,
              userName: currentUser.name,
              users: getChannelUsers(currentUser.channelId),
            }, currentUser.id);
            break;
          }

          case 'message': {
            if (!currentUser) return;
            const messageId = generateId();
            const timestamp = Date.now();

            if (!messageHistory.has(currentUser.channelId)) {
              messageHistory.set(currentUser.channelId, []);
            }
            messageHistory.get(currentUser.channelId)!.push({
              id: messageId,
              userId: currentUser.id,
              userName: currentUser.name,
              content: msg.content || '',
              timestamp,
              replyTo: msg.replyTo,
              reactions: new Map(),
            });

            // Keep only last 1000 messages per channel
            const history = messageHistory.get(currentUser.channelId)!;
            if (history.length > 1000) {
              messageHistory.set(currentUser.channelId, history.slice(-500));
            }

            broadcastToChannel(currentUser.channelId, {
              type: 'message',
              messageId,
              userId: currentUser.id,
              userName: currentUser.name,
              content: msg.content,
              timestamp,
              replyTo: msg.replyTo,
            });
            break;
          }

          case 'typing': {
            if (!currentUser) return;
            broadcastToChannel(currentUser.channelId, {
              type: 'typing',
              userId: currentUser.id,
              userName: currentUser.name,
            }, currentUser.id);
            break;
          }

          case 'stop-typing': {
            if (!currentUser) return;
            broadcastToChannel(currentUser.channelId, {
              type: 'stop-typing',
              userId: currentUser.id,
            }, currentUser.id);
            break;
          }

          case 'reaction': {
            if (!currentUser || !msg.targetMessageId || !msg.reaction) return;
            const channelHistory = messageHistory.get(currentUser.channelId);
            if (!channelHistory) return;

            const targetMsg = channelHistory.find(m => m.id === msg.targetMessageId);
            if (!targetMsg) return;

            if (!targetMsg.reactions.has(msg.reaction)) {
              targetMsg.reactions.set(msg.reaction, new Set());
            }
            const reactionSet = targetMsg.reactions.get(msg.reaction)!;

            // Toggle reaction
            if (reactionSet.has(currentUser.id)) {
              reactionSet.delete(currentUser.id);
              if (reactionSet.size === 0) targetMsg.reactions.delete(msg.reaction);
            } else {
              reactionSet.add(currentUser.id);
            }

            broadcastToChannel(currentUser.channelId, {
              type: 'reaction-update',
              targetMessageId: msg.targetMessageId,
              reactions: Object.fromEntries(
                Array.from(targetMsg.reactions.entries()).map(([emoji, users]) => [emoji, Array.from(users)])
              ),
            });
            break;
          }

          case 'status': {
            if (!currentUser) return;
            currentUser.status = (msg.content as any) || 'online';
            broadcastToChannel(currentUser.channelId, {
              type: 'status-change',
              userId: currentUser.id,
              status: currentUser.status,
              users: getChannelUsers(currentUser.channelId),
            });
            break;
          }

          case 'switch-channel': {
            if (!currentUser || !msg.channelId) return;
            // Leave current channel
            channels.get(currentUser.channelId)?.delete(currentUser);
            broadcastToChannel(currentUser.channelId, {
              type: 'user-left',
              userId: currentUser.id,
              users: getChannelUsers(currentUser.channelId),
            });

            // Join new channel
            currentUser.channelId = msg.channelId;
            if (!channels.has(currentUser.channelId)) {
              channels.set(currentUser.channelId, new Set());
            }
            channels.get(currentUser.channelId)!.add(currentUser);

            const history = messageHistory.get(currentUser.channelId) || [];
            ws.send(JSON.stringify({
              type: 'channel-switched',
              channelId: currentUser.channelId,
              users: getChannelUsers(currentUser.channelId),
              history: history.slice(-50).map(m => ({
                ...m,
                reactions: Object.fromEntries(
                  Array.from(m.reactions.entries()).map(([emoji, users]) => [emoji, Array.from(users)])
                ),
              })),
            }));

            broadcastToChannel(currentUser.channelId, {
              type: 'user-joined',
              userId: currentUser.id,
              userName: currentUser.name,
              users: getChannelUsers(currentUser.channelId),
            }, currentUser.id);
            break;
          }

          case 'direct-message': {
            if (!currentUser || !msg.userId) return;
            // Find target user across all channels
            let targetUser: ChatUser | null = null;
            for (const channelUsers of channels.values()) {
              for (const u of channelUsers) {
                if (u.id === msg.userId) { targetUser = u; break; }
              }
              if (targetUser) break;
            }

            if (targetUser && targetUser.ws.readyState === WebSocket.OPEN) {
              const dmMsg = {
                type: 'direct-message',
                messageId: generateId(),
                userId: currentUser.id,
                userName: currentUser.name,
                content: msg.content,
                timestamp: Date.now(),
              };
              targetUser.ws.send(JSON.stringify(dmMsg));
              ws.send(JSON.stringify({ ...dmMsg, type: 'dm-sent' }));
            }
            break;
          }
        }
      } catch (err) {
        console.error('Chat WebSocket error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUser) {
        channels.get(currentUser.channelId)?.delete(currentUser);
        broadcastToChannel(currentUser.channelId, {
          type: 'user-left',
          userId: currentUser.id,
          users: getChannelUsers(currentUser.channelId),
        });
      }
    });
  });

  return wss;
}

function broadcastToChannel(channelId: string, message: object, excludeUserId?: string): void {
  const channelUsers = channels.get(channelId);
  if (!channelUsers) return;

  const data = JSON.stringify(message);
  for (const user of channelUsers) {
    if (excludeUserId && user.id === excludeUserId) continue;
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(data);
    }
  }
}

function getChannelUsers(channelId: string): Array<{ id: string; name: string; status: string }> {
  const users = channels.get(channelId);
  if (!users) return [];
  return Array.from(users).map(u => ({ id: u.id, name: u.name, status: u.status }));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
