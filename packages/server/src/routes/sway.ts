import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface SwaySlide {
  id: string;
  type: string;
  content: string;
  interactive: Record<string, unknown> | null;
  responses: SwayResponse[];
}

interface SwayResponse {
  id: string;
  answer: string;
  user: string;
  submitted_at: Date;
}

interface SwayRecord {
  id: string;
  title: string;
  theme: string;
  slides: SwaySlide[];
  created_at: Date;
  updated_at: Date;
  ownerId: string;
}

const store = new FileStore<SwayRecord>(path.join(os.homedir(), '.eoffice', 'data', 'sway'));

export const swayRouter = Router();

swayRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = store.list().filter((s) => s.ownerId === userId);
  res.json({ presentations: items, total: items.length });
});

swayRouter.post('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { title, theme } = req.body;
  if (!title) { res.status(400).json({ error: 'title is required' }); return; }

  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  const now = new Date();
  const sway: SwayRecord = {
    id: crypto.randomUUID(),
    title,
    theme: typeof theme === 'string' ? theme : 'default',
    slides: [],
    created_at: now,
    updated_at: now,
    ownerId: userId,
  };
  store.set(sway.id, sway);
  res.status(201).json(sway);
});

swayRouter.get('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const item = store.get(req.params.id);
  if (!item || item.ownerId !== userId) {
    res.status(404).json({ error: 'Sway not found' });
    return;
  }
  res.json(item);
});

swayRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const item = store.get(req.params.id);
  if (!item || item.ownerId !== userId) {
    res.status(404).json({ error: 'Sway not found' });
    return;
  }
  store.delete(req.params.id);
  res.status(204).send();
});

swayRouter.post('/:id/slides', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const sway = store.get(req.params.id);
  if (!sway || sway.ownerId !== userId) {
    res.status(404).json({ error: 'Sway not found' });
    return;
  }
  const slide: SwaySlide = {
    id: crypto.randomUUID(),
    type: typeof req.body.type === 'string' ? req.body.type : 'content',
    content: typeof req.body.content === 'string' ? req.body.content : '',
    interactive: req.body.interactive && typeof req.body.interactive === 'object' ? req.body.interactive : null,
    responses: [],
  };
  sway.slides.push(slide);
  sway.updated_at = new Date();
  store.set(sway.id, sway);
  res.status(201).json(slide);
});

swayRouter.delete('/:id/slides/:slideId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const sway = store.get(req.params.id);
  if (!sway || sway.ownerId !== userId) {
    res.status(404).json({ error: 'Sway not found' });
    return;
  }
  sway.slides = sway.slides.filter((s) => s.id !== req.params.slideId);
  sway.updated_at = new Date();
  store.set(sway.id, sway);
  res.status(204).send();
});

swayRouter.post('/:id/slides/:slideId/respond', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const sway = store.get(req.params.id);
  if (!sway || sway.ownerId !== userId) {
    res.status(404).json({ error: 'Sway not found' });
    return;
  }
  const slide = sway.slides.find((s) => s.id === req.params.slideId);
  if (!slide) { res.status(404).json({ error: 'Slide not found' }); return; }

  const answer = typeof req.body.answer === 'string' ? req.body.answer : '';
  const contentErr = validateStringLength(answer, 'answer', MAX_CONTENT_LENGTH);
  if (contentErr) { res.status(400).json({ error: contentErr }); return; }

  const response: SwayResponse = {
    id: crypto.randomUUID(),
    answer,
    user: (req as AuthRequest).user?.username ?? 'anonymous',
    submitted_at: new Date(),
  };
  slide.responses.push(response);
  store.set(sway.id, sway);
  res.status(201).json(response);
});
