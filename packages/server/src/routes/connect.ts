import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import { validateStringLength, MAX_NAME_LENGTH, MAX_CONTENT_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface ChannelRecord {
  id: string;
  name: string;
  description: string;
  members: string[];
  created_at: Date;
  ownerId: string;
}

interface MessageRecord {
  id: string;
  channelId: string;
  content: string;
  author: string;
  sent_at: Date;
}

const channels = new FileStore<ChannelRecord>(path.join(os.homedir(), '.eoffice', 'data', 'channels'));
const channelMessages = new FileStore<MessageRecord[]>(path.join(os.homedir(), '.eoffice', 'data', 'channel-messages'));

export const connectRouter = Router();

connectRouter.get('/channels', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = channels.list().filter((c) => c.ownerId === userId);
  res.json({ channels: items, total: items.length });
});

connectRouter.post('/channels', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  const nameErr = validateStringLength(name, 'name', MAX_NAME_LENGTH);
  if (nameErr) { res.status(400).json({ error: nameErr }); return; }

  const ch: ChannelRecord = {
    id: crypto.randomUUID(),
    name,
    description: typeof description === 'string' ? description : '',
    members: [],
    created_at: new Date(),
    ownerId: userId,
  };
  channels.set(ch.id, ch);
  channelMessages.set(ch.id, []);
  res.status(201).json(ch);
});

connectRouter.get('/channels/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const ch = channels.get(req.params.id);
  if (!ch || ch.ownerId !== userId) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }
  res.json(ch);
});

connectRouter.delete('/channels/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const ch = channels.get(req.params.id);
  if (!ch || ch.ownerId !== userId) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }
  channels.delete(req.params.id);
  channelMessages.delete(req.params.id);
  res.status(204).send();
});

connectRouter.post('/channels/:id/messages', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const ch = channels.get(req.params.id);
  if (!ch) { res.status(404).json({ error: 'Channel not found' }); return; }

  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const contentErr = validateStringLength(content, 'content', MAX_CONTENT_LENGTH);
  if (contentErr) { res.status(400).json({ error: contentErr }); return; }

  const msg: MessageRecord = {
    id: crypto.randomUUID(),
    channelId: req.params.id,
    content,
    author: (req as AuthRequest).user?.username ?? 'anonymous',
    sent_at: new Date(),
  };
  const list = channelMessages.get(req.params.id) ?? [];
  list.push(msg);
  channelMessages.set(req.params.id, list);
  res.status(201).json(msg);
});

connectRouter.get('/channels/:id/messages', (req: Request, res: Response) => {
  if (!channels.has(req.params.id)) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }
  const list = channelMessages.get(req.params.id) ?? [];
  res.json({ messages: list, total: list.length });
});
