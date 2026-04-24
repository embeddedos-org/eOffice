import { describe, it, expect } from 'vitest';

// Import the functions we're testing
// Since these are module-level, we test the exported logic
const crypto = await import('crypto');

describe('Auth Security', () => {
  describe('HMAC-SHA256 JWT', () => {
    it('should create a valid token with header.body.signature format', async () => {
      const { createToken, verifyToken } = await import('../middleware/auth');
      const token = createToken({ id: 'test-user', username: 'test', role: 'user' });
      expect(token.split('.').length).toBe(3);
    });

    it('should verify a valid token', async () => {
      const { createToken, verifyToken } = await import('../middleware/auth');
      const token = createToken({ id: 'test-user', username: 'test', role: 'user' });
      const payload = verifyToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.username).toBe('test');
    });

    it('should reject a tampered token', async () => {
      const { createToken, verifyToken } = await import('../middleware/auth');
      const token = createToken({ id: 'test-user', username: 'test', role: 'user' });
      const parts = token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ id: 'hacker', username: 'hacked', role: 'admin' })).toString('base64url');
      const tamperedToken = parts.join('.');
      const payload = verifyToken(tamperedToken);
      expect(payload).toBeNull();
    });

    it('should reject an expired token', async () => {
      const { verifyToken } = await import('../middleware/auth');
      // Create a token that expired 1 hour ago
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify({
        id: 'test',
        username: 'test',
        role: 'user',
        iat: Date.now() - 7200000,
        exp: Date.now() - 3600000,
      })).toString('base64url');
      const fakeToken = `${header}.${body}.fakesig`;
      const payload = verifyToken(fakeToken);
      expect(payload).toBeNull();
    });

    it('should reject malformed tokens', async () => {
      const { verifyToken } = await import('../middleware/auth');
      expect(verifyToken('')).toBeNull();
      expect(verifyToken('not-a-token')).toBeNull();
      expect(verifyToken('a.b')).toBeNull();
      expect(verifyToken('a.b.c.d')).toBeNull();
    });
  });

  describe('Password hashing', () => {
    it('should hash and verify a password', async () => {
      const { hashPassword, verifyPassword } = await import('../middleware/auth');
      const { hash, salt } = await hashPassword('SecurePass123');
      expect(hash.length).toBeGreaterThan(0);
      expect(salt.length).toBeGreaterThan(0);
      const isValid = await verifyPassword('SecurePass123', hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const { hashPassword, verifyPassword } = await import('../middleware/auth');
      const { hash, salt } = await hashPassword('CorrectPassword1');
      const isValid = await verifyPassword('WrongPassword1', hash, salt);
      expect(isValid).toBe(false);
    });

    it('should generate unique salts', async () => {
      const { hashPassword } = await import('../middleware/auth');
      const result1 = await hashPassword('SamePassword1');
      const result2 = await hashPassword('SamePassword1');
      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.hash).not.toBe(result2.hash);
    });
  });

  describe('Password validation', () => {
    it('should reject passwords shorter than 8 characters', async () => {
      const { validatePasswordStrength } = await import('../middleware/auth');
      expect(validatePasswordStrength('Short1')).not.toBeNull();
    });

    it('should reject passwords without numbers', async () => {
      const { validatePasswordStrength } = await import('../middleware/auth');
      expect(validatePasswordStrength('NoNumbersHere')).not.toBeNull();
    });

    it('should accept valid passwords', async () => {
      const { validatePasswordStrength } = await import('../middleware/auth');
      expect(validatePasswordStrength('ValidPass1')).toBeNull();
    });
  });

  describe('pickFields', () => {
    it('should only pick allowed fields', async () => {
      const { pickFields } = await import('../middleware/auth');
      const result = pickFields(
        { title: 'Hello', content: 'World', __proto__: 'bad', constructor: 'evil' },
        ['title', 'content'],
      );
      expect(result).toEqual({ title: 'Hello', content: 'World' });
      expect((result as Record<string, unknown>).__proto__).toBeUndefined();
      expect((result as Record<string, unknown>).constructor).toBeUndefined();
    });

    it('should handle missing fields', async () => {
      const { pickFields } = await import('../middleware/auth');
      const result = pickFields({ title: 'Hello' }, ['title', 'content']);
      expect(result).toEqual({ title: 'Hello' });
    });
  });
});
