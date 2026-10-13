import { describe, expect, it } from 'vitest';

import { LWWMap } from '../../apps/shared/sync/lww-map';

// The vitest include glob covers tests/unit/** but not apps/**, so this
// suite lives here and imports the sync prototype from apps/shared/sync.

function replica(nodeId: string): LWWMap {
  return new LWWMap(nodeId);
}

describe('LWWMap', () => {
  it('stores and returns values', () => {
    const m = replica('a');
    m.set('title', 'hello', 1);
    expect(m.get('title')).toBe('hello');
    expect(m.has('title')).toBe(true);
    expect(m.size).toBe(1);
  });

  it('last writer wins on conflicting writes to the same key', () => {
    const a = replica('a');
    const b = replica('b');
    a.set('title', 'from-a', 10);
    b.set('title', 'from-b', 20);

    a.merge(b);
    expect(a.get('title')).toBe('from-b');
  });

  it('breaks timestamp ties deterministically by nodeId', () => {
    const a = replica('a');
    const b = replica('b');
    a.set('k', 'from-a', 5);
    b.set('k', 'from-b', 5);

    const ab = replica('x').merge(a).merge(b);
    const ba = replica('x').merge(b).merge(a);
    expect(ab.get('k')).toBe('from-b');
    expect(ba.get('k')).toBe('from-b');
  });

  it('converges: merge(a, b) equals merge(b, a)', () => {
    const a = replica('a');
    const b = replica('b');
    a.set('shared', 'a-old', 1);
    a.set('only-a', 1, 3);
    b.set('shared', 'b-new', 2);
    b.set('only-b', 2, 4);

    const ab = replica('x').merge(a.toJSON()).merge(b.toJSON());
    const ba = replica('x').merge(b.toJSON()).merge(a.toJSON());
    expect(ab.toJSON()).toEqual(ba.toJSON());
  });

  it('is idempotent: merging the same state twice changes nothing', () => {
    const a = replica('a');
    a.set('k', 'v', 7);
    const once = replica('x').merge(a.toJSON());
    const twice = replica('x').merge(a.toJSON()).merge(a.toJSON());
    expect(twice.toJSON()).toEqual(once.toJSON());
  });

  it('keeps concurrent disjoint writes from both replicas', () => {
    const a = replica('a');
    const b = replica('b');
    a.set('a-key', 'A', 10);
    b.set('b-key', 'B', 10);

    a.merge(b);
    expect(a.get('a-key')).toBe('A');
    expect(a.get('b-key')).toBe('B');
    expect(a.size).toBe(2);
  });

  it('does not let a stale write overwrite a newer one', () => {
    const m = replica('a');
    m.set('k', 'new', 100);
    m.set('k', 'old', 1);
    expect(m.get('k')).toBe('new');
  });

  it('round-trips through JSON', () => {
    const m = replica('a');
    m.set('title', 'doc', 42);
    m.set('count', 3, 43);

    const restored = LWWMap.fromJSON(JSON.parse(JSON.stringify(m.toJSON())));
    expect(restored.toJSON()).toEqual(m.toJSON());
    expect(restored.get('title')).toBe('doc');
  });
});
