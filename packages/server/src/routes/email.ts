import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import multer from 'multer';
import { EmailService, PROVIDER_PRESETS } from '../services/email-service';
import {
  addAccount,
  getAccounts,
  getAccountWithPassword,
  removeAccount,
} from '../services/email-config';
import { AuthRequest } from '../middleware/auth';
import { emailSendLimiter } from '../middleware/rate-limit';
import { validateEmail, validateStringLength, MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH, MAX_NAME_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

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
    if (!validateEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Account creation failed';
    console.error('Email account error:', message);
    res.status(500).json({ error: 'Failed to create email account' });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection test failed';
    console.error('Email test error:', message);
    res.status(500).json({ error: 'Connection test failed' });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get folders';
    console.error('Email folders error:', message);
    res.status(500).json({ error: 'Failed to get folders' });
  }
});

emailRouter.post('/folders', async (req: Request, res: Response) => {
  try {
    const { accountId, name } = req.body;
    if (!accountId || !name) {
      res.status(400).json({ error: 'accountId and name are required' });
      return;
    }
    const nameErr = validateStringLength(name, 'name', MAX_NAME_LENGTH);
    if (nameErr) { res.status(400).json({ error: nameErr }); return; }

    const service = await getService(accountId);
    await service.createFolder(name);
    res.status(201).json({ name, created: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create folder';
    console.error('Email folder create error:', message);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

emailRouter.put('/folders/rename', async (req: Request, res: Response) => {
  try {
    const { accountId, oldName, newName } = req.body;
    if (!accountId || !oldName || !newName) {
      res.status(400).json({ error: 'accountId, oldName, and newName are required' });
      return;
    }
    const nameErr = validateStringLength(newName, 'newName', MAX_NAME_LENGTH);
    if (nameErr) { res.status(400).json({ error: nameErr }); return; }

    const service = await getService(accountId);
    await service.renameFolder(oldName, newName);
    res.json({ oldName, newName, renamed: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to rename folder';
    console.error('Email folder rename error:', message);
    res.status(500).json({ error: 'Failed to rename folder' });
  }
});

emailRouter.delete('/folders', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    const name = req.query.name as string;
    if (!accountId || !name) {
      res.status(400).json({ error: 'accountId and name query params required' });
      return;
    }
    const service = await getService(accountId);
    await service.deleteFolder(name);
    res.status(204).send();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete folder';
    console.error('Email folder delete error:', message);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// --- Messages ---

emailRouter.get('/messages', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    const folder = (req.query.folder as string) || 'INBOX';
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);

    if (!accountId) {
      res.json({ messages: [], total: 0 });
      return;
    }

    const service = await getService(accountId);
    const result = await service.getMessages(folder, page, pageSize);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get messages';
    console.error('Email messages error:', message);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

emailRouter.post('/messages/send', emailSendLimiter, upload.array('attachments', 10), async (req: Request, res: Response) => {
  try {
    const { accountId, to, subject, body, html, cc, bcc } = req.body;
    if (!accountId || !to || !subject) {
      res.status(400).json({ error: 'accountId, to, and subject are required' });
      return;
    }

    const files = (req as AuthRequest & { files?: Express.Multer.File[] }).files;
    const attachments = files?.map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    const service = await getService(accountId);
    const result = await service.sendMessage(to, subject, body || '', html, attachments, cc, bcc);
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    console.error('Email send error:', message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

emailRouter.post('/messages/move', async (req: Request, res: Response) => {
  try {
    const { accountId, uid, fromFolder, toFolder } = req.body;
    if (!accountId || !uid || !fromFolder || !toFolder) {
      res.status(400).json({ error: 'accountId, uid, fromFolder, and toFolder are required' });
      return;
    }
    const parsedUid = parseInt(uid);
    if (isNaN(parsedUid)) {
      res.status(400).json({ error: 'uid must be a number' });
      return;
    }
    const service = await getService(accountId);
    await service.moveMessage(parsedUid, fromFolder, toFolder);
    res.json({ moved: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to move message';
    console.error('Email move error:', message);
    res.status(500).json({ error: 'Failed to move message' });
  }
});

emailRouter.put('/messages/:id/read', async (req: Request, res: Response) => {
  try {
    const { accountId, folder } = req.body;
    const uid = parseInt(req.params.id);
    if (isNaN(uid)) { res.status(400).json({ error: 'Invalid message id' }); return; }
    const read = req.body.read === true;

    if (!accountId) {
      res.json({ id: req.params.id, read });
      return;
    }

    const service = await getService(accountId);
    await service.markRead(folder || 'INBOX', uid, read);
    res.json({ id: req.params.id, uid, read });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update read status';
    console.error('Email read error:', message);
    res.status(500).json({ error: 'Failed to update read status' });
  }
});

emailRouter.put('/messages/:id/star', async (req: Request, res: Response) => {
  try {
    const { accountId, folder, starred } = req.body;
    const uid = parseInt(req.params.id);
    if (isNaN(uid)) { res.status(400).json({ error: 'Invalid message id' }); return; }

    if (!accountId) {
      res.json({ id: req.params.id, starred: starred === true });
      return;
    }

    const service = await getService(accountId);
    await service.toggleStar(folder || 'INBOX', uid, starred === true);
    res.json({ id: req.params.id, uid, starred });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle star';
    console.error('Email star error:', message);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

emailRouter.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    const folder = (req.query.folder as string) || 'INBOX';
    const uid = parseInt(req.params.id);
    if (isNaN(uid)) { res.status(400).json({ error: 'Invalid message id' }); return; }

    if (!accountId) {
      res.status(204).send();
      return;
    }

    const service = await getService(accountId);
    await service.moveToTrash(folder, uid);
    res.status(204).send();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete message';
    console.error('Email delete error:', message);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// --- Search ---

emailRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    const query = req.query.query as string;
    const folder = (req.query.folder as string) || 'INBOX';

    if (!accountId || !query) {
      res.status(400).json({ error: 'accountId and query are required' });
      return;
    }

    const service = await getService(accountId);
    const results = await service.searchMessages(query, folder);
    res.json({ messages: results, total: results.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    console.error('Email search error:', message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- Contacts ---

interface Contact {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  ownerId: string;
}

const contactsStore = new FileStore<Contact>(path.join(os.homedir(), '.eoffice', 'data', 'contacts'));

emailRouter.get('/contacts', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const contacts = contactsStore.list().filter((c) => c.ownerId === userId);
  res.json({ contacts });
});

emailRouter.post('/contacts', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { name, email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }
  if (!validateEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  const contact: Contact = {
    id: crypto.randomUUID(),
    name: typeof name === 'string' ? name : email.split('@')[0],
    email,
    createdAt: new Date().toISOString(),
    ownerId: userId,
  };
  contactsStore.set(contact.id, contact);
  res.status(201).json(contact);
});

emailRouter.delete('/contacts/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const contact = contactsStore.get(req.params.id);
  if (!contact || contact.ownerId !== userId) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }
  contactsStore.delete(req.params.id);
  res.status(204).send();
});

// --- Signatures ---

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  ownerId: string;
}

const signaturesStore = new FileStore<Signature>(path.join(os.homedir(), '.eoffice', 'data', 'signatures'));

emailRouter.get('/signatures', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const signatures = signaturesStore.list().filter((s) => s.ownerId === userId);
  res.json({ signatures });
});

emailRouter.post('/signatures', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { name, content, isDefault } = req.body;
  if (!name || !content) {
    res.status(400).json({ error: 'name and content are required' });
    return;
  }
  const nameErr = validateStringLength(name, 'name', MAX_NAME_LENGTH);
  if (nameErr) { res.status(400).json({ error: nameErr }); return; }
  const contentErr = validateStringLength(content, 'content', MAX_CONTENT_LENGTH);
  if (contentErr) { res.status(400).json({ error: contentErr }); return; }

const userSigs = signaturesStore.list().filter((s) => s.ownerId === userId);
  if (isDefault) {
    userSigs.forEach((s) => { s.isDefault = false; signaturesStore.set(s.id, s); });
  }

  const sig: Signature = {
    id: crypto.randomUUID(),
    name,
    content,
    isDefault: isDefault || userSigs.length === 0,
    createdAt: new Date().toISOString(),
    ownerId: userId,
  };
  signaturesStore.set(sig.id, sig);
  res.status(201).json(sig);
});

// --- Calendar events ---

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  attendees: string[];
  created_at: Date;
  ownerId: string;
}

const events = new FileStore<CalendarEvent>(path.join(os.homedir(), '.eoffice', 'data', 'events'));

emailRouter.get('/events', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = events.list().filter((e) => e.ownerId === userId);
  res.json({ events: items, total: items.length });
});

emailRouter.post('/events', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { title, start, end, attendees } = req.body;
  if (!title || !start) {
    res.status(400).json({ error: 'title and start are required' });
    return;
  }
  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  const evt: CalendarEvent = {
    id: crypto.randomUUID(),
    title,
    start,
    end: typeof end === 'string' ? end : null,
    attendees: Array.isArray(attendees) ? attendees.filter((a: unknown) => typeof a === 'string') : [],
    created_at: new Date(),
    ownerId: userId,
  };
  events.set(evt.id, evt);
  res.status(201).json(evt);
});

emailRouter.delete('/events/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const evt = events.get(req.params.id);
  if (!evt || evt.ownerId !== userId) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  events.delete(req.params.id);
  res.status(204).send();
});
