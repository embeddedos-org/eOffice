import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DataStore, FileStore } from './store';

const DB_PATH = process.env.EOFFICE_DB_PATH || path.join(os.homedir(), '.eoffice', 'eoffice.db');

let _db: Database.Database | null = null;

function getDB(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export function closeDB(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export class SQLiteStore<T extends { id?: string }> implements DataStore<T> {
  private tableName: string;
  private initialized = false;

  constructor(private resourcePath: string) {
    // Derive table name from resource path (e.g., ~/.eoffice/data/documents -> documents)
    this.tableName = path.basename(resourcePath).replace(/[^a-zA-Z0-9_]/g, '_');
    this.ensureTable();
    this.migrateFromFileStore();
  }

  private ensureTable(): void {
    if (this.initialized) return;
    const db = getDB();
    db.exec(`
      CREATE TABLE IF NOT EXISTS "${this.tableName}" (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        owner_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
    // Create FTS5 virtual table for full-text search
    try {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS "${this.tableName}_fts" USING fts5(
          id,
          content,
          content="${this.tableName}",
          content_rowid=rowid,
          tokenize='porter unicode61'
        )
      `);
    } catch {
      // FTS5 may not be available in all builds
    }
    this.initialized = true;
  }

  private migrateFromFileStore(): void {
    // Auto-migrate existing JSON files into SQLite on first run
    if (!fs.existsSync(this.resourcePath)) return;
    const db = getDB();
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${this.tableName}"`).get() as { cnt: number };
    if (count.cnt > 0) return; // Already has data

    const files = fs.readdirSync(this.resourcePath).filter(f => f.endsWith('.json'));
    if (files.length === 0) return;

    console.log(`Migrating ${files.length} records from ${this.resourcePath} to SQLite...`);
    const insert = db.prepare(`
      INSERT OR IGNORE INTO "${this.tableName}" (id, data, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const migrate = db.transaction(() => {
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.resourcePath, file), 'utf-8');
          const obj = JSON.parse(raw);
          const id = obj.id || path.basename(file, '.json');
          const ownerId = obj.ownerId || obj.owner_id || null;
          const createdAt = obj.created_at ? new Date(obj.created_at).getTime() : Date.now();
          const updatedAt = obj.updated_at ? new Date(obj.updated_at).getTime() : Date.now();
          insert.run(id, raw, ownerId, createdAt, updatedAt);
        } catch (err) {
          console.warn(`Failed to migrate ${file}:`, err);
        }
      }
    });
    migrate();
    console.log(`Migration complete for ${this.tableName}`);
  }

  get(key: string): T | undefined {
    const db = getDB();
    const row = db.prepare(`SELECT data FROM "${this.tableName}" WHERE id = ?`).get(key) as { data: string } | undefined;
    if (!row) return undefined;
    try {
      return JSON.parse(row.data);
    } catch {
      return undefined;
    }
  }

  set(key: string, value: T): void {
    const db = getDB();
    const data = JSON.stringify(value);
    const ownerId = (value as any).ownerId || (value as any).owner_id || null;
    db.prepare(`
      INSERT INTO "${this.tableName}" (id, data, owner_id, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, owner_id = excluded.owner_id, updated_at = excluded.updated_at
    `).run(key, data, ownerId, Date.now());
  }

  delete(key: string): boolean {
    const db = getDB();
    const result = db.prepare(`DELETE FROM "${this.tableName}" WHERE id = ?`).run(key);
    return result.changes > 0;
  }

  list(): T[] {
    const db = getDB();
    const rows = db.prepare(`SELECT data FROM "${this.tableName}" ORDER BY updated_at DESC`).all() as { data: string }[];
    return rows.map(row => {
      try { return JSON.parse(row.data); } catch { return null; }
    }).filter((item): item is T => item !== null);
  }

  has(key: string): boolean {
    const db = getDB();
    const row = db.prepare(`SELECT 1 FROM "${this.tableName}" WHERE id = ? LIMIT 1`).get(key);
    return !!row;
  }

  // Extended: list by owner
  listByOwner(ownerId: string): T[] {
    const db = getDB();
    const rows = db.prepare(`SELECT data FROM "${this.tableName}" WHERE owner_id = ? ORDER BY updated_at DESC`).all(ownerId) as { data: string }[];
    return rows.map(row => {
      try { return JSON.parse(row.data); } catch { return null; }
    }).filter((item): item is T => item !== null);
  }

  // Extended: full-text search
  search(query: string, limit: number = 20): T[] {
    const db = getDB();
    try {
      const rows = db.prepare(`
        SELECT t.data FROM "${this.tableName}" t
        WHERE t.data LIKE ? COLLATE NOCASE
        ORDER BY t.updated_at DESC
        LIMIT ?
      `).all(`%${query}%`, limit) as { data: string }[];
      return rows.map(row => {
        try { return JSON.parse(row.data); } catch { return null; }
      }).filter((item): item is T => item !== null);
    } catch {
      return [];
    }
  }

  // Get total count
  count(): number {
    const db = getDB();
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM "${this.tableName}"`).get() as { cnt: number };
    return row.cnt;
  }
}

// Factory function to create the appropriate store based on environment
export function createStore<T extends { id?: string }>(resourcePath: string): DataStore<T> {
  const backend = process.env.STORAGE_BACKEND || 'sqlite';
  if (backend === 'file') {
    return new FileStore<T>(resourcePath);
  }
  return new SQLiteStore<T>(resourcePath);
}
