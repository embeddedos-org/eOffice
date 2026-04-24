import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import type { NoteEntry } from '@eoffice/core';
import { AuthRequest, pickFields } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH, MAX_TAG_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface OwnedNote extends NoteEntry {
  ownerId: string;
}

const store = new FileStore<OwnedNote>(path.join(os.homedir(), '.eoffice', 'data', 'notes'));

export const notesRouter = Router();

notesRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  let notes = store.list().filter((n) => n.ownerId === userId);

  const search = req.query.search as string | undefined;
  if (search) {
    const query = search.toLowerCase();
    notes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query),
    );
  }

  const tag = req.query.tag as string | undefined;
  if (tag) {
    notes = notes.filter((n) => n.tags.includes(tag));
  }

  res.json({ notes, total: notes.length });
});

notesRouter.get('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const note = store.get(req.params.id);
  if (!note || note.ownerId !== userId) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  res.json(note);
});

notesRouter.post('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { title, content, tags, pinned } = req.body;

  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  if (content) {
    const contentErr = validateStringLength(content, 'content', MAX_CONTENT_LENGTH);
    if (contentErr) { res.status(400).json({ error: contentErr }); return; }
  }

  const now = new Date();
  const note: OwnedNote = {
    id: crypto.randomUUID(),
    title,
    content: content ?? '',
    tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string' && t.length <= MAX_TAG_LENGTH) : [],
    created_at: now,
    updated_at: now,
    pinned: pinned === true,
    ownerId: userId,
  };

  store.set(note.id, note);
  res.status(201).json(note);
});

notesRouter.put('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const existing = store.get(req.params.id);
  if (!existing || existing.ownerId !== userId) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }

  const allowed = pickFields<OwnedNote>(req.body, ['title', 'content', 'tags', 'pinned']);

  const updated: OwnedNote = {
    ...existing,
    title: (allowed.title as string) ?? existing.title,
    content: (allowed.content as string) ?? existing.content,
    tags: Array.isArray(allowed.tags) ? allowed.tags as string[] : existing.tags,
    pinned: typeof allowed.pinned === 'boolean' ? allowed.pinned : existing.pinned,
    updated_at: new Date(),
  };

  store.set(updated.id, updated);
  res.json(updated);
});

notesRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const note = store.get(req.params.id);
  if (!note || note.ownerId !== userId) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  store.delete(req.params.id);
  res.status(204).send();
});
