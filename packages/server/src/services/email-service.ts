import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { simpleParser, ParsedMail } from 'mailparser';
import type { EmailAccount } from './email-config';

export interface EmailMessage {
  id: string;
  uid: number;
  from: string;
  fromName: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  html: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: string;
  hasAttachments: boolean;
  attachments: Array<{ filename: string; size: number; contentType: string }>;
}

export interface EmailFolder {
  name: string;
  path: string;
  specialUse?: string;
  messageCount: number;
  unseenCount: number;
}

export const PROVIDER_PRESETS: Record<string, { imapHost: string; imapPort: number; smtpHost: string; smtpPort: number; useTLS: boolean }> = {
  gmail: {
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    useTLS: true,
  },
  outlook: {
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    useTLS: true,
  },
  yahoo: {
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    useTLS: true,
  },
};

export class EmailService {
  private imapClient: ImapFlow | null = null;
  private smtpTransport: Transporter | null = null;
  private account: EmailAccount;

  constructor(account: EmailAccount) {
    this.account = account;
  }

  async connect(): Promise<void> {
    await this.connectImap();
    this.connectSmtp();
  }

  async disconnect(): Promise<void> {
    if (this.imapClient) {
      await this.imapClient.logout();
      this.imapClient = null;
    }
    if (this.smtpTransport) {
      this.smtpTransport.close();
      this.smtpTransport = null;
    }
  }

  private async connectImap(): Promise<void> {
    this.imapClient = new ImapFlow({
      host: this.account.imapHost,
      port: this.account.imapPort,
      secure: this.account.useTLS,
      auth: {
        user: this.account.email,
        pass: this.account.password,
      },
      logger: false,
    });
    await this.imapClient.connect();
  }

  private connectSmtp(): void {
    this.smtpTransport = nodemailer.createTransport({
      host: this.account.smtpHost,
      port: this.account.smtpPort,
      secure: this.account.smtpPort === 465,
      auth: {
        user: this.account.email,
        pass: this.account.password,
      },
    });
  }

  async testConnection(): Promise<{ imap: boolean; smtp: boolean; error?: string }> {
    const result = { imap: false, smtp: false, error: undefined as string | undefined };
    try {
      const testImap = new ImapFlow({
        host: this.account.imapHost,
        port: this.account.imapPort,
        secure: this.account.useTLS,
        auth: { user: this.account.email, pass: this.account.password },
        logger: false,
      });
      await testImap.connect();
      result.imap = true;
      await testImap.logout();
    } catch (e: any) {
      result.error = `IMAP: ${e.message}`;
    }

    try {
      const testSmtp = nodemailer.createTransport({
        host: this.account.smtpHost,
        port: this.account.smtpPort,
        secure: this.account.smtpPort === 465,
        auth: { user: this.account.email, pass: this.account.password },
      });
      await testSmtp.verify();
      result.smtp = true;
      testSmtp.close();
    } catch (e: any) {
      result.error = (result.error ? result.error + '; ' : '') + `SMTP: ${e.message}`;
    }

    return result;
  }

  async getFolders(): Promise<EmailFolder[]> {
    if (!this.imapClient) throw new Error('Not connected');
    const mailboxes = await this.imapClient.list();
    return mailboxes.map((mb) => ({
      name: mb.name,
      path: mb.path,
      specialUse: mb.specialUse,
      messageCount: mb.status?.messages ?? 0,
      unseenCount: mb.status?.unseen ?? 0,
    }));
  }

  async createFolder(name: string): Promise<void> {
    if (!this.imapClient) throw new Error('Not connected');
    await this.imapClient.mailboxCreate(name);
  }

  async deleteFolder(name: string): Promise<void> {
    if (!this.imapClient) throw new Error('Not connected');
    await this.imapClient.mailboxDelete(name);
  }

  async getMessages(folder: string = 'INBOX', page: number = 1, pageSize: number = 50): Promise<{ messages: EmailMessage[]; total: number }> {
    if (!this.imapClient) throw new Error('Not connected');

    const lock = await this.imapClient.getMailboxLock(folder);
    try {
      const status = await this.imapClient.status(folder, { messages: true });
      const total = status.messages || 0;

      if (total === 0) {
        return { messages: [], total: 0 };
      }

      const start = Math.max(1, total - (page * pageSize) + 1);
      const end = Math.max(1, total - ((page - 1) * pageSize));
      const range = `${start}:${end}`;

      const messages: EmailMessage[] = [];

      for await (const msg of this.imapClient.fetch(range, {
        envelope: true,
        source: true,
        flags: true,
        uid: true,
      })) {
        try {
          const parsed: ParsedMail = await simpleParser(msg.source);
          const ccAddresses = parsed.cc
            ? (Array.isArray(parsed.cc)
                ? parsed.cc.map((c) => c.value.map((v) => v.address).join(', ')).join(', ')
                : parsed.cc.value.map((v) => v.address).join(', '))
            : '';

          messages.push({
            id: msg.uid.toString(),
            uid: msg.uid,
            from: parsed.from?.value?.[0]?.address || '',
            fromName: parsed.from?.value?.[0]?.name || parsed.from?.value?.[0]?.address || '',
            to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map((t) => t.value.map((v) => v.address).join(', ')).join(', ') : parsed.to.value.map((v) => v.address).join(', ')) : '',
            cc: ccAddresses,
            subject: parsed.subject || '(no subject)',
            body: parsed.text || '',
            html: parsed.html || '',
            date: (parsed.date || new Date()).toISOString(),
            read: msg.flags.has('\\Seen'),
            starred: msg.flags.has('\\Flagged'),
            folder,
            hasAttachments: (parsed.attachments?.length ?? 0) > 0,
            attachments: (parsed.attachments || []).map((a) => ({
              filename: a.filename || 'attachment',
              size: a.size || 0,
              contentType: a.contentType || 'application/octet-stream',
            })),
          });
        } catch {
          // skip unparseable messages
        }
      }

      messages.reverse();
      return { messages, total };
    } finally {
      lock.release();
    }
  }

  async searchMessages(query: string, folder: string = 'INBOX'): Promise<EmailMessage[]> {
    if (!this.imapClient) throw new Error('Not connected');

    const lock = await this.imapClient.getMailboxLock(folder);
    try {
      const messages: EmailMessage[] = [];

      // Use IMAP SEARCH
      const searchResult = await this.imapClient.search({
        or: [
          { subject: query },
          { from: query },
          { body: query },
        ],
      });

      if (searchResult.length === 0) return [];

      // Fetch the matched messages (limit to 100)
      const uids = searchResult.slice(-100);
      for await (const msg of this.imapClient.fetch(uids, {
        envelope: true,
        source: true,
        flags: true,
        uid: true,
      })) {
        try {
          const parsed: ParsedMail = await simpleParser(msg.source);
          messages.push({
            id: msg.uid.toString(),
            uid: msg.uid,
            from: parsed.from?.value?.[0]?.address || '',
            fromName: parsed.from?.value?.[0]?.name || parsed.from?.value?.[0]?.address || '',
            to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map((t) => t.value.map((v) => v.address).join(', ')).join(', ') : parsed.to.value.map((v) => v.address).join(', ')) : '',
            subject: parsed.subject || '(no subject)',
            body: parsed.text || '',
            html: parsed.html || '',
            date: (parsed.date || new Date()).toISOString(),
            read: msg.flags.has('\\Seen'),
            starred: msg.flags.has('\\Flagged'),
            folder,
            hasAttachments: (parsed.attachments?.length ?? 0) > 0,
            attachments: (parsed.attachments || []).map((a) => ({
              filename: a.filename || 'attachment',
              size: a.size || 0,
              contentType: a.contentType || 'application/octet-stream',
            })),
          });
        } catch {
          // skip
        }
      }

      messages.reverse();
      return messages;
    } finally {
      lock.release();
    }
  }

  async moveMessage(uid: number, fromFolder: string, toFolder: string): Promise<void> {
    if (!this.imapClient) throw new Error('Not connected');
    const lock = await this.imapClient.getMailboxLock(fromFolder);
    try {
      await this.imapClient.messageMove({ uid }, toFolder, { uid: true });
    } finally {
      lock.release();
    }
  }

  async sendMessage(
    to: string,
    subject: string,
    body: string,
    html?: string,
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>,
    cc?: string,
    bcc?: string,
  ): Promise<{ messageId: string }> {
    if (!this.smtpTransport) throw new Error('SMTP not connected');

    const info = await this.smtpTransport.sendMail({
      from: this.account.email,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      text: body,
      html: html || undefined,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    return { messageId: info.messageId };
  }

  async markRead(folder: string, uid: number, read: boolean = true): Promise<void> {
    if (!this.imapClient) throw new Error('Not connected');
    const lock = await this.imapClient.getMailboxLock(folder);
    try {
      if (read) {
        await this.imapClient.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
      } else {
        await this.imapClient.messageFlagsRemove({ uid }, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  }

  async toggleStar(folder: string, uid: number, starred: boolean): Promise<void> {
    if (!this.imapClient) throw new Error('Not connected');
    const lock = await this.imapClient.getMailboxLock(folder);
    try {
      if (starred) {
        await this.imapClient.messageFlagsAdd({ uid }, ['\\Flagged'], { uid: true });
      } else {
        await this.imapClient.messageFlagsRemove({ uid }, ['\\Flagged'], { uid: true });
      }
    } finally {
      lock.release();
    }
  }

  async deleteMessage(folder: string, uid: number): Promise<void> {
    if (!this.imapClient) throw new Error('Not connected');
    const lock = await this.imapClient.getMailboxLock(folder);
    try {
      await this.imapClient.messageFlagsAdd({ uid }, ['\\Deleted'], { uid: true });
      await this.imapClient.messageDelete({ uid }, { uid: true });
    } finally {
      lock.release();
    }
  }

  async moveToTrash(folder: string, uid: number): Promise<void> {
    if (!this.imapClient) throw new Error('Not connected');
    const lock = await this.imapClient.getMailboxLock(folder);
    try {
      await this.imapClient.messageMove({ uid }, '[Gmail]/Trash', { uid: true });
    } catch {
      try {
        await this.imapClient.messageMove({ uid }, 'Trash', { uid: true });
      } catch {
        await this.imapClient.messageFlagsAdd({ uid }, ['\\Deleted'], { uid: true });
      }
    } finally {
      lock.release();
    }
  }
}
