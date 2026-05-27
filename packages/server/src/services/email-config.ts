import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'custom';
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  useTLS: boolean;
  createdAt: string;
}

interface StoredAccount {
  id: string;
  provider: string;
  email: string;
  encryptedPassword: string;
  iv: string;
  authTag: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  useTLS: boolean;
  createdAt: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.eoffice');
const CONFIG_FILE = path.join(CONFIG_DIR, 'email-accounts.json');
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const keyHex = process.env.EMAIL_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 64) {
    // Generate and warn if no key configured
    const generated = crypto.randomBytes(32);
    console.warn(
      '[email-config] WARNING: No EMAIL_ENCRYPTION_KEY set. Using random key (passwords will not survive restarts).',
      '\n  Set EMAIL_ENCRYPTION_KEY in .env to a 64-char hex string.',
    );
    return generated;
  }
  return Buffer.from(keyHex, 'hex');
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = getEncryptionKey();
  return cachedKey;
}

function encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { encrypted, iv: iv.toString('hex'), authTag };
}

function decrypt(encrypted: string, ivHex: string, authTagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readStore(): StoredAccount[] {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) return [];
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeStore(accounts: StoredAccount[]): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

export function addAccount(account: Omit<EmailAccount, 'id' | 'createdAt'>): EmailAccount {
  const id = crypto.randomUUID();
  const { encrypted, iv, authTag } = encrypt(account.password);

  const stored: StoredAccount = {
    id,
    provider: account.provider,
    email: account.email,
    encryptedPassword: encrypted,
    iv,
    authTag,
    imapHost: account.imapHost,
    imapPort: account.imapPort,
    smtpHost: account.smtpHost,
    smtpPort: account.smtpPort,
    useTLS: account.useTLS,
    createdAt: new Date().toISOString(),
  };

  const accounts = readStore();
  accounts.push(stored);
  writeStore(accounts);

  return { ...account, id, createdAt: stored.createdAt };
}

export function getAccounts(): Omit<EmailAccount, 'password'>[] {
  return readStore().map((a) => ({
    id: a.id,
    provider: a.provider as EmailAccount['provider'],
    email: a.email,
    imapHost: a.imapHost,
    imapPort: a.imapPort,
    smtpHost: a.smtpHost,
    smtpPort: a.smtpPort,
    useTLS: a.useTLS,
    createdAt: a.createdAt,
  }));
}

export function getAccountWithPassword(id: string): EmailAccount | null {
  const accounts = readStore();
  const stored = accounts.find((a) => a.id === id);
  if (!stored) return null;

  try {
    const password = decrypt(stored.encryptedPassword, stored.iv, stored.authTag);
    return {
      id: stored.id,
      provider: stored.provider as EmailAccount['provider'],
      email: stored.email,
      password,
      imapHost: stored.imapHost,
      imapPort: stored.imapPort,
      smtpHost: stored.smtpHost,
      smtpPort: stored.smtpPort,
      useTLS: stored.useTLS,
      createdAt: stored.createdAt,
    };
  } catch {
    return null;
  }
}

export function removeAccount(id: string): boolean {
  const accounts = readStore();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  accounts.splice(idx, 1);
  writeStore(accounts);
  return true;
}
