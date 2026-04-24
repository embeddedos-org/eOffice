import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest, pickFields } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH } from '../middleware/validate';

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

interface FormRecord {
  id: string;
  title: string;
  fields: FormField[];
  created_at: Date;
  updated_at: Date;
  ownerId: string;
}

interface Submission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  submitted_at: Date;
}

const store = new Map<string, FormRecord>();
const submissions = new Map<string, Submission[]>();

export const formsRouter = Router();

formsRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = Array.from(store.values()).filter((f) => f.ownerId === userId);
  res.json({ forms: items, total: items.length });
});

formsRouter.post('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { title, fields } = req.body;
  if (!title) { res.status(400).json({ error: 'title is required' }); return; }

  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  const now = new Date();
  const form: FormRecord = {
    id: crypto.randomUUID(),
    title,
    fields: Array.isArray(fields) ? fields : [],
    created_at: now,
    updated_at: now,
    ownerId: userId,
  };
  store.set(form.id, form);
  submissions.set(form.id, []);
  res.status(201).json(form);
});

formsRouter.get('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const form = store.get(req.params.id);
  if (!form || form.ownerId !== userId) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  res.json(form);
});

formsRouter.put('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const form = store.get(req.params.id);
  if (!form || form.ownerId !== userId) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }

  const allowed = pickFields<FormRecord>(req.body, ['title', 'fields']);
  const updated: FormRecord = {
    ...form,
    title: (allowed.title as string) ?? form.title,
    fields: Array.isArray(allowed.fields) ? allowed.fields as FormField[] : form.fields,
    updated_at: new Date(),
  };
  store.set(updated.id, updated);
  res.json(updated);
});

formsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const form = store.get(req.params.id);
  if (!form || form.ownerId !== userId) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  store.delete(req.params.id);
  submissions.delete(req.params.id);
  res.status(204).send();
});

formsRouter.post('/:id/submit', (req: Request, res: Response) => {
  const form = store.get(req.params.id);
  if (!form) { res.status(404).json({ error: 'Form not found' }); return; }

  const data = req.body.data;
  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'data object is required' });
    return;
  }

  const entry: Submission = {
    id: crypto.randomUUID(),
    formId: req.params.id,
    data,
    submitted_at: new Date(),
  };
  const list = submissions.get(req.params.id) ?? [];
  list.push(entry);
  submissions.set(req.params.id, list);
  res.status(201).json(entry);
});

formsRouter.get('/:id/submissions', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const form = store.get(req.params.id);
  if (!form || form.ownerId !== userId) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  const list = submissions.get(req.params.id) ?? [];
  res.json({ submissions: list, total: list.length });
});
