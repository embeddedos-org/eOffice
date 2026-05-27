import { useState } from 'react';
import type { DriveFile } from '../hooks/useDrive';

const FILE_ICONS: Record<DriveFile['type'], string> = {
  folder: '📂', document: '📄', image: '🖼️', spreadsheet: '📊', archive: '📦', other: '📎',
};

interface FilePreviewProps {
  file: DriveFile | null;
  formatSize: (bytes: number) => string;
  onGenerateShareLink: (id: string) => string;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export default function FilePreview({ file, formatSize, onGenerateShareLink, onDelete, onRename }: FilePreviewProps) {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  if (!file) return null;

  const handleShare = () => {
    const link = onGenerateShareLink(file.id);
    setShareLink(link);
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRename = () => {
    if (renaming && newName.trim()) {
      onRename(file.id, newName.trim());
      setRenaming(false);
    } else {
      setNewName(file.name);
      setRenaming(true);
    }
  };

  const renderPreviewContent = () => {
    if (file.type === 'image') {
      return (
        <div className="file-preview-thumbnail">
          <div className="file-preview-img-placeholder">
            🖼️
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{file.name}</span>
          </div>
        </div>
      );
    }
    if (file.type === 'document') {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt' || ext === 'md') {
        return (
          <div className="file-preview-content-box">
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Text preview (simulated)
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8, color: 'var(--text-secondary)' }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt...
            </div>
          </div>
        );
      }
      if (ext === 'pdf') {
        return (
          <div className="file-preview-content-box">
            <div style={{ fontSize: 32, opacity: 0.3 }}>📄</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>PDF Document — {formatSize(file.size)}</div>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="file-preview">
      <div className="file-preview-icon">{FILE_ICONS[file.type]}</div>
      {renaming ? (
        <div className="file-preview-rename">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            autoFocus
          />
        </div>
      ) : (
        <div className="file-preview-name">{file.name}</div>
      )}

      {renderPreviewContent()}

      <div className="file-preview-meta">
        <div className="file-preview-row">
          <span className="file-preview-label">Type</span>
          <span className="file-preview-value">{file.type}</span>
        </div>
        <div className="file-preview-row">
          <span className="file-preview-label">Size</span>
          <span className="file-preview-value">{formatSize(file.size)}</span>
        </div>
        <div className="file-preview-row">
          <span className="file-preview-label">Modified</span>
          <span className="file-preview-value">{file.modified}</span>
        </div>
      </div>

      <div className="file-preview-actions">
        <button className="file-preview-action-btn" onClick={handleShare}>
          🔗 {copied ? 'Copied!' : 'Share'}
        </button>
        <button className="file-preview-action-btn" onClick={handleRename}>
          ✏️ Rename
        </button>
        <button className="file-preview-action-btn" onClick={() => { const a = document.createElement('a'); a.href = '#'; a.download = file.name; a.click(); }}>
          📥 Download
        </button>
        <button className="file-preview-action-btn danger" onClick={() => onDelete(file.id)}>
          🗑️ Delete
        </button>
      </div>

      {shareLink && (
        <div className="file-preview-share-link">
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Share Link</div>
          <div className="file-preview-link-text">{shareLink}</div>
        </div>
      )}
    </div>
  );
}
