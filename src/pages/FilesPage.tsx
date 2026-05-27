import React from 'react';
import { FolderOpen } from 'lucide-react';
export default function FilesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-surface-400">
      <FolderOpen size={64} className="mb-4 opacity-30" />
      <h2 className="text-xl font-semibold mb-2">File Manager</h2>
      <p className="text-sm">Manage your files and folders here.</p>
    </div>
  );
}
