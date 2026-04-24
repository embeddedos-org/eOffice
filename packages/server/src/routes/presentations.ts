import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest, pickFields } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH } from '../middleware/validate';

interface SlideRecord {
  id: string;
  content: string;
  notes: string;
  layout: string;
}

interface PresentationRecord {
  id: string;
  title: string;
  theme: string;
  slides: SlideRecord[];
  created_at: Date;
  updated_at: Date;
  ownerId: string;
}

const store = new Map<string, PresentationRecord>();

export const presentationsRouter = Router();

presentationsRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = Array.from(store.values()).filter((p) => p.ownerId === userId);
  res.json({ presentations: items, total: items.length });
});

presentationsRouter.post('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { title, theme } = req.body;
  if (!title) { res.status(400).json({ error: 'title is required' }); return; }

  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  const now = new Date();
  const pres: PresentationRecord = {
    id: crypto.randomUUID(),
    title,
    theme: typeof theme === 'string' ? theme : 'default',
    slides: [],
    created_at: now,
    updated_at: now,
    ownerId: userId,
  };
  store.set(pres.id, pres);
  res.status(201).json(pres);
});

presentationsRouter.get('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const item = store.get(req.params.id);
  if (!item || item.ownerId !== userId) {
    res.status(404).json({ error: 'Presentation not found' });
    return;
  }
  res.json(item);
});

presentationsRouter.put('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const item = store.get(req.params.id);
  if (!item || item.ownerId !== userId) {
    res.status(404).json({ error: 'Presentation not found' });
    return;
  }

  const allowed = pickFields<PresentationRecord>(req.body, ['title', 'theme']);
  const updated: PresentationRecord = {
    ...item,
    title: (allowed.title as string) ?? item.title,
    theme: (allowed.theme as string) ?? item.theme,
    updated_at: new Date(),
  };
  store.set(updated.id, updated);
  res.json(updated);
});

presentationsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const item = store.get(req.params.id);
  if (!item || item.ownerId !== userId) {
    res.status(404).json({ error: 'Presentation not found' });
    return;
  }
  store.delete(req.params.id);
  res.status(204).send();
});

presentationsRouter.post('/:id/slides', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const pres = store.get(req.params.id);
  if (!pres || pres.ownerId !== userId) {
    res.status(404).json({ error: 'Presentation not found' });
    return;
  }
  const slide: SlideRecord = {
    id: crypto.randomUUID(),
    content: typeof req.body.content === 'string' ? req.body.content : '',
    notes: typeof req.body.notes === 'string' ? req.body.notes : '',
    layout: typeof req.body.layout === 'string' ? req.body.layout : 'blank',
  };
  pres.slides.push(slide);
  pres.updated_at = new Date();
  res.status(201).json(slide);
});

presentationsRouter.put('/:id/slides/:slideId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const pres = store.get(req.params.id);
  if (!pres || pres.ownerId !== userId) {
    res.status(404).json({ error: 'Presentation not found' });
    return;
  }
  const idx = pres.slides.findIndex((s) => s.id === req.params.slideId);
  if (idx === -1) { res.status(404).json({ error: 'Slide not found' }); return; }

  const allowed = pickFields<SlideRecord>(req.body, ['content', 'notes', 'layout']);
  pres.slides[idx] = { ...pres.slides[idx], ...allowed };
  pres.updated_at = new Date();
  res.json(pres.slides[idx]);
});

presentationsRouter.delete('/:id/slides/:slideId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const pres = store.get(req.params.id);
  if (!pres || pres.ownerId !== userId) {
    res.status(404).json({ error: 'Presentation not found' });
    return;
  }
  pres.slides = pres.slides.filter((s) => s.id !== req.params.slideId);
  pres.updated_at = new Date();
  res.status(204).send();
});

presentationsRouter.put('/:id/slides/reorder', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const pres = store.get(req.params.id);
  if (!pres || pres.ownerId !== userId) {
    res.status(404).json({ error: 'Presentation not found' });
    return;
  }
  const { order } = req.body;
  if (!Array.isArray(order)) { res.status(400).json({ error: 'order array is required' }); return; }
  const slideMap = new Map(pres.slides.map((s) => [s.id, s]));
  pres.slides = order
    .filter((id: unknown) => typeof id === 'string')
    .map((id: string) => slideMap.get(id))
    .filter((s): s is SlideRecord => s !== undefined);
  pres.updated_at = new Date();
  res.json(pres);
});
