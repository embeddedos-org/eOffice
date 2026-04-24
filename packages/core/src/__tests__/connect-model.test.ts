import { describe, it, expect } from 'vitest';
import { ConnectModel } from '../connect-model';

describe('ConnectModel', () => {
  it('should create with default channels', () => {
    const model = new ConnectModel();
    expect(model.channels.length).toBeGreaterThan(0);
  });

  it('should add a channel', () => {
    const model = new ConnectModel();
    const initial = model.channels.length;
    model.addChannel('test-channel', 'A test channel');
    expect(model.channels.length).toBe(initial + 1);
    expect(model.channels.find((c) => c.name === 'test-channel')).toBeDefined();
  });

  it('should send a message to a channel', () => {
    const model = new ConnectModel();
    const channelId = model.channels[0].id;
    model.sendMessage(channelId, 'Hello World', 'TestUser');
    const messages = model.getMessages(channelId);
    expect(messages.some((m) => m.content === 'Hello World')).toBe(true);
  });
});
