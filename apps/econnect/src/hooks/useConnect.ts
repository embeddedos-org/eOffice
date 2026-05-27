import { useState, useCallback, useRef, useEffect } from 'react';
import { WS_URL } from '../../../shared/config';
import { getUser } from '../../../shared/config';

export interface Channel { id: string; name: string; members: number; description?: string; }
export interface Message {
  id: string;
  channelId: string;
  author: string;
  content: string;
  timestamp: string;
  type?: 'text' | 'file';
  fileName?: string;
  fileSize?: number;
  replyTo?: string;
  reactions?: Record<string, string[]>;
}

export interface UserPresence {
  id?: string;
  name: string;
  online: boolean;
  status?: 'online' | 'away' | 'busy' | 'dnd';
  lastSeen?: string;
}

let nextId = 1;
const uid = () => `msg-${Date.now()}-${nextId++}`;

const SEED_CHANNELS: Channel[] = [
  { id: 'general', name: 'general', members: 0, description: 'General discussion' },
  { id: 'engineering', name: 'engineering', members: 0, description: 'Engineering team' },
  { id: 'design', name: 'design', members: 0, description: 'Design team' },
  { id: 'random', name: 'random', members: 0, description: 'Off-topic' },
];

export function useConnect() {
  const [channels, setChannels] = useState<Channel[]>(SEED_CHANNELS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(SEED_CHANNELS[0].id);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) ?? null;
  const channelMessages = messages.filter((m) => m.channelId === selectedChannelId);

  // Connect to WebSocket
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const user = getUser();
    const ws = new WebSocket(`${WS_URL}/ws/chat`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        type: 'join',
        userId: user?.id || `anon-${Date.now()}`,
        userName: user?.username || 'Anonymous',
        channelId: selectedChannelId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'joined': {
            if (msg.history) {
              const historyMessages: Message[] = msg.history.map((h: any) => ({
                id: h.id,
                channelId: msg.channelId || selectedChannelId,
                author: h.userName,
                content: h.content,
                timestamp: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'text',
                replyTo: h.replyTo,
                reactions: h.reactions || {},
              }));
              setMessages(prev => [...prev.filter(m => m.channelId !== (msg.channelId || selectedChannelId)), ...historyMessages]);
            }
            if (msg.users) {
              setUsers(msg.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                online: true,
                status: u.status || 'online',
              })));
            }
            break;
          }

          case 'message': {
            const newMsg: Message = {
              id: msg.messageId,
              channelId: msg.channelId || selectedChannelId,
              author: msg.userName,
              content: msg.content,
              timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'text',
              replyTo: msg.replyTo,
            };
            setMessages(prev => [...prev, newMsg]);
            setTypingUser(null);
            break;
          }

          case 'user-joined': {
            if (msg.users) {
              setUsers(msg.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                online: true,
                status: u.status || 'online',
              })));
            }
            // Update channel member count
            setChannels(prev => prev.map(c =>
              c.id === selectedChannelId ? { ...c, members: msg.users?.length || c.members } : c
            ));
            break;
          }

          case 'user-left': {
            if (msg.users) {
              setUsers(msg.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                online: true,
                status: u.status || 'online',
              })));
            }
            break;
          }

          case 'typing': {
            setTypingUser(msg.userName);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
            break;
          }

          case 'stop-typing': {
            setTypingUser(null);
            break;
          }

          case 'reaction-update': {
            setMessages(prev => prev.map(m =>
              m.id === msg.targetMessageId ? { ...m, reactions: msg.reactions } : m
            ));
            break;
          }

          case 'channel-switched': {
            if (msg.history) {
              const historyMessages: Message[] = msg.history.map((h: any) => ({
                id: h.id,
                channelId: msg.channelId,
                author: h.userName,
                content: h.content,
                timestamp: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'text',
                reactions: h.reactions || {},
              }));
              setMessages(prev => [...prev.filter(m => m.channelId !== msg.channelId), ...historyMessages]);
            }
            if (msg.users) {
              setUsers(msg.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                online: true,
                status: u.status || 'online',
              })));
            }
            break;
          }

          case 'direct-message':
          case 'dm-sent': {
            const dmMsg: Message = {
              id: msg.messageId,
              channelId: `dm-${msg.userId}`,
              author: msg.userName,
              content: msg.content,
              timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'text',
            };
            setMessages(prev => [...prev, dmMsg]);
            break;
          }

          case 'status-change': {
            if (msg.users) {
              setUsers(msg.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                online: true,
                status: u.status || 'online',
              })));
            }
            break;
          }
        }
      } catch (err) {
        console.error('Chat message parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3 seconds
      reconnectTimerRef.current = setTimeout(() => connectWs(), 3000);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [selectedChannelId]);

  // Connect on mount
  useEffect(() => {
    connectWs();
    return () => {
      wsRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const addChannel = useCallback((name: string, description = '') => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    setChannels((prev) => [...prev, { id, name, members: 1, description }]);
    setSelectedChannelId(id);

    // Switch to new channel via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'switch-channel', channelId: id }));
    }
  }, []);

  const switchChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'switch-channel', channelId }));
    }
  }, []);

  const sendMessage = useCallback((content: string, replyTo?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content,
        replyTo,
      }));
    } else {
      // Offline fallback — store locally
      const id = uid();
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const user = getUser();
      setMessages((prev) => [...prev, {
        id, channelId: selectedChannelId,
        author: user?.username || 'You',
        content, timestamp, type: 'text',
        replyTo,
      }]);
    }
  }, [selectedChannelId]);

  const sendFileMessage = useCallback((fileName: string, fileSize: number) => {
    const content = `📎 Shared file: ${fileName} (${formatSize(fileSize)})`;
    sendMessage(content);
  }, [sendMessage]);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction',
        targetMessageId: messageId,
        reaction: emoji,
      }));
    }
  }, []);

  const setUserStatus = useCallback((status: 'online' | 'away' | 'busy' | 'dnd') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'status', content: status }));
    }
  }, []);

  const sendDirectMessage = useCallback((userId: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'direct-message',
        userId,
        content,
      }));
    }
  }, []);

  return {
    channels, messages, selectedChannelId, selectedChannel, channelMessages,
    typingUser, users, connected,
    setSelectedChannelId: switchChannel,
    addChannel, sendMessage, sendFileMessage,
    sendTyping, addReaction, setUserStatus, sendDirectMessage,
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
