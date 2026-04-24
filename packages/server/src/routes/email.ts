import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { EmailService, PROVIDER_PRESETS } from '../services/email-service';
import {
  addAccount,
  getAccounts,
  getAccountWithPassword,
  removeAccount,
} from '../services/email-config';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const activeServices = new Map<string, EmailService>();

export const emailRouter = Router();

// --- Account management ---

emailRouter.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { provider, email, password, imapHost, imapPort, smtpHost, smtpPort, useTLS } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const preset = PROVIDER_PRESETS[provider];
    const account = addAccount({
      provider: provider || 'custom',
      email,
      password,
      imapHost: imapHost || preset?.imapHost || '',
      imapPort: imapPort || preset?.imapPort || 993,
      smtpHost: smtpHost || preset?.smtpHost || '',
      smtpPort: smtpPort || preset?.smtpPort || 587,
      useTLS: useTLS ?? preset?.useTLS ?? true,
    });

    res.status(201).json({ id: account.id, email: account.email, provider: account.provider });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

emailRouter.get('/accounts', (_req: Request, res: Response) => {
  const accounts = getAccounts();
  res.json({ accounts });
});

emailRouter.delete('/accounts/:id', (req: Request, res: Response) => {
  const service = activeServices.get(req.params.id);
  if (service) {
    service.disconnect().catch(() => {});
    activeServices.delete(req.params.id);
  }
  const removed = removeAccount(req.params.id);
  if (!removed) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.status(204).send();
});

emailRouter.post('/accounts/:id/test', async (req: Request, res: Response) => {
  try {
    const account = getAccountWithPassword(req.params.id);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const service = new EmailService(account);
    const result = await service.testConnection();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Helper: get or create active EmailService ---

async function getService(accountId: string): Promise<EmailService> {
  let service = activeServices.get(accountId);
  if (service) return service;

  const account = getAccountWithPassword(accountId);
  if (!account) throw new Error('Account not found');

  service = new EmailService(account);
  await service.connect();
  activeServices.set(accountId, service);
  return service;
}

// --- Folders ---

emailRouter.get('/folders', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      res.status(400).json({ error: 'accountId query param required' });
      return;
    }
    const service = await getService(accountId);
    const folders = await service.getFolders();
    res.json({ folders });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Messages ---

emailRouter.get('/messages', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    const folder = (req.query.folder as string) || 'INBOX';
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    if (!accountId) {
      // Fallback: return empty for backwards compatibility
      res.json({ messages: [], total: 0 });
      return;
    }

    const service = await getService(accountId);
    const result = await service.getMessages(folder, page, pageSize);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

emailRouter.post('/messages/send', upload.array('attachments', 10), async (req: Request, res: Response) => {
  try {
    const { accountId, to, subject, body, html } = req.body;
    if (!accountId || !to || !subject) {
      res.status(400).json({ error: 'accountId, to, and subject are required' });
      return;
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    const attachments = files?.map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    const service = await getService(accountId);
    const result = await service.sendMessage(to, subject, body || '', html, attachments);
    res.status(201).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Legacy POST /messages endpoint for backwards compatibility
emailRouter.post('/messages', (req: Request, res: Response) => {
  const { to, subject, body, from } = req.body;
  if (!to || !subject) {
    res.status(400).json({ error: 'to and subject are required' });
    return;
  }
  const msg = {
    id: crypto.randomUUID(),
    from: from ?? 'me@eoffice.local',
    to,
    subject,
    body: body ?? '',
    read: false,
    starred: false,
    sent_at: new Date(),
  };
  res.status(201).json(msg);
});

emailRouter.put('/messages/:id/read', async (req: Request, res: Response) => {
  try {
    const { accountId, folder } = req.body;
    const uid = parseInt(req.params.id);
    const read = req.body.read ?? true;

    if (!accountId) {
      // Legacy mode
      res.json({ id: req.params.id, read });
      return;
    }

    const service = await getService(accountId);
    await service.markRead(folder || 'INBOX', uid, read);
    res.json({ id: req.params.id, uid, read });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

emailRouter.put('/messages/:id/star', async (req: Request, res: Response) => {
  try {
    const { accountId, folder, starred } = req.body;
    const uid = parseInt(req.params.id);

    if (!accountId) {
      res.json({ id: req.params.id, starred: starred ?? true });
      return;
    }

    const service = await getService(accountId);
    await service.toggleStar(folder || 'INBOX', uid, starred ?? true);
    res.json({ id: req.params.id, uid, starred });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

emailRouter.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    const folder = (req.query.folder as string) || 'INBOX';
    const uid = parseInt(req.params.id);

    if (!accountId) {
      res.status(204).send();
      return;
    }

    const service = await getService(accountId);
    await service.moveToTrash(folder, uid);
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Calendar events (keep existing functionality) ---

const events = new Map<string, any>();

emailRouter.get('/events', (_req: Request, res: Response) => {
  const items = Array.from(events.values());
  res.json({ events: items, total: items.length });
});

emailRouter.post('/events', (req: Request, res: Response) => {
  const { title, start, end } = req.body;
  if (!title || !start) {
    res.status(400).json({ error: 'title and start are required' });
    return;
  }
  const evt = {
    id: crypto.randomUUID(),
    title,
    start,
    end: end ?? null,
    attendees: req.body.attendees ?? [],
    created_at: new Date(),
  };
  events.set(evt.id, evt);
  res.status(201).json(evt);
});

emailRouter.delete('/events/:id', (req: Request, res: Response) => {
  if (!events.has(req.params.id)) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  events.delete(req.params.id);
  res.status(204).send();
});
