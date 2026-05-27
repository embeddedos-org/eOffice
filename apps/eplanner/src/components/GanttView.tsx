import type { Task } from '../hooks/usePlanner';

interface GanttViewProps {
  tasks: Task[];
  onSelectTask: (id: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

const ASSIGNEE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function getAssigneeColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ASSIGNEE_COLORS[Math.abs(hash) % ASSIGNEE_COLORS.length];
}

export default function GanttView({ tasks, onSelectTask }: GanttViewProps) {
  const tasksWithDates = tasks.filter((t) => t.dueDate);
  if (tasksWithDates.length === 0) {
    return (
      <div className="gantt-view">
        <div className="gantt-empty">
          <div style={{ fontSize: 48, opacity: 0.4 }}>📊</div>
          <div>Add due dates to tasks to see the Gantt chart</div>
        </div>
      </div>
    );
  }

  // Calculate date range
  const dates = tasksWithDates.map((t) => new Date(t.dueDate).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  // Ensure at least 14-day range
  const rangeStart = new Date(minDate);
  rangeStart.setDate(rangeStart.getDate() - 3);
  const rangeEnd = new Date(maxDate);
  rangeEnd.setDate(rangeEnd.getDate() + 3);
  const totalDays = Math.max(Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)), 14);

  // Generate day labels
  const dayLabels: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    dayLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }

  const getBarPosition = (dueDate: string) => {
    const due = new Date(dueDate).getTime();
    const start = rangeStart.getTime();
    const dayWidth = 100 / totalDays;
    const dayIndex = Math.floor((due - start) / (1000 * 60 * 60 * 24));
    // Bar spans 3 days before due date to due date
    const barStart = Math.max(0, dayIndex - 3);
    const barEnd = dayIndex + 1;
    return {
      left: `${barStart * dayWidth}%`,
      width: `${(barEnd - barStart) * dayWidth}%`,
    };
  };

  return (
    <div className="gantt-view">
      <div className="gantt-container">
        {/* Header */}
        <div className="gantt-header">
          <div className="gantt-label-col">Task</div>
          <div className="gantt-timeline-col">
            <div className="gantt-day-labels">
              {dayLabels.map((label, i) => (
                <div key={i} className="gantt-day-label" style={{ width: `${100 / totalDays}%` }}>
                  {i % 2 === 0 ? label : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rows */}
        {tasksWithDates.map((task) => {
          const pos = getBarPosition(task.dueDate);
          return (
            <div key={task.id} className="gantt-row" onClick={() => onSelectTask(task.id)}>
              <div className="gantt-label-col">
                <div className="gantt-task-label">
                  {task.assignee && (
                    <span
                      className="gantt-assignee-dot"
                      style={{ background: getAssigneeColor(task.assignee) }}
                    >
                      {task.assignee[0]}
                    </span>
                  )}
                  <span className="gantt-task-name">{task.title}</span>
                </div>
              </div>
              <div className="gantt-timeline-col">
                <div className="gantt-bar-track">
                  <div
                    className="gantt-bar"
                    style={{
                      left: pos.left,
                      width: pos.width,
                      background: PRIORITY_COLORS[task.priority],
                    }}
                  >
                    <span className="gantt-bar-label">{task.title}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
