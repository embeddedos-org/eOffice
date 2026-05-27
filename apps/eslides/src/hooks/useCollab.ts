import { useState, useEffect, useCallback, useRef } from 'react';
import { WS_URL, getToken } from '../../../shared/config';

interface CollabUser {
  userId: string;
  username: string;
  activeSlide?: number;
  color: string;
}

export function useCollab(presentationId: string | null) {
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollabUser[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const onRemoteSlideEditRef = useRef<((slideIndex: number, content: string) => void) | null>(null);

  useEffect(() => {
    if (!presentationId) return;
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/collab?token=${token}&doc=${presentationId}&app=eslides`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setCollaborators([]); };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'users':
            setCollaborators(msg.users);
            break;
          case 'slide-edit':
            onRemoteSlideEditRef.current?.(msg.slideIndex, msg.content);
            break;
          case 'slide-focus':
            setCollaborators(prev => prev.map(u => u.userId === msg.userId ? { ...u, activeSlide: msg.slideIndex } : u));
            break;
        }
      } catch {}
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [presentationId]);

  const sendSlideEdit = useCallback((slideIndex: number, content: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'slide-edit', slideIndex, content }));
  }, []);

  const sendSlideFocus = useCallback((slideIndex: number) => {
    wsRef.current?.send(JSON.stringify({ type: 'slide-focus', slideIndex }));
  }, []);

  const onRemoteSlideEdit = useCallback((handler: (slideIndex: number, content: string) => void) => {
    onRemoteSlideEditRef.current = handler;
    return () => { onRemoteSlideEditRef.current = null; };
  }, []);

  return { connected, collaborators, sendSlideEdit, sendSlideFocus, onRemoteSlideEdit };
}
