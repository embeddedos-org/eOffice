import { useState } from 'react';

export interface FolderInfo {
  name: string;
  path: string;
  icon: string;
  unreadCount: number;
  specialUse?: string;
  children?: FolderInfo[];
}

interface FolderTreeProps {
  folders: FolderInfo[];
  currentFolder: string;
  onFolderSelect: (path: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (path: string, newName: string) => void;
  onDeleteFolder: (path: string) => void;
}

const DEFAULT_FOLDERS: FolderInfo[] = [
  { name: 'Inbox', path: 'inbox', icon: '📥', unreadCount: 0, specialUse: '\\Inbox' },
  { name: 'Sent', path: 'sent', icon: '📤', unreadCount: 0, specialUse: '\\Sent' },
  { name: 'Drafts', path: 'drafts', icon: '📝', unreadCount: 0, specialUse: '\\Drafts' },
  { name: 'Spam', path: 'spam', icon: '⚠️', unreadCount: 0, specialUse: '\\Junk' },
  { name: 'Trash', path: 'trash', icon: '🗑️', unreadCount: 0, specialUse: '\\Trash' },
  { name: 'Archive', path: 'archive', icon: '📦', unreadCount: 0, specialUse: '\\Archive' },
];

export default function FolderTree({
  folders,
  currentFolder,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folder: FolderInfo } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const displayFolders = folders.length > 0 ? folders : DEFAULT_FOLDERS;

  const handleContextMenu = (e: React.MouseEvent, folder: FolderInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folder });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const handleRename = (path: string) => {
    if (renameValue.trim()) {
      onRenameFolder(path, renameValue.trim());
      setRenamingFolder(null);
      setRenameValue('');
    }
  };

  const specialFolders = displayFolders.filter((f) =>
    ['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive'].includes(f.path)
  );
  const customFolders = displayFolders.filter(
    (f) => !['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive'].includes(f.path)
  );

  return (
    <div className="folder-tree" onClick={() => setContextMenu(null)}>
      <div className="folder-tree-header">
        <span className="folder-tree-title">📬 Folders</span>
        <button
          className="folder-tree-add"
          onClick={() => setShowNewFolder(true)}
          title="New folder"
        >
          +
        </button>
      </div>

      <div className="folder-tree-list">
        {specialFolders.map((folder) => (
          <div
            key={folder.path}
            className={`folder-tree-item ${currentFolder === folder.path ? 'active' : ''}`}
            onClick={() => onFolderSelect(folder.path)}
            onContextMenu={(e) => handleContextMenu(e, folder)}
          >
            <span className="folder-tree-icon">{folder.icon}</span>
            <span className="folder-tree-name">{folder.name}</span>
            {folder.unreadCount > 0 && (
              <span className="folder-tree-badge">{folder.unreadCount}</span>
            )}
          </div>
        ))}

        {customFolders.length > 0 && (
          <>
            <div className="folder-tree-divider" />
            <div className="folder-tree-section-label">Custom Folders</div>
            {customFolders.map((folder) => (
              <div
                key={folder.path}
                className={`folder-tree-item ${currentFolder === folder.path ? 'active' : ''}`}
                onClick={() => onFolderSelect(folder.path)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
              >
                <span className="folder-tree-icon">📁</span>
                {renamingFolder === folder.path ? (
                  <input
                    className="folder-tree-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(folder.path);
                      if (e.key === 'Escape') setRenamingFolder(null);
                    }}
                    onBlur={() => handleRename(folder.path)}
                    autoFocus
                  />
                ) : (
                  <span className="folder-tree-name">{folder.name}</span>
                )}
                {folder.unreadCount > 0 && (
                  <span className="folder-tree-badge">{folder.unreadCount}</span>
                )}
              </div>
            ))}
          </>
        )}

        {showNewFolder && (
          <div className="folder-tree-new">
            <span className="folder-tree-icon">📁</span>
            <input
              className="folder-tree-rename-input"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolder(false);
              }}
              onBlur={handleCreateFolder}
              placeholder="Folder name..."
              autoFocus
            />
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="folder-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              setRenamingFolder(contextMenu.folder.path);
              setRenameValue(contextMenu.folder.name);
              setContextMenu(null);
            }}
          >
            ✏️ Rename
          </button>
          <button
            onClick={() => {
              onDeleteFolder(contextMenu.folder.path);
              setContextMenu(null);
            }}
          >
            🗑️ Delete
          </button>
          <button
            onClick={() => {
              setShowNewFolder(true);
              setContextMenu(null);
            }}
          >
            📁 New Folder
          </button>
        </div>
      )}
    </div>
  );
}
