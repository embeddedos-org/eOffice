import { useState, useCallback, useEffect } from 'react';

export type TaskStatus = string;
export type TaskPriority = 'high' | 'medium' | 'low';

export interface KanbanColumn {
  id: string;
  label: string;
  emoji: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  tags: string[];
  assignee?: string;
}

const TEAM_MEMBERS = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];

let nextId = 1;
const uid = () => `task-${nextId++}`;
let colId = 1;
const colUid = () => `col-${colId++}`;

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: colUid(), label: 'To Do', emoji: '📝' },
  { id: colUid(), label: 'In Progress', emoji: '🔄' },
  { id: colUid(), label: 'Done', emoji: '✅' },
];

const SAMPLE_TASKS: Task[] = [
  { id: uid(), title: 'Design landing page', description: 'Create wireframes for the new landing page', status: 'To Do', priority: 'high', dueDate: '2026-04-10', tags: ['design'], assignee: 'Alice' },
  { id: uid(), title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated deployment', status: 'In Progress', priority: 'medium', dueDate: '2026-04-08', tags: ['devops'], assignee: 'Bob' },
  { id: uid(), title: 'Write API documentation', description: 'Document all REST endpoints', status: 'Done', priority: 'low', dueDate: '2026-04-05', tags: ['docs'], assignee: 'Carol' },
  { id: uid(), title: 'Implement auth flow', description: 'OAuth2 login integration', status: 'To Do', priority: 'high', dueDate: '2026-04-15', tags: ['backend'], assignee: 'Dave' },
  { id: uid(), title: 'Code review tool', description: 'Set up review automation', status: 'In Progress', priority: 'medium', dueDate: '2026-04-20', tags: ['devops'], assignee: 'Eve' },
];

const STORAGE_KEY = 'eplanner-data';

function loadFromStorage(): { tasks: Task[]; columns: KanbanColumn[] } | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return null;
}

function saveToStorage(tasks: Task[], columns: KanbanColumn[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, columns }));
  } catch {}
}

export function usePlanner() {
  const saved = loadFromStorage();
  const [tasks, setTasks] = useState<Task[]>(saved?.tasks ?? SAMPLE_TASKS);
  const [columns, setColumns] = useState<KanbanColumn[]>(saved?.columns ?? DEFAULT_COLUMNS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const teamMembers = TEAM_MEMBERS;

  const addTask = useCallback((task: Omit<Task, 'id'>) => {
    const newTask = { ...task, id: uid() };
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTaskId((prev) => (prev === id ? null : prev));
  }, []);

  const moveTask = useCallback((id: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
  }, []);

  const addColumn = useCallback((label: string, emoji = '📌') => {
    setColumns((prev) => [...prev, { id: colUid(), label, emoji }]);
  }, []);

  const removeColumn = useCallback((id: string) => {
    const col = columns.find((c) => c.id === id);
    if (!col) return;
    // Move tasks from deleted column to first column
    const firstCol = columns[0];
    if (firstCol && col.label !== firstCol.label) {
      setTasks((prev) => prev.map((t) => (t.status === col.label ? { ...t, status: firstCol.label } : t)));
    }
    setColumns((prev) => prev.filter((c) => c.id !== id));
  }, [columns]);

  const filterByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks],
  );

  const counts = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'To Do').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    done: tasks.filter((t) => t.status === 'Done').length,
  };

  useEffect(() => {
    saveToStorage(tasks, columns);
  }, [tasks, columns]);

  return {
    tasks,
    columns,
    selectedTask,
    selectedTaskId,
    teamMembers,
    setSelectedTaskId,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    addColumn,
    removeColumn,
    filterByStatus,
    counts,
  };
}
