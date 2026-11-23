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
});
