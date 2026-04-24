import { describe, it, expect } from 'vitest';
import { MailboxModel } from '../email-model';

describe('MailboxModel', () => {
  it('should create a mailbox with default folders', () => {
    const model = new MailboxModel();
    expect(model.folders.length).toBeGreaterThan(0);
    expect(model.folders.some((f) => f.name === 'Inbox' || f.name === 'INBOX')).toBe(true);
  });

  it('should add a message', () => {
    const model = new MailboxModel();
    const msg = model.addMessage({
      from: 'test@example.com',
      to: 'user@example.com',
      subject: 'Test Subject',
      body: 'Test body',
    });
    expect(msg.id).toBeDefined();
    expect(msg.subject).toBe('Test Subject');
  });

  it('should list messages', () => {
    const model = new MailboxModel();
    model.addMessage({
      from: 'a@b.com',
      to: 'c@d.com',
      subject: 'Test',
      body: 'Body',
    });
    const messages = model.getMessages();
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should mark a message as read', () => {
    const model = new MailboxModel();
    const msg = model.addMessage({
      from: 'a@b.com',
      to: 'c@d.com',
      subject: 'Test',
      body: 'Body',
    });
    model.markRead(msg.id, true);
    const updated = model.getMessage(msg.id);
    expect(updated?.read).toBe(true);
  });
});
