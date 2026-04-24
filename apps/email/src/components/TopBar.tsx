import type { Folder, EmailAccount } from '../hooks/useMailbox';

interface TopBarProps {
  currentFolder: Folder;
  onFolderChange: (folder: Folder) => void;
  onCompose: () => void;
  ebotSidebarOpen: boolean;
  onToggleEBot: () => void;
  connected: boolean;
  unreadCount: number;
  account: EmailAccount | null;
  serverOnline: boolean;
  onOpenAccountSetup: () => void;
  onRefresh: () => void;
  loading: boolean;
}

const FOLDERS: { id: Folder; label: string; emoji: string }[] = [
  { id: 'inbox', label: 'Inbox', emoji: '📥' },
  { id: 'sent', label: 'Sent', emoji: '📤' },
  { id: 'drafts', label: 'Drafts', emoji: '📝' },
];

export default function TopBar({
  currentFolder,
  onFolderChange,
  onCompose,
  ebotSidebarOpen,
  onToggleEBot,
  connected,
  unreadCount,
  account,
  serverOnline,
  onOpenAccountSetup,
  onRefresh,
  loading,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">✉️</span>
        <span className="topbar-title">eMail</span>
        {account && (
          <span
            style={{
              fontSize: 11,
              opacity: 0.85,
              padding: '2px 8px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 10,
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={account.email}
          >
            {account.email}
          </span>
        )}
      </div>
      <div className="topbar-center">
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            className={`topbar-folder-btn ${currentFolder === f.id ? 'active' : ''}`}
            onClick={() => onFolderChange(f.id)}
          >
            {f.emoji} {f.label}
            {f.id === 'inbox' && unreadCount > 0 && ` (${unreadCount})`}
          </button>
        ))}
      </div>
      <div className="topbar-right">
        <div className="topbar-actions">
          <button className="topbar-action-btn" onClick={onCompose}>
            ✏️ Compose
          </button>
          <button
            className="topbar-action-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh inbox"
          >
            {loading ? '⏳' : '🔄'}
          </button>
          <button
            className="topbar-action-btn"
            onClick={onOpenAccountSetup}
            title="Account settings"
          >
            ⚙️
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {serverOnline && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                opacity: 0.8,
              }}
            >
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: account ? '#81c995' : '#fbbf24',
                boxShadow: account ? '0 0 4px rgba(129,201,149,0.5)' : 'none',
              }} />
              {account ? 'IMAP' : 'Server'}
            </div>
          )}
          <div className={`topbar-status ${connected ? 'connected' : 'disconnected'}`}>
            <span className="topbar-status-dot" />
            <span>eBot {connected ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <button
          className={`topbar-ebot-btn ${ebotSidebarOpen ? 'active' : ''}`}
          onClick={onToggleEBot}
        >
          🤖 eBot
        </button>
      </div>
    </div>
  );
}
