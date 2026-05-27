interface TopBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  previewMode: boolean;
  onTogglePreview: () => void;
  showResponses: boolean;
  onToggleResponses: () => void;
  responseCount: number;
  ebotSidebarOpen: boolean;
  onToggleEBot: () => void;
  connected: boolean;
}

export default function TopBar({
  title,
  onTitleChange,
  previewMode,
  onTogglePreview,
  showResponses,
  onToggleResponses,
  responseCount,
  ebotSidebarOpen,
  onToggleEBot,
  connected,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">📝</span>
        <span className="topbar-title">eForms</span>
      </div>
      <div className="topbar-center">
        <input
          className="topbar-doc-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled Form"
        />
      </div>
      <div className="topbar-right">
        <div className="topbar-actions">
          <button
            className={`topbar-action-btn ${previewMode ? 'active' : ''}`}
            onClick={onTogglePreview}
          >
            {previewMode ? '✏️ Edit' : '👁 Preview'}
          </button>
          <button
            className={`topbar-action-btn ${showResponses ? 'active' : ''}`}
            onClick={onToggleResponses}
          >
            📊 Responses ({responseCount})
          </button>
        </div>
        <div className={`topbar-status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="topbar-status-dot" />
          <span>eBot {connected ? 'Online' : 'Offline'}</span>
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
