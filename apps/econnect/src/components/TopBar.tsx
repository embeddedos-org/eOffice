interface TopBarProps {
  onNewChannel: () => void;
  onStartCall: () => void;
  ebotOpen: boolean;
  onToggleEBot: () => void;
  connected: boolean;
  inCall: boolean;
}

export default function TopBar({ onNewChannel, onStartCall, ebotOpen, onToggleEBot, connected, inCall }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">💬</span>
        <span className="topbar-title">eConnect</span>
      </div>
      <div className="topbar-right">
        <button className="topbar-action-btn" onClick={onNewChannel}>➕ New Channel</button>
        <button className={`topbar-action-btn ${inCall ? 'active' : ''}`} onClick={onStartCall}>
          📹 {inCall ? 'In Call' : 'Start Call'}
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
