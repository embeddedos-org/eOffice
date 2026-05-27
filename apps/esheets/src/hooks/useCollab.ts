import { useState, useEffect, useCallback, useRef } from 'react';
import { WS_URL, getToken, getUser } from '../../../shared/config';

interface CollabUser {
  userId: string;
  username: string;
  activeCell?: string;
  color: string;
}

interface CellLock {
  cell: string;
  userId: string;
  username: string;
  timestamp: number;
}

export function useCollab(spreadsheetId: string | null) {
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollabUser[]>([]);
  const [cellLocks, setCellLocks] = useState<CellLock[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const onRemoteCellEditRef = useRef<((cell: string, value: string, userId: string) => void) | null>(null);

  useEffect(() => {
    if (!spreadsheetId) return;
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/collab?token=${token}&doc=${spreadsheetId}&app=esheets`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setCollaborators([]); };
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'users':
            setCollaborators(msg.users);
            break;
          case 'cell-lock':
            setCellLocks(prev => [...prev.filter(l => l.cell !== msg.cell), { cell: msg.cell, userId: msg.userId, username: msg.username, timestamp: Date.now() }]);
            break;
          case 'cell-unlock':
            setCellLocks(prev => prev.filter(l => l.cell !== msg.cell));
            break;
          case 'cell-edit':
            onRemoteCellEditRef.current?.(msg.cell, msg.value, msg.userId);
            break;
          case 'cursor':
            setCollaborators(prev => prev.map(u => u.userId === msg.userId ? { ...u, activeCell: msg.cell } : u));
            break;
        }
      } catch {}
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [spreadsheetId]);

  const lockCell = useCallback((cell: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'cell-lock', cell }));
  }, []);

  const unlockCell = useCallback((cell: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'cell-unlock', cell }));
  }, []);

  const sendCellEdit = useCallback((cell: string, value: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'cell-edit', cell, value }));
  }, []);

  const sendCursor = useCallback((cell: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'cursor', cell }));
  }, []);

  const onRemoteCellEdit = useCallback((handler: (cell: string, value: string, userId: string) => void) => {
    onRemoteCellEditRef.current = handler;
    return () => { onRemoteCellEditRef.current = null; };
  }, []);

  const isCellLocked = useCallback((cell: string): CellLock | undefined => {
    const user = getUser();
    return cellLocks.find(l => l.cell === cell && l.userId !== user?.id);
  }, [cellLocks]);

  return { connected, collaborators, cellLocks, lockCell, unlockCell, sendCellEdit, sendCursor, onRemoteCellEdit, isCellLocked };
}
