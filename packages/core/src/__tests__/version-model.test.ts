import { describe, it, expect } from 'vitest';
import { VersionHistory } from '../version-model';

describe('VersionHistory', () => {
  it('should create a version history', () => {
    const vh = new VersionHistory();
    expect(vh).toBeDefined();
  });

  it('should save a version', () => {
    const vh = new VersionHistory();
    vh.save('doc-1', { title: 'V1', content: 'Initial' }, 'Initial version');
    const versions = vh.getVersions('doc-1');
    expect(versions.length).toBe(1);
    expect(versions[0].message).toBe('Initial version');
  });

  it('should retrieve a specific version', () => {
    const vh = new VersionHistory();
    vh.save('doc-1', { title: 'V1', content: 'First' }, 'First');
    vh.save('doc-1', { title: 'V2', content: 'Second' }, 'Second');
    const versions = vh.getVersions('doc-1');
    expect(versions.length).toBe(2);
    const v1 = vh.getVersion('doc-1', versions[0].id);
    expect(v1?.data.content).toBe('First');
  });

  it('should track version numbers', () => {
    const vh = new VersionHistory();
    vh.save('doc-1', { content: 'A' }, 'v1');
    vh.save('doc-1', { content: 'B' }, 'v2');
    const versions = vh.getVersions('doc-1');
    expect(versions[0].number).toBe(1);
    expect(versions[1].number).toBe(2);
  });
});
