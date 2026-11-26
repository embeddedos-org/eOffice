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

  /** Index the files by `parentId` so a subtree walk does not rescan `files`. */
  private childrenByParent(): Map<string, DriveFile[]> {
    const byParent = new Map<string, DriveFile[]>();
    for (const file of this.files) {
      if (file.parentId === undefined) continue;
      const siblings = byParent.get(file.parentId);
      if (siblings) siblings.push(file);
      else byParent.set(file.parentId, [file]);
    }
    return byParent;
  }

  /**
   * Rebuild the paths of everything under a folder after its own path changed.
   *
   * Iterative, so a deep tree cannot blow the call stack and leave half the
   * descendants on their old paths, and indexed, so the whole subtree costs one
   * pass over `files` rather than one pass per descendant.
   */
  private updateChildPaths(folder: DriveFile): void {
    const byParent = this.childrenByParent();
    const now = new Date();
    const seen = new Set<string>([folder.id]);
    const queue: DriveFile[] = [folder];
    while (queue.length > 0) {
      const parent = queue.pop() as DriveFile;
      for (const child of byParent.get(parent.id) ?? []) {
        // `seen` also stops a parentId cycle in stored data from looping here.
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        child.path = `${parent.path}/${child.name}`;
        child.updated_at = now;
        queue.push(child);
      }
    }
  }

  /**
   * Recompute every path from the tree itself: a root file is `/name`, a child
   * is `<parent path>/<name>`, exactly as `addFile()` builds them.
   *
   * Models saved before descendant paths were maintained can hold stale paths
   * under a folder that was renamed or moved, so `fromJSON()` normalises them
   * on load instead of waiting for the folder to be touched again. A file whose
   * `parentId` no longer resolves is treated as a root file, which is what
   * `addFile()` does with an unknown parent.
   */
  rebuildPaths(): void {
    const byParent = this.childrenByParent();
    // One pass to index the ids, so the root test below is a lookup rather
    // than a scan of `files`: getFile() is a linear find(), and calling it
    // once per file made loading an n-file drive O(n^2).
    const ids = new Set<string>(this.files.map((f) => f.id));
    const seen = new Set<string>();
    const queue: DriveFile[] = [];
    for (const file of this.files) {
      if (file.parentId !== undefined && ids.has(file.parentId)) continue;
      file.path = `/${file.name}`;
      seen.add(file.id);
      queue.push(file);
    }
    while (queue.length > 0) {
      const parent = queue.pop() as DriveFile;
      for (const child of byParent.get(parent.id) ?? []) {
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        child.path = `${parent.path}/${child.name}`;
        queue.push(child);
      }
    }
  }

  /** True when `id` is `ancestorId` itself or lies somewhere under it. */
  private isSameOrDescendant(id: string, ancestorId: string): boolean {
    // Indexed once for the walk: each step used the linear getFile(), so a
    // deep chain cost O(depth * n) before the move was even allowed.
    const byId = new Map<string, DriveFile>(this.files.map((f) => [f.id, f]));
    const seen = new Set<string>();
    let current: string | undefined = id;
    while (current !== undefined && !seen.has(current)) {
      if (current === ancestorId) return true;
      seen.add(current);
      current = byId.get(current)?.parentId;
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
    const model = new DriveModel(
      json.files.map((f) => ({ ...f, created_at: new Date(f.created_at), updated_at: new Date(f.updated_at) })),
    );
    // Saved models can carry paths left stale by a folder rename or move made
    // before descendant paths were maintained. Derive them from the tree.
    model.rebuildPaths();
    return model;
  }
}
