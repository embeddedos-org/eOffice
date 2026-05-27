import { Router, Request, Response } from 'express';
import { AuthRequest, authorizeRole } from '../middleware/auth';
import { createBackup, listBackups, restoreBackup } from '../services/backup';

export const backupRouter = Router();

// GET /api/admin/backups — List backups (admin only)
backupRouter.get('/', authorizeRole('admin'), (_req: Request, res: Response) => {
  const backups = listBackups();
  res.json({ backups, count: backups.length });
});

// POST /api/admin/backups — Create backup now (admin only)
backupRouter.post('/', authorizeRole('admin'), (_req: Request, res: Response) => {
  const result = createBackup();
  if (result) {
    res.json({ status: 'ok', path: result });
  } else {
    res.status(500).json({ error: 'Backup failed' });
  }
});

// POST /api/admin/backups/restore — Restore from backup (admin only)
backupRouter.post('/restore', authorizeRole('admin'), (req: Request, res: Response) => {
  const { backupName } = req.body;
  if (!backupName) {
    res.status(400).json({ error: 'backupName is required' });
    return;
  }
  const backupDir = process.env.EOFFICE_BACKUP_DIR || require('path').join(require('os').homedir(), '.eoffice', 'backups');
  const backupPath = require('path').join(backupDir, backupName);
  const ok = restoreBackup(backupPath);
  if (ok) {
    res.json({ status: 'restored', from: backupName, message: 'Restart the server to use the restored database.' });
  } else {
    res.status(500).json({ error: 'Restore failed' });
  }
});
