import { useState, useEffect } from 'react';
import type { Task, TaskPriority, KanbanColumn } from '../hooks/usePlanner';

interface TaskDetailProps {
  task: Task;
  columns: KanbanColumn[];
  teamMembers: string[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function TaskDetail({ task, columns, teamMembers, onUpdate, onRemove, onClose }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [tagsInput, setTagsInput] = useState(task.tags.join(', '));
  const [assignee, setAssignee] = useState(task.assignee || '');

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setTagsInput(task.tags.join(', '));
    setAssignee(task.assignee || '');
  }, [task]);

  const handleSave = () => {
    onUpdate(task.id, {
      title,
      description,
      status,
      priority,
      dueDate,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      assignee: assignee || undefined,
    });
    onClose();
  };

  return (
    <div className="task-detail-overlay" onClick={onClose}>
      <div className="task-detail" onClick={(e) => e.stopPropagation()}>
        <div className="task-detail-header">
          <h3>Edit Task</h3>
          <button className="task-detail-close" onClick={onClose}>✕</button>
        </div>

        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="task-detail-row">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {columns.map((col) => (
                <option key={col.id} value={col.label}>{col.label}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>

        <div className="task-detail-row">
          <label>
            Due Date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label>
            Assignee
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Tags (comma-separated)
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g., design, frontend" />
        </label>

        <div className="task-detail-actions">
          <button className="task-detail-btn danger" onClick={() => { onRemove(task.id); onClose(); }}>
            Delete
          </button>
          <button className="task-detail-btn" onClick={onClose}>Cancel</button>
          <button className="task-detail-btn primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
