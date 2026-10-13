import type { LWWEntry, LWWMapSnapshot } from './types';

/**
 * LWWMap — a last-writer-wins map CRDT prototype.
 *
 * Each key holds the entry with the greatest (ts, nodeId) pair, compared
 * lexicographically: higher timestamp wins; on a timestamp tie the
 * lexicographically greater nodeId wins, so every replica resolves the
 * same conflict the same way without coordination.
 *
 * Properties (pinned by tests):
 * - Convergence: merge(a, b) and merge(b, a) reach the same state.
 * - Idempotence: merging the same state twice changes nothing.
 * - Concurrent disjoint writes both survive a merge.
 *
 * Scope: this is the prototype from docs/sync-crdt-vs-ot.md — in-memory
 * state plus JSON serialization. Deletion/tombstones, persistence, and
 * transport are deliberately out of scope for this slice.
 */
export class LWWMap {
  private readonly entries = new Map<string, LWWEntry>();

  constructor(private readonly nodeId: string = 'local') {}

  /** Compare two entries: positive if a wins over b. */
  private static compare(a: LWWEntry, b: LWWEntry): number {
    if (a.ts !== b.ts) return a.ts - b.ts;
    if (a.nodeId === b.nodeId) return 0;
    return a.nodeId > b.nodeId ? 1 : -1;
  }

  /** Write a value under this replica's nodeId. Returns the winning entry. */
  set<T>(key: string, value: T, ts: number = Date.now()): LWWEntry<T> {
    const entry: LWWEntry<T> = { value, ts, nodeId: this.nodeId };
    const current = this.entries.get(key);
    if (!current || LWWMap.compare(entry, current) > 0) {
      this.entries.set(key, entry as LWWEntry);
      return entry;
    }
    return current as LWWEntry<T>;
  }

  get<T = unknown>(key: string): T | undefined {
    return this.entries.get(key)?.value as T | undefined;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get size(): number {
    return this.entries.size;
  }

  keys(): string[] {
    return [...this.entries.keys()];
  }

  /**
   * Merge another replica's state into this one, per key keeping the
   * (ts, nodeId) winner. Accepts an LWWMap or its JSON snapshot.
   * Mutates and returns `this` for chaining.
   */
  merge(other: LWWMap | LWWMapSnapshot): this {
    const snapshot = other instanceof LWWMap ? other.toJSON() : other;
    for (const [key, entry] of Object.entries(snapshot)) {
      const current = this.entries.get(key);
      if (!current || LWWMap.compare(entry, current) > 0) {
        this.entries.set(key, { ...entry });
      }
    }
    return this;
  }

  toJSON(): LWWMapSnapshot {
    const out: LWWMapSnapshot = {};
    for (const [key, entry] of this.entries) {
      out[key] = { ...entry };
    }
    return out;
  }

  static fromJSON(snapshot: LWWMapSnapshot, nodeId = 'local'): LWWMap {
    const map = new LWWMap(nodeId);
    map.merge(snapshot);
    return map;
  }
}
