import type { DragEvent } from 'react';
import type { Task } from '../hooks/usePlanner';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const ASSIGNEE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function getAssigneeColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ASSIGNEE_COLORS[Math.abs(hash) % ASSIGNEE_COLORS.length];
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  return (
    <div className="task-card" onClick={onClick} draggable onDragStart={handleDragStart}>
      <div className="task-card-top">
        <div className="task-card-title">{task.title}</div>
        {task.assignee && (
          <div
            className="task-card-avatar"
            style={{ background: getAssigneeColor(task.assignee) }}
            title={task.assignee}
          >
            {task.assignee[0]}
          </div>
        )}
      </div>
      <div className="task-card-meta">
        <span className={`task-card-priority ${task.priority}`}>{task.priority}</span>
        {task.dueDate && <span className="task-card-due">📅 {task.dueDate}</span>}
      </div>
      {task.tags.length > 0 && (
        <div className="task-card-tags">
          {task.tags.map((tag) => (
            <span key={tag} className="task-card-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
