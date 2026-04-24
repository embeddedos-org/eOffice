import { describe, it, expect } from 'vitest';
import { FileStore } from '../storage/store';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('FileStore Security', () => {
  const testDir = path.join(os.tmpdir(), `eoffice-test-${Date.now()}`);

  it('should sanitize keys with path traversal attempts', () => {
    const store = new FileStore<{ name: string }>(testDir);
    store.set('../../../etc/passwd', { name: 'evil' });

    // Should NOT create file outside testDir
    const evilPath = path.join(testDir, '..', '..', '..', 'etc', 'passwd.json');
    expect(fs.existsSync(evilPath)).toBe(false);

    // Should create file with sanitized name inside testDir
    expect(store.has('../../../etc/passwd')).toBe(true);
  });

  it('should sanitize keys with backslashes', () => {
    const store = new FileStore<{ name: string }>(testDir);
    store.set('..\\..\\test', { name: 'test' });
    expect(store.has('..\\..\\test')).toBe(true);
  });

  it('should handle normal CRUD operations', () => {
    const store = new FileStore<{ value: number }>(testDir);
    store.set('test-key', { value: 42 });
    expect(store.get('test-key')).toEqual({ value: 42 });
    expect(store.has('test-key')).toBe(true);

    store.delete('test-key');
    expect(store.get('test-key')).toBeUndefined();
    expect(store.has('test-key')).toBe(false);
  });

  it('should list all items', () => {
    const store = new FileStore<{ id: string }>(path.join(testDir, 'list-test'));
    store.set('item1', { id: '1' });
    store.set('item2', { id: '2' });
    const items = store.list();
    expect(items.length).toBe(2);
  });

  it('should return undefined for nonexistent keys', () => {
    const store = new FileStore<string>(testDir);
    expect(store.get('nonexistent')).toBeUndefined();
  });

  it('should return false for deleting nonexistent keys', () => {
    const store = new FileStore<string>(testDir);
    expect(store.delete('nonexistent')).toBe(false);
  });
});

describe('Input Validation', () => {
  it('should validate email format', async () => {
    const { validateEmail } = await import('../middleware/validate');
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@missing.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('should validate string length', async () => {
    const { validateStringLength } = await import('../middleware/validate');
    expect(validateStringLength('hello', 'test', 10)).toBeNull();
    expect(validateStringLength('hello', 'test', 3)).not.toBeNull();
    expect(validateStringLength('hi', 'test', 10, 3)).not.toBeNull();
  });

  it('should validate required fields', async () => {
    const { validateRequiredFields } = await import('../middleware/validate');
    expect(validateRequiredFields({ a: 1, b: 2 }, ['a', 'b'])).toBeNull();
    expect(validateRequiredFields({ a: 1 }, ['a', 'b'])).not.toBeNull();
    expect(validateRequiredFields({ a: '' }, ['a'])).not.toBeNull();
  });
});

describe('Sanitize Middleware', () => {
  it('should strip script tags', async () => {
    const { sanitizeBody } = await import('../middleware/sanitize');
    const req = {
      body: { content: '<script>alert("xss")</script>Hello' },
      query: {},
      params: {},
    };
    const res = {};
    let called = false;
    const next = () => { called = true; };
    sanitizeBody(req as any, res as any, next);
    expect(called).toBe(true);
    expect(req.body.content).not.toContain('<script>');
    expect(req.body.content).toContain('Hello');
  });

  it('should strip event handlers', async () => {
    const { sanitizeBody } = await import('../middleware/sanitize');
    const req = {
      body: { content: '<div onmouseover="evil()">text</div>' },
      query: {},
      params: {},
    };
    const res = {};
    const next = () => {};
    sanitizeBody(req as any, res as any, next);
    expect(req.body.content).not.toContain('onmouseover');
  });

  it('should strip javascript: URLs', async () => {
    const { sanitizeBody } = await import('../middleware/sanitize');
    const req = {
      body: { content: '<a href="javascript:alert(1)">click</a>' },
      query: {},
      params: {},
    };
    const res = {};
    const next = () => {};
    sanitizeBody(req as any, res as any, next);
    expect(req.body.content).not.toContain('javascript:');
  });

  it('should skip prototype pollution keys', async () => {
    const { sanitizeBody } = await import('../middleware/sanitize');
    const req = {
      body: { __proto__: 'evil', constructor: 'bad', normal: 'ok' },
      query: {},
      params: {},
    };
    const res = {};
    const next = () => {};
    sanitizeBody(req as any, res as any, next);
    expect(req.body.normal).toBe('ok');
    expect(req.body.__proto__).toBeUndefined();
    expect(req.body.constructor).toBeUndefined();
  });
});
