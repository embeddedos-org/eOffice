import { useState, useCallback } from 'react';

export interface DriveFile {
  id: string;
  name: string;
  type: 'folder' | 'document' | 'image' | 'spreadsheet' | 'archive' | 'other';
  size: number;
  modified: string;
  parentId: string | null;
  shareLink?: string;
}

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  done: boolean;
}

let nextId = 1;
const uid = () => `f${nextId++}`;

const SEED: DriveFile[] = [
  { id: uid(), name: 'Documents', type: 'folder', size: 0, modified: '2025-03-15', parentId: null },
  { id: uid(), name: 'Photos', type: 'folder', size: 0, modified: '2025-03-10', parentId: null },
  { id: uid(), name: 'report-q1.pdf', type: 'document', size: 245000, modified: '2025-03-20', parentId: 'f1' },
  { id: uid(), name: 'budget.xlsx', type: 'spreadsheet', size: 128000, modified: '2025-03-18', parentId: 'f1' },
  { id: uid(), name: 'vacation.jpg', type: 'image', size: 3200000, modified: '2025-02-14', parentId: 'f2' },
  { id: uid(), name: 'notes.txt', type: 'document', size: 4200, modified: '2025-03-22', parentId: null },
  { id: uid(), name: 'backup.zip', type: 'archive', size: 52000000, modified: '2025-01-05', parentId: null },
];

export function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function useDrive() {
  const [files, setFiles] = useState<DriveFile[]>(SEED);
  const [currentPath, setCurrentPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Drive' }]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const currentFolderId = currentPath[currentPath.length - 1].id;
  const children = files.filter((f) => f.parentId === currentFolderId);
  const selectedFile = files.find((f) => f.id === selectedFileId) ?? null;
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  const navigateTo = useCallback((folderId: string | null, folderName: string) => {
    setCurrentPath((prev) => [...prev, { id: folderId, name: folderName }]);
    setSelectedFileId(null);
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    setCurrentPath((prev) => prev.slice(0, index + 1));
    setSelectedFileId(null);
  }, []);

  const addFile = useCallback((name: string, type: DriveFile['type'], size = 0) => {
    const id = uid();
    setFiles((prev) => [...prev, { id, name, type, size, modified: new Date().toISOString().slice(0, 10), parentId: currentFolderId }]);
    return id;
  }, [currentFolderId]);

  const createFolder = useCallback((name: string) => {
    const id = uid();
    setFiles((prev) => [...prev, {
      id, name, type: 'folder' as const, size: 0,
      modified: new Date().toISOString().slice(0, 10),
      parentId: currentFolderId,
    }]);
    return id;
  }, [currentFolderId]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedFileId((prev) => (prev === id ? null : prev));
  }, []);

  const moveFile = useCallback((fileId: string, targetFolderId: string | null) => {
    setFiles((prev) => prev.map((f) =>
      f.id === fileId ? { ...f, parentId: targetFolderId } : f
    ));
  }, []);

  const renameFile = useCallback((id: string, newName: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName } : f)));
  }, []);

  const generateShareLink = useCallback((id: string) => {
    const link = `https://edrive.eoffice.dev/share/${id}-${Date.now().toString(36)}`;
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, shareLink: link } : f)));
    return link;
  }, []);

  const simulateUpload = useCallback((name: string, size: number) => {
    const uploadId = `upload-${Date.now()}`;
    setUploads((prev) => [...prev, { id: uploadId, name, progress: 0, done: false }]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: 100, done: true } : u)));
        // Add file after upload completes
        const ext = name.split('.').pop()?.toLowerCase() ?? '';
        const typeMap: Record<string, DriveFile['type']> = {
          pdf: 'document', doc: 'document', txt: 'document', md: 'document',
          png: 'image', jpg: 'image', gif: 'image', jpeg: 'image',
          xlsx: 'spreadsheet', csv: 'spreadsheet',
          zip: 'archive', tar: 'archive',
        };
        addFile(name, typeMap[ext] || 'other', size);
        // Remove from uploads after 2s
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        }, 2000);
      } else {
        setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress } : u)));
      }
    }, 300);
  }, [addFile]);

  return {
    files, children, currentPath, currentFolderId, selectedFile, selectedFileId, totalSize,
    uploads, viewMode, setViewMode,
    setSelectedFileId, navigateTo, navigateToBreadcrumb,
    addFile, createFolder, removeFile, moveFile, renameFile,
    generateShareLink, simulateUpload, formatSize,
  };
}
