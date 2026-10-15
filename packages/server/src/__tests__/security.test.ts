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

describe('FileStore Security — traversal patterns (CVE-2021-3199 class)', () => {
  // The Oct 8 KEV batch added CVE-2021-3199 (ONLYOFFICE image-upload
  // path traversal) — the pattern, not the component: an uploader-
  // controlled name reaching a filesystem path unsanitized. eDrive's
  // multer storage is safe by construction (UUID filenames), but
  // FileStore keys reach filePath() from route params across the
  // server, so the store's own defense is pinned here pattern by
  // pattern, beyond the two cases above.
  const dir = path.join(os.tmpdir(), `eoffice-trav-${Date.now()}`);
  const store = new FileStore<{ name: string }>(dir);

  it('should contain URL-encoded traversal keys', () => {
    const key = '%2e%2e%2f%2e%2e%2fetc%2fpasswd';
    store.set(key, { name: 'encoded' });
    expect(store.has(key)).toBe(true);
    expect(store.get(key)).toEqual({ name: 'encoded' });
    // Nothing was written outside the store directory.
    for (const f of fs.readdirSync(dir)) {
      expect(path.resolve(dir, f).startsWith(path.resolve(dir))).toBe(true);
      expect(f).not.toContain('%');
    }
  });

  it('should contain absolute-path keys', () => {
    const key = '/tmp/evil-absolute';
    store.set(key, { name: 'abs' });
    expect(store.has(key)).toBe(true);
    expect(fs.existsSync('/tmp/evil-absolute.json')).toBe(false);
  });

  it('should reject keys that sanitize to empty', () => {
    // Only keys whose every character is consumed by sanitizeKey's
    // '..' removal reduce to empty: '..', '' and '....' (two '..'
    // pairs). Those are rejected by filePath() and write nothing.
    // (Nightly 38674881733 caught the earlier version of this test
    // lumping '...' and '///' in here: they sanitize to '_' and
    // '___', not empty — see the containment case below.)
    const before = fs.readdirSync(dir).length;
    for (const key of ['..', '', '....']) {
      expect(store.has(key)).toBe(false);
      expect(store.get(key)).toBeUndefined();
      expect(store.delete(key)).toBe(false);
      store.set(key, { name: 'never written' });
    }
    expect(fs.readdirSync(dir).length).toBe(before);
  });

  it('should contain dot/slash-only keys as inert separator-free names', () => {
    // '...' -> '_' and '///' -> '___' under sanitizeKey: not empty,
    // so not rejected — but the names they write are separator-free,
    // contained in the store directory, and round-trip through the
    // same sanitized mapping. Containment, not rejection, is the
    // security property for this class.
    for (const key of ['...', '///']) {
      store.set(key, { name: 'contained' });
      expect(store.has(key)).toBe(true);
      expect(store.get(key)).toEqual({ name: 'contained' });
    }
    for (const f of fs.readdirSync(dir)) {
      expect(f).toMatch(/^[A-Za-z0-9_-]+\.json$/);
      expect(path.resolve(dir, f).startsWith(path.resolve(dir))).toBe(true);
    }
  });

  it('should keep every written filename separator-free', () => {
    const hostile = ['../../a', '..\\\\b', 'a/b/c', 'a\\\\b', '....//x', 'x/../../y'];
    for (const key of hostile) store.set(key, { name: key });
    for (const f of fs.readdirSync(dir)) {
      expect(f).toMatch(/^[A-Za-z0-9_-]+\.json$/);
    }
  });

  it('should document that sanitized keys collide (callers use UUID ids)', () => {
    // 'a/b' and 'a\\b' both sanitize to 'a_b': the mapping is lossy
    // by design, which is why routes key the store by UUID, never by
    // user-supplied names. Pinning the behaviour so a future
    // "smarter" sanitizer changes it deliberately, not silently.
    store.set('a/b', { name: 'first' });
    store.set('a\\b', { name: 'second' });
    expect(store.get('a/b')).toEqual({ name: 'second' });
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
    const body = Object.create(null);
    Object.defineProperty(body, '__proto__', { value: 'evil', enumerable: true, writable: true, configurable: true });
    Object.defineProperty(body, 'constructor', { value: 'bad', enumerable: true, writable: true, configurable: true });
    body.normal = 'ok';
    const req = { body, query: {}, params: {} };
    const res = {};
    const next = () => {};
    sanitizeBody(req as any, res as any, next);
    expect(req.body.normal).toBe('ok');
  });
});
