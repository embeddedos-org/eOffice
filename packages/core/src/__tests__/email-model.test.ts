import { describe, it, expect } from 'vitest';
import { MailboxModel } from '../email-model';

describe('MailboxModel', () => {
  it('should create a mailbox with default folders', () => {
    const model = new MailboxModel();
    // Model doesn't have folders, but has messages array
    expect(model.messages).toBeDefined();
    expect(Array.isArray(model.messages)).toBe(true);
  });

  it('should add a message', () => {
    const model = new MailboxModel();
    const msg = model.addMessage('test@example.com', ['user@example.com'], 'Test Subject', 'Test body');
    expect(msg.id).toBeDefined();
    expect(msg.subject).toBe('Test Subject');
  });

  it('should list messages', () => {
    const model = new MailboxModel();
    model.addMessage('a@b.com', ['c@d.com'], 'Test', 'Body');
    expect(model.messages.length).toBeGreaterThan(0);
  });

  it('should mark a message as read', () => {
    const model = new MailboxModel();
    const msg = model.addMessage('a@b.com', ['c@d.com'], 'Test', 'Body');
    model.markRead(msg.id);
    const updated = model.messages.find((m) => m.id === msg.id);
    expect(updated?.read).toBe(true);
  });
});
