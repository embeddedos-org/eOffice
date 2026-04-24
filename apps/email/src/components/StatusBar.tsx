interface StatusBarProps {
  messageCount: number;
  unreadCount: number;
  connected: boolean;
  currentFolder?: string;
  serverOnline?: boolean;
  accountEmail?: string;
}

export default function StatusBar({
  messageCount,
  unreadCount,
  connected,
  currentFolder = 'inbox',
  serverOnline = false,
  accountEmail,
}: StatusBarProps) {
  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className="statusbar-item">
          📬 {messageCount} message{messageCount !== 1 ? 's' : ''}
          {currentFolder === 'inbox' && unreadCount > 0 && ` (${unreadCount} unread)`}
        </span>
        <span className="statusbar-item">📁 {currentFolder}</span>
        {accountEmail && (
          <span className="statusbar-item">👤 {accountEmail}</span>
        )}
      </div>
      <div className="statusbar-right">
        {serverOnline && (
          <span className="statusbar-item">
            <span className="statusbar-connection connected">
              <span className="statusbar-dot" /> Server
            </span>
          </span>
        )}
        <span className="statusbar-item">
          <span className={`statusbar-connection ${connected ? 'connected' : 'disconnected'}`}>
            <span className="statusbar-dot" />
            eBot {connected ? 'Online' : 'Offline'}
          </span>
        </span>
      </div>
    </div>
  );
}
