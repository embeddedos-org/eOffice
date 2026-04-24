import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import { validateStringLength, MAX_CONTENT_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface VersionEntry {
  id: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, unknown>;
  message: string;
  created_at: Date;
  number: number;
  ownerId: string;
}

const store = new FileStore<VersionEntry[]>(path.join(os.homedir(), '.eoffice', 'data', 'versions'));

function versionKey(type: string, id: string): string {
  const safeType = type.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${safeType}:${safeId}`;
}

export const versionsRouter = Router();

versionsRouter.get('/:resourceType/:resourceId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const key = versionKey(req.params.resourceType, req.params.resourceId);
  const versions = (store.get(key) ?? []).filter((v) => v.ownerId === userId);
  res.json({ versions, total: versions.length });
});

versionsRouter.post('/:resourceType/:resourceId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const key = versionKey(req.params.resourceType, req.params.resourceId);
  const versions = store.get(key) ?? [];

  const message = typeof req.body.message === 'string' ? req.body.message : '';
  const msgErr = validateStringLength(message, 'message', MAX_CONTENT_LENGTH);
  if (msgErr) { res.status(400).json({ error: msgErr }); return; }

  const version: VersionEntry = {
    id: crypto.randomUUID(),
    resourceType: req.params.resourceType,
    resourceId: req.params.resourceId,
    data: req.body.data && typeof req.body.data === 'object' ? req.body.data : {},
    message,
    created_at: new Date(),
    number: versions.length + 1,
    ownerId: userId,
  };
  versions.push(version);
  store.set(key, versions);
  res.status(201).json(version);
});

versionsRouter.get('/:resourceType/:resourceId/:versionId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const key = versionKey(req.params.resourceType, req.params.resourceId);
  const versions = store.get(key) ?? [];
  const version = versions.find((v) => v.id === req.params.versionId && v.ownerId === userId);
  if (!version) { res.status(404).json({ error: 'Version not found' }); return; }
  res.json(version);
});
