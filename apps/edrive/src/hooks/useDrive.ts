import { useState, useCallback, useEffect } from 'react';
import { apiClient, apiUpload, API_URL, getToken } from '../../../shared/config';

export interface DriveFile {
  id: string;
  name: string;
  type: 'folder' | 'document' | 'image' | 'spreadsheet' | 'archive' | 'other';
  mimeType?: string;
  size: number;
  modified: string;
  parentId: string | null;
  shareLink?: string;
  deleted?: boolean;
  filePath?: string;
  versions?: { id: string; size: number; created_at: string }[];
}

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  done: boolean;
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function mapServerFile(f: any): DriveFile {
  const ext = f.name?.split('.').pop()?.toLowerCase() ?? '';
  const typeMap: Record<string, DriveFile['type']> = {
    pdf: 'document', doc: 'document', docx: 'document', txt: 'document', md: 'document',
    png: 'image', jpg: 'image', gif: 'image', jpeg: 'image', webp: 'image', svg: 'image',
    xlsx: 'spreadsheet', xls: 'spreadsheet', csv: 'spreadsheet',
    zip: 'archive', tar: 'archive', gz: 'archive', rar: 'archive',
  };
  return {
    id: f.id,
    name: f.name,
    type: f.type === 'folder' ? 'folder' : (typeMap[ext] || 'other'),
    mimeType: f.mimeType,
    size: f.size || 0,
    modified: f.updated_at ? new Date(f.updated_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    parentId: f.parentId ?? null,
    shareLink: f.shareLink,
    deleted: f.deleted,
    filePath: f.filePath,
    versions: f.versions,
  };
}

export function useDrive() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentPath, setCurrentPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Drive' }]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [storageStats, setStorageStats] = useState<{ used: number; quota: number; percentage: number }>({ used: 0, quota: 5 * 1024 * 1024 * 1024, percentage: 0 });

  const currentFolderId = currentPath[currentPath.length - 1].id;
  const children = files.filter((f) => f.parentId === currentFolderId && !f.deleted);
  const selectedFile = files.find((f) => f.id === selectedFileId) ?? null;
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  // Load files from server on mount
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ files: any[] }>('/api/drive');
      setFiles(data.files.map(mapServerFile));
    } catch (err) {
      console.warn('Failed to load files from server, using local state');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load storage stats
  const loadStats = useCallback(async () => {
    try {
      const stats = await apiClient<{ used: number; quota: number; percentage: number }>('/api/drive/stats');
      setStorageStats(stats);
    } catch {}
  }, []);

  useEffect(() => {
    loadFiles();
    loadStats();
  }, [loadFiles, loadStats]);

  const navigateTo = useCallback((folderId: string | null, folderName: string) => {
    setCurrentPath((prev) => [...prev, { id: folderId, name: folderName }]);
    setSelectedFileId(null);
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    setCurrentPath((prev) => prev.slice(0, index + 1));
    setSelectedFileId(null);
  }, []);

  const createFolder = useCallback(async (name: string) => {
    try {
      const folder = await apiClient<any>('/api/drive', {
        method: 'POST',
        body: JSON.stringify({ name, type: 'folder', parentId: currentFolderId }),
      });
      const mapped = mapServerFile(folder);
      setFiles((prev) => [...prev, mapped]);
      return mapped.id;
    } catch {
      // Fallback to local
      const id = `local-${Date.now()}`;
      setFiles((prev) => [...prev, {
        id, name, type: 'folder', size: 0,
        modified: new Date().toISOString().slice(0, 10),
        parentId: currentFolderId,
      }]);
      return id;
    }
  }, [currentFolderId]);

  const addFile = useCallback(async (name: string, type: DriveFile['type'], size = 0) => {
    try {
      const file = await apiClient<any>('/api/drive', {
        method: 'POST',
        body: JSON.stringify({ name, type: 'file', parentId: currentFolderId, content: '' }),
      });
      const mapped = mapServerFile(file);
      setFiles((prev) => [...prev, mapped]);
      return mapped.id;
    } catch {
      const id = `local-${Date.now()}`;
      setFiles((prev) => [...prev, {
        id, name, type, size,
        modified: new Date().toISOString().slice(0, 10),
        parentId: currentFolderId,
      }]);
      return id;
    }
  }, [currentFolderId]);

  const removeFile = useCallback(async (id: string) => {
    try {
      await apiClient(`/api/drive/${id}`, { method: 'DELETE' });
    } catch {}
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, deleted: true } : f));
    setSelectedFileId((prev) => (prev === id ? null : prev));
  }, []);

  const permanentDelete = useCallback(async (id: string) => {
    try {
      await apiClient(`/api/drive/${id}/permanent`, { method: 'DELETE' });
    } catch {}
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const restoreFile = useCallback(async (id: string) => {
    try {
      const file = await apiClient<any>(`/api/drive/${id}/restore`, { method: 'POST' });
      setFiles((prev) => prev.map((f) => f.id === id ? { ...mapServerFile(file), deleted: false } : f));
    } catch {}
  }, []);

  const moveFile = useCallback(async (fileId: string, targetFolderId: string | null) => {
    try {
      await apiClient(`/api/drive/${fileId}`, {
        method: 'PUT',
        body: JSON.stringify({ parentId: targetFolderId }),
      });
    } catch {}
    setFiles((prev) => prev.map((f) =>
      f.id === fileId ? { ...f, parentId: targetFolderId } : f
    ));
  }, []);

  const renameFile = useCallback(async (id: string, newName: string) => {
    try {
      await apiClient(`/api/drive/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      });
    } catch {}
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName } : f)));
  }, []);

  const generateShareLink = useCallback((id: string) => {
    const link = `${API_URL}/api/drive/download/${id}`;
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, shareLink: link } : f)));
    return link;
  }, []);

  // Real file upload using FormData
  const uploadFile = useCallback(async (file: File) => {
    const uploadId = `upload-${Date.now()}`;
    setUploads((prev) => [...prev, { id: uploadId, name: file.name, progress: 0, done: false }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('parentId', currentFolderId);
      }

      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 15 + Math.random() * 20, 90);
        setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, progress } : u));
      }, 200);

      const result = await apiUpload<any>('/api/drive/upload', formData);
      clearInterval(progressInterval);

      setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, progress: 100, done: true } : u));
      const mapped = mapServerFile(result);
      setFiles((prev) => [...prev, mapped]);

      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
      }, 2000);

      loadStats();
    } catch (err) {
      // Fallback to local simulation
      setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, progress: 100, done: true } : u));
      addFile(file.name, 'other', file.size);
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
      }, 2000);
    }
  }, [currentFolderId, addFile, loadStats]);

  // Legacy compat — redirect to uploadFile
  const simulateUpload = useCallback((name: string, size: number) => {
    const fakeFile = new File([''], name, { type: 'application/octet-stream' });
    Object.defineProperty(fakeFile, 'size', { value: size });
    uploadFile(fakeFile);
  }, [uploadFile]);

  // Download file
  const downloadFile = useCallback((id: string) => {
    const token = getToken();
    const url = `${API_URL}/api/drive/download/${id}`;
    const a = document.createElement('a');
    a.href = `${url}?token=${token}`;
    a.download = '';
    a.click();
  }, []);

  // Search files
  const searchFiles = useCallback(async (query: string): Promise<DriveFile[]> => {
    try {
      const data = await apiClient<{ files: any[] }>(`/api/drive/search?q=${encodeURIComponent(query)}`);
      return data.files.map(mapServerFile);
    } catch {
      return files.filter(f => f.name.toLowerCase().includes(query.toLowerCase()) && !f.deleted);
    }
  }, [files]);

  // Get trash files
  const getTrash = useCallback((): DriveFile[] => {
    return files.filter(f => f.deleted);
  }, [files]);

  return {
    files, children, currentPath, currentFolderId, selectedFile, selectedFileId, totalSize,
    uploads, viewMode, loading, storageStats,
    setViewMode, setSelectedFileId,
    navigateTo, navigateToBreadcrumb,
    addFile, createFolder, removeFile, moveFile, renameFile,
    generateShareLink, simulateUpload, uploadFile, downloadFile,
    searchFiles, getTrash, permanentDelete, restoreFile,
    formatSize, loadFiles,
  };
}
