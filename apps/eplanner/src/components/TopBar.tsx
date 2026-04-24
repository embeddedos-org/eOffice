export type PlannerView = 'board' | 'calendar' | 'gantt';

interface TopBarProps {
  boardName: string;
  onBoardNameChange: (name: string) => void;
  currentView: PlannerView;
  onViewChange: (view: PlannerView) => void;
  ebotSidebarOpen: boolean;
  onToggleEBot: () => void;
  connected: boolean;
  onAddTask: () => void;
}

export default function TopBar({
  boardName,
  onBoardNameChange,
  currentView,
  onViewChange,
  ebotSidebarOpen,
  onToggleEBot,
  connected,
  onAddTask,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">📋</span>
        <span className="topbar-title">ePlanner</span>
      </div>
      <div className="topbar-center">
        <input
          className="topbar-doc-title"
          value={boardName}
          onChange={(e) => onBoardNameChange(e.target.value)}
          placeholder="Board Name"
        />
      </div>
      <div className="topbar-right">
        <div className="topbar-view-switcher">
          <button className={`topbar-view-btn ${currentView === 'board' ? 'active' : ''}`} onClick={() => onViewChange('board')}>
            📋 Board
          </button>
          <button className={`topbar-view-btn ${currentView === 'calendar' ? 'active' : ''}`} onClick={() => onViewChange('calendar')}>
            📅 Calendar
          </button>
          <button className={`topbar-view-btn ${currentView === 'gantt' ? 'active' : ''}`} onClick={() => onViewChange('gantt')}>
            📊 Gantt
          </button>
        </div>
        <div className="topbar-actions">
          <button className="topbar-action-btn" onClick={onAddTask}>
            ＋ Add Task
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
