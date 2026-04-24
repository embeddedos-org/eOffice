import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { AuthRequest, pickFields } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface DriveFile {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  content: string;
  size: number;
  created_at: Date;
  updated_at: Date;
  ownerId: string;
}

const store = new FileStore<DriveFile>(path.join(os.homedir(), '.eoffice', 'data', 'drive'));

export const driveRouter = Router();

driveRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = store.list().filter((f) => f.ownerId === userId);
  res.json({ files: items, total: items.length });
});

driveRouter.post('/',

driveRouter.post('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { name, type, parentId, content } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  const nameErr = validateStringLength(name, 'name', MAX_TITLE_LENGTH);
  if (nameErr) { res.status(400).json({ error: nameErr }); return; }

  const now = new Date();
  const file: DriveFile = {
    id: crypto.randomUUID(),
    name,
    type: type === 'folder' ? 'folder' : 'file',
    parentId: parentId ?? null,
    content: content ?? '',
    size: (content ?? '').length,
    created_at: now,
    updated_at: now,
    ownerId: userId,
  };
  store.set(file.id, file);
  res.status(201).json(file);
});

driveRouter.get('/folder/:parentId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
const items = store.list().filter(
    (f) => f.parentId === req.params.parentId && f.ownerId === userId,
  );
  res.json({ files: items, total: items.length });
});

driveRouter.get('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const file = store.get(req.params.id);
  if (!file || file.ownerId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.json(file);
});

driveRouter.put('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const file = store.get(req.params.id);
  if (!file || file.ownerId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const allowed = pickFields<DriveFile>(req.body, ['name', 'content', 'parentId']);
  const updated: DriveFile = {
    ...file,
    name: (allowed.name as string) ?? file.name,
    content: (allowed.content as string) ?? file.content,
    parentId: allowed.parentId !== undefined ? (allowed.parentId as string | null) : file.parentId,
    size: allowed.content ? (allowed.content as string).length : file.size,
    updated_at: new Date(),
  };
  store.set(updated.id, updated);
  res.json(updated);
});

driveRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const file = store.get(req.params.id);
  if (!file || file.ownerId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  store.delete(req.params.id);
  res.status(204).send();
});
