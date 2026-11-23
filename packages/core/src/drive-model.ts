import type { DriveFile } from './types';
import { generateId } from './utils';

export class DriveModel {
  public files: DriveFile[];

  constructor(files: DriveFile[] = []) {
    this.files = files;
  }

  addFile(name: string, type: string, content?: string, parentId?: string): DriveFile {
    const now = new Date();
    const path = parentId ? `${this.getFile(parentId)?.path ?? ''}/${name}` : `/${name}`;
    const file: DriveFile = {
      id: generateId(), name, type, size: content?.length ?? 0,
      parentId, path, content, created_at: now, updated_at: now,
    };
    this.files.push(file);
    return file;
  }

  removeFile(id: string): boolean {
    const index = this.files.findIndex((f) => f.id === id);
    if (index === -1) return false;
    this.files.splice(index, 1);
    return true;
  }

  moveFile(id: string, newParentId: string): boolean {
    const file = this.files.find((f) => f.id === id);
    if (!file) return false;
    // A folder cannot move into itself or into one of its own subfolders.
    if (this.isSameOrDescendant(newParentId, id)) return false;
    const parent = this.files.find((f) => f.id === newParentId);
    file.parentId = newParentId;
    file.path = parent ? `${parent.path}/${file.name}` : `/${file.name}`;
    file.updated_at = new Date();
    this.updateChildPaths(file);
    return true;
  }

  renameFile(id: string, newName: string): boolean {
    const file = this.files.find((f) => f.id === id);
    if (!file) return false;
    const dir = file.path.substring(0, file.path.lastIndexOf('/'));
    file.name = newName;
    file.path = `${dir}/${newName}`;
    file.updated_at = new Date();
    this.updateChildPaths(file);
    return true;
  }

  /** Rebuild the paths of everything under a folder after its own path changed. */
  private updateChildPaths(folder: DriveFile, seen: Set<string> = new Set([folder.id])): void {
    for (const child of this.files) {
      if (child.parentId !== folder.id || seen.has(child.id)) continue;
      seen.add(child.id);
      child.path = `${folder.path}/${child.name}`;
      this.updateChildPaths(child, seen);
    }
  }

  /** True when `id` is `ancestorId` itself or lies somewhere under it. */
  private isSameOrDescendant(id: string, ancestorId: string): boolean {
    const seen = new Set<string>();
    let current: string | undefined = id;
    while (current !== undefined && !seen.has(current)) {
      if (current === ancestorId) return true;
      seen.add(current);
      current = this.getFile(current)?.parentId;
    }
    return false;
  }

  getChildren(parentId?: string): DriveFile[] {
    return this.files.filter((f) => f.parentId === parentId);
  }

  getFile(id: string): DriveFile | undefined {
    return this.files.find((f) => f.id === id);
  }

  search(query: string): DriveFile[] {
    const lower = query.toLowerCase();
    return this.files.filter((f) => f.name.toLowerCase().includes(lower));
  }

  getTotalSize(): number {
    return this.files.reduce((sum, f) => sum + f.size, 0);
  }

  toJSON(): object {
    return { files: this.files };
  }

  static fromJSON(json: { files: DriveFile[] }): DriveModel {
    return new DriveModel(
      json.files.map((f) => ({ ...f, created_at: new Date(f.created_at), updated_at: new Date(f.updated_at) })),
    );
  }
}
