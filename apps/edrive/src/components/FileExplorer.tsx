import type { DragEvent } from 'react';
import type { DriveFile } from '../hooks/useDrive';
import { formatSize } from '../hooks/useDrive';

const FILE_ICONS: Record<DriveFile['type'], string> = {
  folder: '📂', document: '📄', image: '🖼️', spreadsheet: '📊', archive: '📦', other: '📎',
};

interface FileExplorerProps {
  children: DriveFile[];
  currentPath: { id: string | null; name: string }[];
  selectedFileId: string | null;
  viewMode: 'grid' | 'list';
  onSelect: (id: string) => void;
  onOpen: (file: DriveFile) => void;
  onNavigateBreadcrumb: (index: number) => void;
  onMoveFile: (fileId: string, targetFolderId: string | null) => void;
}

export default function FileExplorer({
  children, currentPath, selectedFileId, viewMode,
  onSelect, onOpen, onNavigateBreadcrumb, onMoveFile,
}: FileExplorerProps) {
  const handleDragStart = (e: DragEvent, fileId: string) => {
    e.dataTransfer.setData('text/plain', fileId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: DragEvent, targetFile: DriveFile) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetFile.type !== 'folder') return;
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== targetFile.id) {
      onMoveFile(draggedId, targetFile.id);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="edrive-main">
      <div className="breadcrumb">
        {currentPath.map((p, i) => (
          <span key={i}>
            {i > 0 && <span className="breadcrumb-sep">/</span>}
            <span
              className={`breadcrumb-item ${i === currentPath.length - 1 ? 'current' : ''}`}
              onClick={() => i < currentPath.length - 1 && onNavigateBreadcrumb(i)}
            >
              {p.name}
            </span>
          </span>
        ))}
      </div>
      {children.length === 0 ? (
        <div className={viewMode === 'list' ? 'file-list-view' : 'file-grid'}>
          <div className="file-empty">
            <div className="file-empty-icon">📂</div>
            <div>This folder is empty</div>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="file-list-view">
          <div className="file-list-header">
            <span className="file-list-col name">Name</span>
            <span className="file-list-col type">Type</span>
            <span className="file-list-col size">Size</span>
            <span className="file-list-col modified">Modified</span>
          </div>
          {children.map((file) => (
            <div
              key={file.id}
              className={`file-list-row ${file.id === selectedFileId ? 'selected' : ''}`}
              onClick={() => onSelect(file.id)}
              onDoubleClick={() => file.type === 'folder' && onOpen(file)}
              draggable
              onDragStart={(e) => handleDragStart(e, file.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, file)}
            >
              <span className="file-list-col name">
                <span className="file-list-icon">{FILE_ICONS[file.type]}</span>
                {file.name}
              </span>
              <span className="file-list-col type">{file.type}</span>
              <span className="file-list-col size">{formatSize(file.size)}</span>
              <span className="file-list-col modified">{file.modified}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="file-grid">
          {children.map((file) => (
            <div
              key={file.id}
              className={`file-card ${file.id === selectedFileId ? 'selected' : ''}`}
              onClick={() => onSelect(file.id)}
              onDoubleClick={() => file.type === 'folder' && onOpen(file)}
              draggable
              onDragStart={(e) => handleDragStart(e, file.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, file)}
            >
              <div className="file-card-icon">{FILE_ICONS[file.type]}</div>
              <div className="file-card-name">{file.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
