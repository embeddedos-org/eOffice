import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { FileStore } from '../storage/store';

const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) return envSecret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production mode. Set it to a secure random string (min 64 characters).');
  }
  const secret = crypto.randomBytes(64).toString('hex');
  console.warn('WARNING: No JWT_SECRET env var set. Using random secret — tokens will not survive restarts. Set JWT_SECRET for production use.');
  return secret;
})();

const TOKEN_EXPIRY_ACCESS = 60 * 60 * 1000; // 1 hour
const TOKEN_EXPIRY_REFRESH = 7 * 24 * 60 * 60 * 1000; // 7 days

const PASSWORD_MIN_LENGTH = 8;

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: string;
}

const users = new FileStore<UserRecord>(path.join(os.homedir(), '.eoffice', 'data', 'users'));

// --- Password hashing with scrypt (Node.js built-in) ---

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
  return { hash, salt };
}

async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const derived = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least 1 number';
  }
  return null;
}

// --- HMAC-SHA256 JWT ---

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString();
}

function createToken(payload: Record<string, unknown>, expiresInMs: number = TOKEN_EXPIRY_ACCESS): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Date.now();
  const body = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + expiresInMs,
  }));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function createRefreshToken(payload: Record<string, unknown>): string {
  return createToken(payload, TOKEN_EXPIRY_REFRESH);
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(body));

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
  (req as AuthRequest).user = {
    id: payload.id as string,
    username: payload.username as string,
    email: payload.email as string,
    role: payload.role as string,
  };
  next();
}

function authorizeRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

// --- Utility: pick allowed fields from an object ---

function pickFields<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  allowedFields: string[],
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      result[field] = body[field];
    }
  }
  return result as Partial<T>;
}

export {
  users,
  createToken,
  createRefreshToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  authenticateToken,
  authorizeRole,
  pickFields,
};
