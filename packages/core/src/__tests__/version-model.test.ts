import { describe, it, expect } from 'vitest';
import { VersionHistory } from '../version-model';

describe('VersionHistory', () => {
  it('should create a version history', () => {
    const vh = new VersionHistory();
    expect(vh).toBeDefined();
  });

  it('should save a version', () => {
    const vh = new VersionHistory();
    vh.saveVersion('document', 'doc-1', JSON.stringify({ title: 'V1', content: 'Initial' }), 'Initial version');
    const versions = vh.getVersions('document', 'doc-1');
    expect(versions.length).toBe(1);
    expect(versions[0].description).toBe('Initial version');
  });

  it('should retrieve a specific version', () => {
    const vh = new VersionHistory();
    vh.saveVersion('document', 'doc-1', JSON.stringify({ title: 'V1', content: 'First' }), 'First');
    vh.saveVersion('document', 'doc-1', JSON.stringify({ title: 'V2', content: 'Second' }), 'Second');
    const versions = vh.getVersions('document', 'doc-1');
    expect(versions.length).toBe(2);
    const v1 = vh.getVersion(versions[0].id);
    expect(v1).toBeDefined();
    const data = JSON.parse(v1!.snapshot);
    expect(data.content).toBe('First');
  });

  it('should track version numbers', () => {
    const vh = new VersionHistory();
    vh.saveVersion('document', 'doc-1', JSON.stringify({ content: 'A' }), 'v1');
    vh.saveVersion('document', 'doc-1', JSON.stringify({ content: 'B' }), 'v2');
    const versions = vh.getVersions('document', 'doc-1');
    expect(versions.length).toBe(2);
    expect(versions[0].description).toBe('v1');
    expect(versions[1].description).toBe('v2');
  });
});
