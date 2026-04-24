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
  onOpenSignatures?: () => void;
  onOpenRules?: () => void;
  onToggleContacts?: () => void;
  onToggleSearch?: () => void;
}

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
  onOpenSignatures,
  onOpenRules,
  onToggleContacts,
  onToggleSearch,
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
        {onToggleSearch && (
          <button className="topbar-action-btn" onClick={onToggleSearch} title="Search">
            🔍 Search
          </button>
        )}
        {onToggleContacts && (
          <button className="topbar-action-btn" onClick={onToggleContacts} title="Contacts">
            👥 Contacts
          </button>
        )}
        {onOpenSignatures && (
          <button className="topbar-action-btn" onClick={onOpenSignatures} title="Signatures">
            ✍️
          </button>
        )}
        {onOpenRules && (
          <button className="topbar-action-btn" onClick={onOpenRules} title="Rules">
            📋
          </button>
        )}
        <button
          className="topbar-action-btn"
          onClick={onOpenAccountSetup}
          title="Account settings"
        >
          ⚙️
        </button>
      </div>
      <div className="topbar-right">
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
