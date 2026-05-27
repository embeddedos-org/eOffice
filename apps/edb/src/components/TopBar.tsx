import { useRef } from 'react';

export type DBView = 'table' | 'erd' | 'form';

interface TopBarProps {
  onNewTable: () => void;
  ebotOpen: boolean;
  onToggleEBot: () => void;
  connected: boolean;
  currentView: DBView;
  onViewChange: (view: DBView) => void;
  onImportCSV: (csv: string) => void;
}

export default function TopBar({ onNewTable, ebotOpen, onToggleEBot, connected, currentView, onViewChange, onImportCSV }: TopBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) onImportCSV(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">🗄️</span>
        <span className="topbar-title">eDB</span>
      </div>
      <div className="topbar-center">
        <div className="topbar-view-switcher">
          <button className={`topbar-view-btn ${currentView === 'table' ? 'active' : ''}`} onClick={() => onViewChange('table')}>
            📊 Table
          </button>
          <button className={`topbar-view-btn ${currentView === 'erd' ? 'active' : ''}`} onClick={() => onViewChange('erd')}>
            🔗 ERD
          </button>
          <button className={`topbar-view-btn ${currentView === 'form' ? 'active' : ''}`} onClick={() => onViewChange('form')}>
            📝 Form
          </button>
        </div>
      </div>
      <div className="topbar-right">
        <button className="topbar-action-btn" onClick={onNewTable}>➕ New Table</button>
        <button className="topbar-action-btn" onClick={() => fileRef.current?.click()}>
          📥 Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVUpload} />
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
