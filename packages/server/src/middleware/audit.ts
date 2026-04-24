import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuthRequest } from './auth';

const LOG_DIR = path.join(os.homedir(), '.eoffice', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');

try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {
  // Fall back to console-only logging
}

function writeAuditLog(entry: string): void {
  console.log(entry);
  try {
    fs.appendFileSync(LOG_FILE, entry + '\n');
  } catch {
    // Console logging is the fallback
  }
}

export function auditLog(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  (req as AuthRequest & { requestId?: string }).requestId = requestId;

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const user = (req as AuthRequest).user?.username || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = `[AUDIT] ${new Date().toISOString()} requestId=${requestId} ${req.method} ${req.path} user=${user} status=${res.statusCode} duration=${duration}ms ip=${ip}`;
    writeAuditLog(entry);
  });

  next();
}
