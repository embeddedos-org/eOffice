import type { DragEvent } from 'react';
import type { Task, TaskStatus, KanbanColumn } from '../hooks/usePlanner';
import TaskCard from './TaskCard';

interface BoardViewProps {
  tasks: Task[];
  columns: KanbanColumn[];
  filterByStatus: (status: TaskStatus) => Task[];
  onSelectTask: (id: string) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  onAddColumn: () => void;
  onRemoveColumn: (id: string) => void;
}

export default function BoardView({ columns, filterByStatus, onSelectTask, onMoveTask, onAddColumn, onRemoveColumn }: BoardViewProps) {
  const handleDragOver = (e: DragEvent) => e.preventDefault();

  const handleDrop = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onMoveTask(taskId, status);
  };

  return (
    <div className="board">
      {columns.map(({ id, label, emoji }) => {
        const columnTasks = filterByStatus(label);
        return (
          <div
            key={id}
            className="board-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, label)}
          >
            <div className="board-column-header">
              <span>{emoji} {label}</span>
              <div className="board-column-header-right">
                <span className="board-column-count">{columnTasks.length}</span>
                {columns.length > 1 && (
                  <button
                    className="board-column-remove"
                    onClick={() => onRemoveColumn(id)}
                    title="Remove column"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="board-column-body">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task.id)} />
              ))}
            </div>
          </div>
        );
      })}
      <div className="board-add-column" onClick={onAddColumn}>
        <span>＋</span>
        <span>Add Column</span>
      </div>
    </div>
  );
}
