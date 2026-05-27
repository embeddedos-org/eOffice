import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './config';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  app: string;
  read: boolean;
  timestamp: Date;
  actionUrl?: string;
}

interface NotificationCenterProps {
  appName: string;
}

export function useNotifications(appName: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiClient<Notification[]>('/api/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch {
      // API may not be available yet
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    try {
      await apiClient(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiClient('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  const addLocalNotification = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
    const notif: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      app: appName,
      read: false,
      timestamp: new Date(),
    };
    setNotifications(prev => [notif, ...prev]);
    setUnreadCount(prev => prev + 1);
    // Auto-dismiss after 5 seconds for toasts
    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }, 5000);
  }, [appName]);

  return { notifications, unreadCount, markRead, markAllRead, addLocalNotification };
}

const typeColors = { info: '#2196f3', success: '#4caf50', warning: '#ff9800', error: '#f44336' };
const typeIcons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };

export default function NotificationCenter({ appName }: NotificationCenterProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(appName);
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, position: 'relative', padding: 4 }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, background: '#f44336', color: '#fff',
            borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 700,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, width: 360, maxHeight: 480,
          background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 12, background: 'none', border: 'none', color: '#667eea', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>No notifications</div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    padding: '10px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer',
                    background: n.read ? '#fff' : '#f0f4ff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{typeIcons[n.type]}</span>
                    <strong style={{ fontSize: 13, flex: 1 }}>{n.title}</strong>
                    <span style={{ fontSize: 11, color: '#999' }}>{new Date(n.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2, marginLeft: 28 }}>{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
