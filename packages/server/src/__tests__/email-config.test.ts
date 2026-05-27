import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addAccount,
  getAccounts,
  getAccountWithPassword,
  removeAccount,
} from '../services/email-config';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.eoffice');
const CONFIG_FILE = path.join(CONFIG_DIR, 'email-accounts.json');

describe('Email Config Service', () => {
  let backupExists = false;
  let backupData = '';

  beforeEach(() => {
    // Backup existing config
    if (fs.existsSync(CONFIG_FILE)) {
      backupExists = true;
      backupData = fs.readFileSync(CONFIG_FILE, 'utf8');
    }
    // Set encryption key for tests
    process.env.EMAIL_ENCRYPTION_KEY = 'a'.repeat(64);
    // Clear config for clean test
    if (fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, '[]', 'utf8');
    }
  });

  afterEach(() => {
    // Restore backup
    if (backupExists) {
      fs.writeFileSync(CONFIG_FILE, backupData, 'utf8');
    } else if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  });

  describe('addAccount', () => {
    it('creates an account with generated id', () => {
      const account = addAccount({
        provider: 'gmail',
        email: 'test@gmail.com',
        password: 'secret123',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        useTLS: true,
      });

      expect(account.id).toBeDefined();
      expect(account.email).toBe('test@gmail.com');
      expect(account.provider).toBe('gmail');
      expect(account.createdAt).toBeDefined();
    });

    it('encrypts the password on disk', () => {
      addAccount({
        provider: 'gmail',
        email: 'test@gmail.com',
        password: 'mySecretPass',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        useTLS: true,
      });

      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      expect(raw).not.toContain('mySecretPass');
      const stored = JSON.parse(raw);
      expect(stored[0].encryptedPassword).toBeDefined();
      expect(stored[0].iv).toBeDefined();
      expect(stored[0].authTag).toBeDefined();
    });
  });

  describe('getAccounts', () => {
    it('returns accounts without passwords', () => {
      addAccount({
        provider: 'outlook',
        email: 'user@outlook.com',
        password: 'pass123',
        imapHost: 'outlook.office365.com',
        imapPort: 993,
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        useTLS: true,
      });

      const accounts = getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].email).toBe('user@outlook.com');
      expect((accounts[0] as any).password).toBeUndefined();
    });
  });

  describe('getAccountWithPassword', () => {
    it('decrypts the password correctly', () => {
      const created = addAccount({
        provider: 'yahoo',
        email: 'user@yahoo.com',
        password: 'myYahooPass!@#',
        imapHost: 'imap.mail.yahoo.com',
        imapPort: 993,
        smtpHost: 'smtp.mail.yahoo.com',
        smtpPort: 587,
        useTLS: true,
      });

      const account = getAccountWithPassword(created.id);
      expect(account).not.toBeNull();
      expect(account!.password).toBe('myYahooPass!@#');
    });

    it('returns null for unknown id', () => {
      const account = getAccountWithPassword('nonexistent');
      expect(account).toBeNull();
    });
  });

  describe('removeAccount', () => {
    it('removes an existing account', () => {
      const created = addAccount({
        provider: 'custom',
        email: 'user@example.com',
        password: 'pass',
        imapHost: 'imap.example.com',
        imapPort: 993,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        useTLS: true,
      });

      expect(removeAccount(created.id)).toBe(true);
      expect(getAccounts()).toHaveLength(0);
    });

    it('returns false for unknown id', () => {
      expect(removeAccount('nonexistent')).toBe(false);
    });
  });
});
