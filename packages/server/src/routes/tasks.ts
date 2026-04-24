import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest, pickFields } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH } from '../middleware/validate';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  column: string;
  assignee: string | null;
  priority: string;
  created_at: Date;
}

interface Board {
  id: string;
  title: string;
  columns: string[];
  tasks: TaskItem[];
  created_at: Date;
  updated_at: Date;
  ownerId: string;
}

const boards = new Map<string, Board>();

export const tasksRouter = Router();

tasksRouter.get('/boards', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = Array.from(boards.values()).filter((b) => b.ownerId === userId);
  res.json({ boards: items, total: items.length });
});

tasksRouter.post('/boards', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { title, columns } = req.body;
  if (!title) { res.status(400).json({ error: 'title is required' }); return; }

  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  const now = new Date();
  const board: Board = {
    id: crypto.randomUUID(),
    title,
    columns: Array.isArray(columns) ? columns.filter((c: unknown) => typeof c === 'string') : ['To Do', 'In Progress', 'Done'],
    tasks: [],
    created_at: now,
    updated_at: now,
    ownerId: userId,
  };
  boards.set(board.id, board);
  res.status(201).json(board);
});

tasksRouter.get('/boards/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const board = boards.get(req.params.id);
  if (!board || board.ownerId !== userId) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  res.json(board);
});

tasksRouter.delete('/boards/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const board = boards.get(req.params.id);
  if (!board || board.ownerId !== userId) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  boards.delete(req.params.id);
  res.status(204).send();
});

tasksRouter.post('/boards/:id/tasks', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const board = boards.get(req.params.id);
  if (!board || board.ownerId !== userId) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  const { title, description, column, assignee, priority } = req.body;
  if (!title) { res.status(400).json({ error: 'title is required' }); return; }

  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  const validPriorities = ['high', 'medium', 'low'];
  const task: TaskItem = {
    id: crypto.randomUUID(),
    title,
    description: typeof description === 'string' ? description : '',
    column: typeof column === 'string' ? column : board.columns[0],
    assignee: typeof assignee === 'string' ? assignee : null,
    priority: validPriorities.includes(priority) ? priority : 'medium',
    created_at: new Date(),
  };
  board.tasks.push(task);
  board.updated_at = new Date();
  res.status(201).json(task);
});

tasksRouter.put('/boards/:id/tasks/:taskId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const board = boards.get(req.params.id);
  if (!board || board.ownerId !== userId) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  const idx = board.tasks.findIndex((t) => t.id === req.params.taskId);
  if (idx === -1) { res.status(404).json({ error: 'Task not found' }); return; }

  const allowed = pickFields<TaskItem>(req.body, ['title', 'description', 'column', 'assignee', 'priority']);
  board.tasks[idx] = { ...board.tasks[idx], ...allowed };
  board.updated_at = new Date();
  res.json(board.tasks[idx]);
});

tasksRouter.delete('/boards/:id/tasks/:taskId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const board = boards.get(req.params.id);
  if (!board || board.ownerId !== userId) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  board.tasks = board.tasks.filter((t) => t.id !== req.params.taskId);
  board.updated_at = new Date();
  res.status(204).send();
});
