import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import type { Document } from '@eoffice/core';
import { AuthRequest, pickFields } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface OwnedDocument extends Document {
  ownerId: string;
}

const store = new FileStore<OwnedDocument>(path.join(os.homedir(), '.eoffice', 'data', 'documents'));

export const documentsRouter = Router();

documentsRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const documents = store.list().filter((d) => d.ownerId === userId);
  res.json({ documents, total: documents.length });
});

documentsRouter.get('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const doc = store.get(req.params.id);
  if (!doc || doc.ownerId !== userId) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json(doc);
});

documentsRouter.post('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { title, content, app_id, tags } = req.body;

  if (!title || !app_id) {
    res.status(400).json({ error: 'title and app_id are required' });
    return;
  }

  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  if (content) {
    const contentErr = validateStringLength(content, 'content', MAX_CONTENT_LENGTH);
    if (contentErr) { res.status(400).json({ error: contentErr }); return; }
  }

  const now = new Date();
  const doc: OwnedDocument = {
    id: crypto.randomUUID(),
    title,
    content: content ?? '',
    app_id,
    created_at: now,
    updated_at: now,
    tags: Array.isArray(tags) ? tags : [],
    ownerId: userId,
  };

  store.set(doc.id, doc);
  res.status(201).json(doc);
});

documentsRouter.put('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const existing = store.get(req.params.id);
  if (!existing || existing.ownerId !== userId) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const allowed = pickFields<OwnedDocument>(req.body, ['title', 'content', 'app_id', 'tags']);

  if (allowed.title) {
    const titleErr = validateStringLength(allowed.title, 'title', MAX_TITLE_LENGTH);
    if (titleErr) { res.status(400).json({ error: titleErr }); return; }
  }

  const updated: OwnedDocument = {
    ...existing,
    title: (allowed.title as string) ?? existing.title,
    content: (allowed.content as string) ?? existing.content,
    app_id: (allowed.app_id as string) ?? existing.app_id,
    tags: (allowed.tags as string[]) ?? existing.tags,
    updated_at: new Date(),
  };

  store.set(updated.id, updated);
  res.json(updated);
});

documentsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const doc = store.get(req.params.id);
  if (!doc || doc.ownerId !== userId) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  store.delete(req.params.id);
  res.status(204).send();
});


// --- Document Comments ---
interface DocComment {
  id: string;
  documentId: string;
  text: string;
  author: string;
  authorId: string;
  timestamp: string;
  resolved: boolean;
  selectionText?: string;
  replies: Array<{
    id: string;
    text: string;
    author: string;
    authorId: string;
    timestamp: string;
  }>;
}

const commentsStore = new FileStore<DocComment>(path.join(os.homedir(), '.eoffice', 'data', 'doc-comments'));

// GET /api/documents/:id/comments
documentsRouter.get('/:id/comments', (req: Request, res: Response) => {
  const docId = req.params.id;
  const comments = commentsStore.list().filter(c => c.documentId === docId);
  res.json(comments);
});

// POST /api/documents/:id/comments
documentsRouter.post('/:id/comments', (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  const { text, selectionText } = req.body;
  if (!text) { res.status(400).json({ error: 'text is required' }); return; }

  const comment: DocComment = {
    id: crypto.randomUUID(),
    documentId: req.params.id,
    text,
    author: user.username,
    authorId: user.id,
    timestamp: new Date().toISOString(),
    resolved: false,
    selectionText,
    replies: [],
  };
  commentsStore.set(comment.id, comment);
  res.status(201).json(comment);
});

// POST /api/documents/:id/comments/:commentId/reply
documentsRouter.post('/:id/comments/:commentId/reply', (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  const comment = commentsStore.get(req.params.commentId);
  if (!comment) { res.status(404).json({ error: 'Comment not found' }); return; }
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: 'text is required' }); return; }

  comment.replies.push({
    id: crypto.randomUUID(),
    text,
    author: user.username,
    authorId: user.id,
    timestamp: new Date().toISOString(),
  });
  commentsStore.set(comment.id, comment);
  res.json(comment);
});

// PUT /api/documents/:id/comments/:commentId/resolve
documentsRouter.put('/:id/comments/:commentId/resolve', (req: Request, res: Response) => {
  const comment = commentsStore.get(req.params.commentId);
  if (!comment) { res.status(404).json({ error: 'Comment not found' }); return; }
  comment.resolved = !comment.resolved;
  commentsStore.set(comment.id, comment);
  res.json(comment);
});

// DELETE /api/documents/:id/comments/:commentId
documentsRouter.delete('/:id/comments/:commentId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const comment = commentsStore.get(req.params.commentId);
  if (!comment) { res.status(404).json({ error: 'Comment not found' }); return; }
  if (comment.authorId !== userId) { res.status(403).json({ error: 'Cannot delete others\' comments' }); return; }
  commentsStore.delete(req.params.commentId);
  res.status(204).end();
});
