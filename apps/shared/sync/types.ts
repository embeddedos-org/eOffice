/**
 * Shared types for the eOffice sync layer.
 *
 * The sync-algorithm decision (docs/sync-crdt-vs-ot.md) chose CRDTs over
 * OT: no central ordering authority, so local-first editing keeps working
 * offline and replicas converge by exchanging state, not operations.
 * This module defines the smallest CRDT building block that decision
 * needs — a last-writer-wins map entry.
 */

/** One versioned value in an LWW map. */
export interface LWWEntry<T = unknown> {
  value: T;
  /** Logical/physical timestamp of the write (higher wins). */
  ts: number;
  /** Id of the node (device/user replica) that made the write. */
  nodeId: string;
}

/** Serialized form of an LWW map: key -> winning entry. */
export type LWWMapSnapshot = Record<string, LWWEntry>;
