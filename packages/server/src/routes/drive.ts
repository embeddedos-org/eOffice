import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { AuthRequest, pickFields } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface DriveFile {
  id: string;
  name: string;
  type: string;
  mimeType?: string;
  parentId: string | null;
  content: string;
  size: number;
  created_at: Date;
  updated_at: Date;
  ownerId: string;
  filePath?: string;
  versions?: { id: string; size: number; created_at: Date }[];
  deleted?: boolean;
  deletedAt?: Date;
}

const UPLOAD_DIR = path.join(os.homedir(), '.eoffice', 'uploads');
const store = new FileStore<DriveFile>(path.join(os.homedir(), '.eoffice', 'data', 'drive'));

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as AuthRequest).user?.id || 'anonymous';
    const userDir = path.join(UPLOAD_DIR, userId);
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

export const driveRouter = Router();

// List all files (exclude deleted)
driveRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const includeDeleted = req.query.includeDeleted === 'true';
  const items = store.list().filter((f) =>
    f.ownerId === userId && (includeDeleted || !f.deleted)
  );
  res.json({ files: items, total: items.length });
});

// Trash/recycle bin
driveRouter.get('/trash', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = store.list().filter((f) => f.ownerId === userId && f.deleted);
  res.json({ files: items, total: items.length });
});

// Search files
driveRouter.get('/search', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const query = (req.query.q as string || '').toLowerCase();
  if (!query) { res.json({ files: [], total: 0 }); return; }

  const items = store.list().filter((f) =>
    f.ownerId === userId && !f.deleted && f.name.toLowerCase().includes(query)
  );
  res.json({ files: items, total: items.length });
});

// Storage stats
driveRouter.get('/stats', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = store.list().filter((f) => f.ownerId === userId && !f.deleted);
  const totalSize = items.reduce((acc, f) => acc + (f.size || 0), 0);
  const quotaBytes = 5 * 1024 * 1024 * 1024; // 5GB quota
  res.json({
    used: totalSize,
    quota: quotaBytes,
    percentage: Math.round((totalSize / quotaBytes) * 100),
    fileCount: items.length,
  });
});

// Upload file
driveRouter.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const file = req.file;
  if (!file) { res.status(400).json({ error: 'No file provided' }); return; }

  const parentId = req.body.parentId || null;
  const now = new Date();

  const driveFile: DriveFile = {
    id: crypto.randomUUID(),
    name: file.originalname,
    type: 'file',
    mimeType: file.mimetype,
    parentId,
    content: '',
    size: file.size,
    created_at: now,
    updated_at: now,
    ownerId: userId,
    filePath: file.path,
    versions: [{ id: crypto.randomUUID(), size: file.size, created_at: now }],
  };
  store.set(driveFile.id, driveFile);
  res.status(201).json(driveFile);
});

// Download file
driveRouter.get('/download/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const file = store.get(req.params.id);
  if (!file || file.ownerId !== userId || file.deleted) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (file.filePath && fs.existsSync(file.filePath)) {
    res.download(file.filePath, file.name);
  } else if (file.content) {
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.send(file.content);
  } else {
    res.status(404).json({ error: 'File content not found' });
  }
});

// Create file/folder (JSON)
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

// List folder contents
driveRouter.get('/folder/:parentId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = store.list().filter(
    (f) => f.parentId === req.params.parentId && f.ownerId === userId && !f.deleted,
  );
  res.json({ files: items, total: items.length });
});

// Get single file
driveRouter.get('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const file = store.get(req.params.id);
  if (!file || file.ownerId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.json(file);
});

// Update file
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

// Soft delete (move to trash)
driveRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const file = store.get(req.params.id);
  if (!file || file.ownerId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Soft delete
  const updated = { ...file, deleted: true, deletedAt: new Date() };
  store.set(updated.id, updated);
  res.status(204).send();
});

// Restore from trash
driveRouter.post('/:id/restore', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const file = store.get(req.params.id);
  if (!file || file.ownerId !== userId || !file.deleted) {
    res.status(404).json({ error: 'File not found in trash' });
    return;
  }
  const updated = { ...file, deleted: false, deletedAt: undefined };
  store.set(updated.id, updated);
  res.json(updated);
});

// Permanently delete
driveRouter.delete('/:id/permanent', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const file = store.get(req.params.id);
  if (!file || file.ownerId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Delete actual file from disk if it exists
  if (file.filePath && fs.existsSync(file.filePath)) {
    fs.unlinkSync(file.filePath);
  }
  store.delete(req.params.id);
  res.status(204).send();
});
