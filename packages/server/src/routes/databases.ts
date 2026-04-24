import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import { validateStringLength, MAX_NAME_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface TableColumn {
  name: string;
  type: string;
}

interface DBTable {
  id: string;
  name: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  created_at: Date;
  updated_at: Date;
  ownerId: string;
}

const tables = new FileStore<DBTable>(path.join(os.homedir(), '.eoffice', 'data', 'databases'));

export const databasesRouter = Router();

databasesRouter.get('/tables', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const items = tables.list().filter((t) => t.ownerId === userId);
  res.json({ tables: items, total: items.length });
});

databasesRouter.post('/tables', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { name, columns } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  const nameErr = validateStringLength(name, 'name', MAX_NAME_LENGTH);
  if (nameErr) { res.status(400).json({ error: nameErr }); return; }

  const now = new Date();
  const table: DBTable = {
    id: crypto.randomUUID(),
    name,
    columns: Array.isArray(columns) ? columns : [],
    rows: [],
    created_at: now,
    updated_at: now,
    ownerId: userId,
  };
  tables.set(table.id, table);
  res.status(201).json(table);
});

databasesRouter.get('/tables/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const table = tables.get(req.params.id);
  if (!table || table.ownerId !== userId) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }
  res.json(table);
});

databasesRouter.delete('/tables/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const table = tables.get(req.params.id);
  if (!table || table.ownerId !== userId) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }
  tables.delete(req.params.id);
  res.status(204).send();
});

databasesRouter.post('/tables/:id/rows', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const table = tables.get(req.params.id);
  if (!table || table.ownerId !== userId) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }
  const row = req.body.row ?? req.body;
  if (!row || typeof row !== 'object') {
    res.status(400).json({ error: 'row data is required' });
    return;
  }
  table.rows.push(row);
  table.updated_at = new Date();
  tables.set(table.id, table);
  res.status(201).json({ index: table.rows.length - 1, row });
});

databasesRouter.put('/tables/:id/rows/:index', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const table = tables.get(req.params.id);
  if (!table || table.ownerId !== userId) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }
  const idx = parseInt(req.params.index, 10);
  if (isNaN(idx) || idx < 0 || idx >= table.rows.length) {
    res.status(404).json({ error: 'Row not found' });
    return;
  }
  const row = req.body.row ?? req.body;
  if (!row || typeof row !== 'object') {
    res.status(400).json({ error: 'row data is required' });
    return;
  }
  table.rows[idx] = row;
  table.updated_at = new Date();
  tables.set(table.id, table);
  res.json({ index: idx, row: table.rows[idx] });
});

databasesRouter.delete('/tables/:id/rows/:index', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const table = tables.get(req.params.id);
  if (!table || table.ownerId !== userId) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }
  const idx = parseInt(req.params.index, 10);
  if (isNaN(idx) || idx < 0 || idx >= table.rows.length) {
    res.status(404).json({ error: 'Row not found' });
    return;
  }
  table.rows.splice(idx, 1);
  table.updated_at = new Date();
  tables.set(table.id, table);
  res.status(204).send();
});
