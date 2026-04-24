import { describe, it, expect } from 'vitest';
import { DriveModel } from '../drive-model';

describe('DriveModel', () => {
  it('should create a drive model', () => {
    const model = new DriveModel();
    expect(model).toBeDefined();
  });

  it('should add a file', () => {
    const model = new DriveModel();
    const file = model.addFile('test.txt', 'file', null, 'Hello');
    expect(file.name).toBe('test.txt');
    expect(file.type).toBe('file');
  });

  it('should create a folder', () => {
    const model = new DriveModel();
    const folder = model.addFile('docs', 'folder', null);
    expect(folder.type).toBe('folder');
  });

  it('should list files', () => {
    const model = new DriveModel();
    model.addFile('file1.txt', 'file', null);
    model.addFile('file2.txt', 'file', null);
    const files = model.getFiles();
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it('should delete a file', () => {
    const model = new DriveModel();
    const file = model.addFile('temp.txt', 'file', null);
    model.deleteFile(file.id);
    expect(model.getFile(file.id)).toBeUndefined();
  });
});
