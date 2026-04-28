import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const DB_PATH = process.env.EOFFICE_DB_PATH || path.join(os.homedir(), '.eoffice', 'eoffice.db');
const BACKUP_DIR = process.env.EOFFICE_BACKUP_DIR || path.join(os.homedir(), '.eoffice', 'backups');
const MAX_BACKUPS = parseInt(process.env.EOFFICE_MAX_BACKUPS || '7', 10);
const BACKUP_INTERVAL_MS = parseInt(process.env.EOFFICE_BACKUP_INTERVAL_HOURS || '24', 10) * 60 * 60 * 1000;

let backupTimer: ReturnType<typeof setInterval> | null = null;

export function createBackup(): string | null {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.warn('[Backup] Database file not found:', DB_PATH);
      return null;
    }

    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `eoffice-backup-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Use SQLite's .backup command for a consistent snapshot (no corruption risk)
    try {
      execSync(`sqlite3 "${DB_PATH}" ".backup '${backupPath}'"`, { timeout: 30000 });
    } catch {
      // Fallback: simple file copy (less safe during writes but better than nothing)
      fs.copyFileSync(DB_PATH, backupPath);
    }

    console.log(`[Backup] Created: ${backupName} (${Math.round(fs.statSync(backupPath).size / 1024)}KB)`);

    // Prune old backups
    pruneOldBackups();

    return backupPath;
  } catch (err) {
    console.error('[Backup] Failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

function pruneOldBackups(): void {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('eoffice-backup-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime); // newest first

    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      fs.unlinkSync(file.path);
      console.log(`[Backup] Pruned old backup: ${file.name}`);
    }
  } catch (err) {
    console.error('[Backup] Prune error:', err instanceof Error ? err.message : err);
  }
}

export function restoreBackup(backupPath: string): boolean {
  try {
    if (!fs.existsSync(backupPath)) {
      console.error('[Backup] Restore file not found:', backupPath);
      return false;
    }

    // Create a pre-restore backup first
    const preRestorePath = DB_PATH + '.pre-restore';
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, preRestorePath);
    }

    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`[Backup] Restored from: ${path.basename(backupPath)}`);
    return true;
  } catch (err) {
    console.error('[Backup] Restore failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

export function listBackups(): Array<{ name: string; size: number; created: Date }> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('eoffice-backup-') && f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, created: stat.mtime };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  } catch {
    return [];
  }
}

export function startAutoBackup(): void {
  if (backupTimer) return;
  // Initial backup on startup
  createBackup();
  // Then on interval
  backupTimer = setInterval(createBackup, BACKUP_INTERVAL_MS);
  console.log(`[Backup] Auto-backup enabled every ${BACKUP_INTERVAL_MS / 3600000}h, keeping ${MAX_BACKUPS} backups`);
}

export function stopAutoBackup(): void {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
}
