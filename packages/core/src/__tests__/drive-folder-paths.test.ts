import { describe, it, expect } from 'vitest';
import { DriveModel } from '../drive-model';

function tree() {
  const model = new DriveModel();
  const docs = model.addFile('docs', 'folder');
  const notes = model.addFile('notes.txt', 'file', 'hi', docs.id);
  const sub = model.addFile('2026', 'folder', undefined, docs.id);
  const report = model.addFile('report.txt', 'file', 'x', sub.id);
  const archive = model.addFile('archive', 'folder');
  return { model, docs, notes, sub, report, archive };
}

describe('DriveModel folder paths', () => {
  it('renaming a folder updates the paths of everything inside it', () => {
    const { model, docs, notes, sub, report } = tree();
    expect(model.renameFile(docs.id, 'papers')).toBe(true);
    expect(model.getFile(docs.id)!.path).toBe('/papers');
    expect(model.getFile(notes.id)!.path).toBe('/papers/notes.txt');
    expect(model.getFile(sub.id)!.path).toBe('/papers/2026');
    expect(model.getFile(report.id)!.path).toBe('/papers/2026/report.txt');
  });

  it('moving a folder updates the paths of everything inside it', () => {
    const { model, docs, notes, report, archive } = tree();
    expect(model.moveFile(docs.id, archive.id)).toBe(true);
    expect(model.getFile(docs.id)!.path).toBe('/archive/docs');
    expect(model.getFile(notes.id)!.path).toBe('/archive/docs/notes.txt');
    expect(model.getFile(report.id)!.path).toBe('/archive/docs/2026/report.txt');
  });

  it('paths match those of files added after the rename', () => {
    const { model, docs, notes } = tree();
    model.renameFile(docs.id, 'papers');
    const added = model.addFile('new.txt', 'file', '', docs.id);
    const dir = (p: string) => p.slice(0, p.lastIndexOf('/'));
    expect(dir(model.getFile(notes.id)!.path)).toBe(dir(added.path));
  });

  it('refuses to move a folder into itself or into its own subfolder', () => {
    const { model, docs, sub, report } = tree();
    expect(model.moveFile(docs.id, docs.id)).toBe(false);
    expect(model.moveFile(docs.id, sub.id)).toBe(false);
    expect(model.getFile(docs.id)!.parentId).toBeUndefined();
    expect(model.getFile(docs.id)!.path).toBe('/docs');
    expect(model.getChildren(undefined).map((f) => f.id)).toContain(docs.id);
    expect(model.getFile(report.id)!.path).toBe('/docs/2026/report.txt');
  });

  it('moving and renaming a plain file still works', () => {
    const { model, notes, archive } = tree();
    expect(model.moveFile(notes.id, archive.id)).toBe(true);
    expect(model.getFile(notes.id)!.path).toBe('/archive/notes.txt');
    expect(model.renameFile(notes.id, 'todo.txt')).toBe(true);
    expect(model.getFile(notes.id)!.path).toBe('/archive/todo.txt');
  });

  it('touches updated_at on every descendant whose path changed', () => {
    const { model, docs, notes, sub, report, archive } = tree();
    const before = new Date(0);
    for (const id of [notes.id, sub.id, report.id]) {
      model.getFile(id)!.updated_at = before;
    }
    model.renameFile(docs.id, 'papers');
    for (const id of [notes.id, sub.id, report.id]) {
      expect(model.getFile(id)!.updated_at.getTime()).toBeGreaterThan(before.getTime());
    }
    // A file outside the renamed folder is left alone.
    model.getFile(archive.id)!.updated_at = before;
    model.renameFile(docs.id, 'docs');
    expect(model.getFile(archive.id)!.updated_at.getTime()).toBe(before.getTime());
  });

  it('renames a tree far deeper than the call stack without throwing', () => {
    // Built directly rather than through addFile(), whose getFile() lookup is
    // linear and would make setting up a tree this deep quadratic.
    const depth = 20000;
    const now = new Date();
    const files = [];
    let path = '/root';
    files.push({
      id: 'root', name: 'root', type: 'folder', size: 0,
      parentId: undefined, path, created_at: now, updated_at: now,
    });
    for (let i = 0; i < depth; i += 1) {
      path = `${path}/d${i}`;
      files.push({
        id: `d${i}`, name: `d${i}`, type: 'folder', size: 0,
        parentId: i === 0 ? 'root' : `d${i - 1}`, path, created_at: now, updated_at: now,
      });
    }
    const model = new DriveModel(files);

    expect(() => model.renameFile('root', 'base')).not.toThrow();
    expect(model.getFile('root')!.path).toBe('/base');
    expect(model.getFile('d0')!.path).toBe('/base/d0');
    // The deepest node moved too, so the walk did not stop part-way down.
    expect(model.getFile(`d${depth - 1}`)!.path.startsWith('/base/d0/d1/')).toBe(true);
    expect(model.getFile(`d${depth - 1}`)!.path.endsWith(`/d${depth - 1}`)).toBe(true);
    expect(model.files.every((f) => f.path.startsWith('/base'))).toBe(true);
  });

  it('rebuilds stale descendant paths saved by an older version', () => {
    const { model, docs, notes, sub, report } = tree();
    // A model saved before descendant paths were maintained: the folder was
    // renamed, so its own path is current but everything under it is stale.
    const saved = JSON.parse(JSON.stringify(model.toJSON())) as {
      files: { id: string; name: string; path: string }[];
    };
    const find = (id: string) => saved.files.find((f) => f.id === id)!;
    find(docs.id).name = 'papers';
    find(docs.id).path = '/papers';

    const loaded = DriveModel.fromJSON(saved as never);
    expect(loaded.getFile(docs.id)!.path).toBe('/papers');
    expect(loaded.getFile(notes.id)!.path).toBe('/papers/notes.txt');
    expect(loaded.getFile(sub.id)!.path).toBe('/papers/2026');
    expect(loaded.getFile(report.id)!.path).toBe('/papers/2026/report.txt');
  });

  it('leaves an already-consistent saved model unchanged', () => {
    const { model } = tree();
    const saved = JSON.parse(JSON.stringify(model.toJSON()));
    const loaded = DriveModel.fromJSON(saved);
    for (const original of model.files) {
      expect(loaded.getFile(original.id)!.path).toBe(original.path);
    }
  });
});
