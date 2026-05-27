import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import { FileStore } from '../storage/store';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  app: string;
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

const store = new FileStore<Notification>(path.join(os.homedir(), '.eoffice', 'data', 'notifications'));

export const notificationsRouter = Router();

// GET /api/notifications — List notifications for current user
notificationsRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }
  const all = store.list().filter(n => n.userId === userId);
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(all.slice(0, 50));
});

// POST /api/notifications — Create a notification
notificationsRouter.post('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }
  const { title, message, type, app, actionUrl, targetUserId } = req.body;
  if (!title || !message) { res.status(400).json({ error: 'title and message are required' }); return; }

  const notif: Notification = {
    id: crypto.randomUUID(),
    userId: targetUserId || userId,
    title,
    message,
    type: type || 'info',
    app: app || 'system',
    read: false,
    timestamp: new Date().toISOString(),
    actionUrl,
  };
  store.set(notif.id, notif);
  res.status(201).json(notif);
});

// PUT /api/notifications/:id/read — Mark as read
notificationsRouter.put('/:id/read', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const notif = store.get(req.params.id);
  if (!notif || notif.userId !== userId) { res.status(404).json({ error: 'Not found' }); return; }
  notif.read = true;
  store.set(notif.id, notif);
  res.json(notif);
});

// PUT /api/notifications/read-all — Mark all as read
notificationsRouter.put('/read-all', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }
  const all = store.list().filter(n => n.userId === userId && !n.read);
  for (const n of all) {
    n.read = true;
    store.set(n.id, n);
  }
  res.json({ updated: all.length });
});
