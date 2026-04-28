interface StatusBarProps {
  noteCount: number;
  wordCount: number;
  lastSaved?: string;
  connected: boolean;
}

export default function StatusBar({ noteCount, wordCount, lastSaved, connected }: StatusBarProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 24, padding: '0 12px',
      background: '#f5f5f5', borderTop: '1px solid #e0e0e0', fontSize: 11, color: '#888', gap: 16,
    }}>
      <span>{noteCount} notes</span>
      <span>{wordCount} words</span>
      {lastSaved && <span>Saved {lastSaved}</span>}
      <div style={{ flex: 1 }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#4caf50' : '#f44336' }} />
        {connected ? 'Connected' : 'Offline'}
      </span>
    </div>
  );
}
