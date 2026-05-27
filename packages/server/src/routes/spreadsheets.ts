import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import { validateStringLength, MAX_TITLE_LENGTH } from '../middleware/validate';
import { FileStore } from '../storage/store';

interface CellData {
  value: string;
  formula?: string;
  computedValue?: string | number;
}

interface Sheet {
  id: string;
  name: string;
  cells: Record<string, CellData>;
}

interface StoredSpreadsheet {
  id: string;
  title: string;
  sheets: Sheet[];
  activeSheetId: string;
  created_at: Date;
  updated_at: Date;
  ownerId: string;
}

const store = new FileStore<StoredSpreadsheet>(path.join(os.homedir(), '.eoffice', 'data', 'spreadsheets'));
export const spreadsheetsRouter = Router();

spreadsheetsRouter.get('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const spreadsheets = store.list().filter((s) => s.ownerId === userId);
  res.json({ spreadsheets, total: spreadsheets.length });
});

spreadsheetsRouter.post('/', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { title } = req.body;
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleErr) { res.status(400).json({ error: titleErr }); return; }

  const defaultSheetId = crypto.randomUUID();
  const spreadsheet: StoredSpreadsheet = {
    id: crypto.randomUUID(),
    title,
    sheets: [{ id: defaultSheetId, name: 'Sheet1', cells: {} }],
    activeSheetId: defaultSheetId,
    created_at: new Date(),
    updated_at: new Date(),
    ownerId: userId,
  };

  store.set(spreadsheet.id, spreadsheet);
  res.status(201).json(spreadsheet);
});

spreadsheetsRouter.get('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const spreadsheet = store.get(req.params.id);
  if (!spreadsheet || spreadsheet.ownerId !== userId) {
    res.status(404).json({ error: 'Spreadsheet not found' });
    return;
  }
  res.json(spreadsheet);
});

spreadsheetsRouter.put('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const spreadsheet = store.get(req.params.id);
  if (!spreadsheet || spreadsheet.ownerId !== userId) {
    res.status(404).json({ error: 'Spreadsheet not found' });
    return;
  }

  const { title } = req.body;
  if (typeof title === 'string') {
    const titleErr = validateStringLength(title, 'title', MAX_TITLE_LENGTH);
    if (titleErr) { res.status(400).json({ error: titleErr }); return; }
  spreadsheet.title = title;
  }
  spreadsheet.updated_at = new Date();
  store.set(spreadsheet.id, spreadsheet);
  res.json(spreadsheet);
});

spreadsheetsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const spreadsheet = store.get(req.params.id);
  if (!spreadsheet || spreadsheet.ownerId !== userId) {
    res.status(404).json({ error: 'Spreadsheet not found' });
    return;
  }
  store.delete(req.params.id);
  res.status(204).send();
});

spreadsheetsRouter.put('/:id/cells', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const spreadsheet = store.get(req.params.id);
  if (!spreadsheet || spreadsheet.ownerId !== userId) {
    res.status(404).json({ error: 'Spreadsheet not found' });
    return;
  }

  const { sheetId, cells } = req.body;
  if (!sheetId || !Array.isArray(cells)) {
    res.status(400).json({ error: 'sheetId and cells array are required' });
    return;
  }

  const sheet = spreadsheet.sheets.find((s) => s.id === sheetId);
  if (!sheet) {
    res.status(404).json({ error: 'Sheet not found' });
    return;
  }

  for (const cell of cells) {
    if (typeof cell.row !== 'number' || typeof cell.col !== 'number') continue;
    const key = `${cell.row}:${cell.col}`;
    sheet.cells[key] = {
      value: typeof cell.value === 'string' ? cell.value : String(cell.value ?? ''),
      formula: typeof cell.formula === 'string' ? cell.formula : undefined,
      computedValue: cell.computedValue,
    };
  }

  spreadsheet.updated_at = new Date();
  store.set(spreadsheet.id, spreadsheet);
  res.json(spreadsheet);
});

spreadsheetsRouter.post('/:id/sheets', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const spreadsheet = store.get(req.params.id);
  if (!spreadsheet || spreadsheet.ownerId !== userId) {
    res.status(404).json({ error: 'Spreadsheet not found' });
    return;
  }

  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const newSheet: Sheet = {
    id: crypto.randomUUID(),
    name,
    cells: {},
  };

  spreadsheet.sheets.push(newSheet);
  spreadsheet.updated_at = new Date();
  store.set(spreadsheet.id, spreadsheet);
  res.status(201).json(newSheet);
});

spreadsheetsRouter.delete('/:id/sheets/:sheetId', (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const spreadsheet = store.get(req.params.id);
  if (!spreadsheet || spreadsheet.ownerId !== userId) {
    res.status(404).json({ error: 'Spreadsheet not found' });
    return;
  }

  const sheetIndex = spreadsheet.sheets.findIndex((s) => s.id === req.params.sheetId);
  if (sheetIndex === -1) {
    res.status(404).json({ error: 'Sheet not found' });
    return;
  }

  if (spreadsheet.sheets.length <= 1) {
    res.status(400).json({ error: 'Cannot delete the last sheet' });
    return;
  }

  spreadsheet.sheets.splice(sheetIndex, 1);
  if (spreadsheet.activeSheetId === req.params.sheetId) {
    spreadsheet.activeSheetId = spreadsheet.sheets[0].id;
  }
  spreadsheet.updated_at = new Date();
  store.set(spreadsheet.id, spreadsheet);
  res.status(204).send();
});
