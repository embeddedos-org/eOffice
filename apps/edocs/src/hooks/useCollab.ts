import { useState, useEffect, useCallback, useRef } from 'react';
import { WS_URL } from '../../../shared/config';

interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; ch: number };
}

interface UseCollabOptions {
  docId: string;
  userName: string;
  serverUrl?: string;
}

export function useCollab({ docId, userName, serverUrl = WS_URL }: UseCollabOptions) {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [userId, setUserId] = useState('');
  const [userColor, setUserColor] = useState('#3b82f6');
  const wsRef = useRef<WebSocket | null>(null);
  const onRemoteEditRef = useRef<((content: string) => void) | null>(null);

  const connect = useCallback((initialContent: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${serverUrl}/ws/collab`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', docId, name: userName, content: initialContent }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'init':
          setUserId(msg.userId);
          setUserColor(msg.color);
          setConnected(true);
          setUsers(msg.users || []);
          if (msg.content && onRemoteEditRef.current) {
            onRemoteEditRef.current(msg.content);
          }
          break;
        case 'user-joined':
          setUsers((prev) => [...prev.filter((u) => u.id !== msg.user.id), msg.user]);
          break;
        case 'user-left':
          setUsers((prev) => prev.filter((u) => u.id !== msg.userId));
          break;
        case 'edit':
          if (onRemoteEditRef.current) {
            onRemoteEditRef.current(msg.content);
          }
          break;
        case 'cursor':
          setUsers((prev) => prev.map((u) => u.id === msg.userId ? { ...u, cursor: msg.cursor } : u));
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setUsers([]);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [docId, userName, serverUrl]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setUsers([]);
  }, []);

  const sendEdit = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'edit', content }));
    }
  }, []);

  const sendCursor = useCallback((cursor: { line: number; ch: number }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cursor', cursor }));
    }
  }, []);

  const onRemoteEdit = useCallback((handler: (content: string) => void) => {
    onRemoteEditRef.current = handler;
  }, []);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  return {
    connected,
    users,
    userId,
    userColor,
    connect,
    disconnect,
    sendEdit,
    sendCursor,
    onRemoteEdit,
  };
}
