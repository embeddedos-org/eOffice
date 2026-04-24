import { useState } from 'react';

interface TopBarProps {
  onPresent: () => void;
  onAddSlide: () => void;
  onTemplates: () => void;
  onPublish: () => string;
  ebotOpen: boolean;
  onToggleEBot: () => void;
  connected: boolean;
}

export default function TopBar({ onPresent, onAddSlide, onTemplates, onPublish, ebotOpen, onToggleEBot, connected }: TopBarProps) {
  const [copied, setCopied] = useState(false);

  const handlePublish = () => {
    const link = onPublish();
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">🎯</span>
        <span className="topbar-title">eSway</span>
      </div>
      <div className="topbar-right">
        <button className="topbar-action-btn" onClick={onAddSlide}>➕ Add Slide</button>
        <button className="topbar-action-btn" onClick={onTemplates}>📚 Templates</button>
        <button className="topbar-action-btn" onClick={onPresent}>▶ Present</button>
        <button className="topbar-action-btn" onClick={handlePublish}>
          {copied ? '✅ Copied!' : '🔗 Publish'}
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
