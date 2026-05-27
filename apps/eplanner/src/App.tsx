import { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import type { PlannerView } from './components/TopBar';
import BoardView from './components/BoardView';
import CalendarView from './components/CalendarView';
import GanttView from './components/GanttView';
import TaskDetail from './components/TaskDetail';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import InputDialog from '../../shared/InputDialog';
import { usePlanner } from './hooks/usePlanner';
import { useEBot } from './hooks/useEBot';
import { LoginScreen } from '../../shared/LoginScreen';

function EplannerApp() {
  const [boardName, setBoardName] = useState('My Project Board');
  const [currentView, setCurrentView] = useState<PlannerView>('board');
  const [ebotOpen, setEbotOpen] = useState(false);
  const [ebotResponse, setEbotResponse] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);

  const planner = usePlanner();
  const { connected, loading, extractTasks, suggestPriority } = useEBot();

  const handleAddTask = useCallback(() => {
    planner.addTask({
      title: 'New Task',
      description: '',
      status: planner.columns[0]?.label ?? 'To Do',
      priority: 'medium',
      dueDate: '',
      tags: [],
    });
  }, [planner]);

  const handleAddColumn = useCallback(() => {
    setShowAddColumn(true);
  }, []);

  const handleCreateColumn = useCallback((name: string) => {
    planner.addColumn(name);
    setShowAddColumn(false);
  }, [planner]);

  const handleEBotAction = useCallback(
    async (action: string, input?: string) => {
      if (!connected) return;
      setEbotResponse('');
      try {
        let response = '';
        switch (action) {
          case 'extract-tasks': {
            if (input) {
              response = await extractTasks(input);
              response = `📝 **Extracted Tasks**\n\n${response}`;
            }
            break;
          }
          case 'prioritize': {
            const todoTasks = planner.tasks
              .filter((t) => t.status !== 'Done')
              .map((t) => t.title)
              .join('\n');
            if (!todoTasks) {
              response = '⚠️ No open tasks to prioritize.';
            } else {
              response = await suggestPriority(todoTasks);
              response = `🎯 **Priority Suggestions**\n\n${response}`;
            }
            break;
          }
          case 'summarize': {
            const { total, todo, inProgress, done } = planner.counts;
            response = `📊 **Board Summary**\n\nTotal: ${total} tasks\n📝 To Do: ${todo}\n🔄 In Progress: ${inProgress}\n✅ Done: ${done}\n\nCompletion: ${total > 0 ? Math.round((done / total) * 100) : 0}%`;
            break;
          }
          default:
            response = `eBot processed "${action}".`;
        }
        setEbotResponse(response);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setEbotResponse(`❌ **eBot Error**\n\n${msg}`);
      }
    },
    [connected, extractTasks, suggestPriority, planner],
  );

  return (
    <div className="eplanner-app">
      <TopBar
        boardName={boardName}
        onBoardNameChange={setBoardName}
        currentView={currentView}
        onViewChange={setCurrentView}
        ebotSidebarOpen={ebotOpen}
        onToggleEBot={() => setEbotOpen((p) => !p)}
        connected={connected}
        onAddTask={handleAddTask}
      />
      <div className="eplanner-body">
        {currentView === 'calendar' ? (
          <CalendarView tasks={planner.tasks} onSelectTask={planner.setSelectedTaskId} />
        ) : currentView === 'gantt' ? (
          <GanttView tasks={planner.tasks} onSelectTask={planner.setSelectedTaskId} />
        ) : (
          <BoardView
            tasks={planner.tasks}
            columns={planner.columns}
            filterByStatus={planner.filterByStatus}
            onSelectTask={planner.setSelectedTaskId}
            onMoveTask={planner.moveTask}
            onAddColumn={handleAddColumn}
            onRemoveColumn={planner.removeColumn}
          />
        )}
        <EBotSidebar
          open={ebotOpen}
          connected={connected}
          response={ebotResponse}
          isLoading={loading}
          onAction={handleEBotAction}
          onClose={() => setEbotOpen(false)}
        />
      </div>
      {planner.selectedTask && (
        <TaskDetail
          task={planner.selectedTask}
          columns={planner.columns}
          teamMembers={planner.teamMembers}
          onUpdate={planner.updateTask}
          onRemove={planner.removeTask}
          onClose={() => planner.setSelectedTaskId(null)}
        />
      )}

      <InputDialog
        open={showAddColumn}
        title="Add Column"
        label="Column Name"
        placeholder="e.g., In Review"
        onConfirm={handleCreateColumn}
        onCancel={() => setShowAddColumn(false)}
      />

      <StatusBar
        total={planner.counts.total}
        todo={planner.counts.todo}
        inProgress={planner.counts.inProgress}
        done={planner.counts.done}
        connected={connected}
      />
    </div>
  );
}


export default function App() {
  return (
    <LoginScreen appName="ePlanner" appIcon="📅">
      <EplannerApp />
    </LoginScreen>
  );
}
