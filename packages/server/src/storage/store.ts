import fs from 'fs';
import path from 'path';

export interface DataStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): boolean;
  list(): T[];
  has(key: string): boolean;
}

export class MemoryStore<T> implements DataStore<T> {
  private data = new Map<string, T>();

  get(key: string): T | undefined {
    return this.data.get(key);
  }
  set(key: string, value: T): void {
    this.data.set(key, value);
  }
  delete(key: string): boolean {
    return this.data.delete(key);
  }
  list(): T[] {
    return Array.from(this.data.values());
  }
  has(key: string): boolean {
    return this.data.has(key);
  }
}

function sanitizeKey(key: string): string {
  return key
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '_');
}

export class FileStore<T> implements DataStore<T> {
  constructor(private directory: string) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  private filePath(key: string): string {
    const safeKey = sanitizeKey(key);
    if (!safeKey) throw new Error('Invalid key');
    const fp = path.join(this.directory, `${safeKey}.json`);
    const resolved = path.resolve(fp);
    if (!resolved.startsWith(path.resolve(this.directory))) {
      throw new Error('Path traversal detected');
    }
    return resolved;
  }

  get(key: string): T | undefined {
    try {
      const fp = this.filePath(key);
      if (!fs.existsSync(fp)) return undefined;
      return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    } catch {
      return undefined;
    }
  }

  set(key: string, value: T): void {
    try {
      fs.writeFileSync(this.filePath(key), JSON.stringify(value, null, 2));
    } catch (err) {
      console.error(`FileStore write error for key "${key}":`, err instanceof Error ? err.message : err);
    }
  }

  delete(key: string): boolean {
    try {
      const fp = this.filePath(key);
      if (!fs.existsSync(fp)) return false;
      fs.unlinkSync(fp);
      return true;
    } catch {
      return false;
    }
  }

  list(): T[] {
    try {
      if (!fs.existsSync(this.directory)) return [];
      return fs
        .readdirSync(this.directory)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(this.directory, f), 'utf-8'));
          } catch {
            return null;
          }
        })
        .filter((item): item is T => item !== null);
    } catch {
      return [];
    }
  }

  has(key: string): boolean {
    try {
      return fs.existsSync(this.filePath(key));
    } catch {
      return false;
    }
  }
}

// Re-export createStore for convenient access
export { createStore } from './sqlite-store';
