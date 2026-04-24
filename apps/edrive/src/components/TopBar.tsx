interface TopBarProps {
  onUpload: () => void;
  onNewFolder: () => void;
  ebotOpen: boolean;
  onToggleEBot: () => void;
  connected: boolean;
  viewMode: 'grid' | 'list';
  onToggleView: () => void;
}

export default function TopBar({ onUpload, onNewFolder, ebotOpen, onToggleEBot, connected, viewMode, onToggleView }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">📁</span>
        <span className="topbar-title">eDrive</span>
      </div>
      <div className="topbar-right">
        <button className="topbar-action-btn" onClick={onUpload}>📤 Upload</button>
        <button className="topbar-action-btn" onClick={onNewFolder}>📂 New Folder</button>
        <button className="topbar-action-btn" onClick={onToggleView}>
          {viewMode === 'grid' ? '☰ List' : '⊞ Grid'}
        </button>
        <div className={`topbar-status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="topbar-status-dot" />
          <span>eBot {connected ? 'Online' : 'Offline'}</span>
        </div>
        <button className={`topbar-ebot-btn ${ebotOpen ? 'active' : ''}`} onClick={onToggleEBot}>
          🤖 eBot
        </button>
      </div>
    </div>
  );
}
