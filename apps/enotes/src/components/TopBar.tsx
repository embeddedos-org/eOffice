interface TopBarProps {
  notebookName: string;
  onNewNote: () => void;
  onToggleEBot: () => void;
  ebotConnected: boolean;
}

export default function TopBar({ notebookName, onNewNote, onToggleEBot, ebotConnected }: TopBarProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 48, padding: '0 16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff', gap: 12,
    }}>
      <span style={{ fontSize: 20 }}>📒</span>
      <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, flex: 1 }}>eNotes</h1>
      <span style={{ fontSize: 13, opacity: 0.8 }}>{notebookName}</span>
      <button onClick={onNewNote} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
        + New Note
      </button>
      <button onClick={onToggleEBot} style={{ padding: '6px 12px', background: ebotConnected ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.3)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
        🤖 eBot
      </button>
    </div>
  );
}
