import { useState, useCallback } from 'react';

export interface Column { name: string; type: string; }
export interface TableDef { id: string; name: string; columns: Column[]; rows: Record<string, string>[]; }

let nextId = 1;
const uid = () => `t${nextId++}`;

const SEED_TABLES: TableDef[] = [
  {
    id: uid(), name: 'users',
    columns: [{ name: 'id', type: 'INT' }, { name: 'name', type: 'TEXT' }, { name: 'email', type: 'TEXT' }],
    rows: [
      { id: '1', name: 'Alice', email: 'alice@eos.dev' },
      { id: '2', name: 'Bob', email: 'bob@eos.dev' },
      { id: '3', name: 'Carol', email: 'carol@eos.dev' },
    ],
  },
  {
    id: uid(), name: 'projects',
    columns: [{ name: 'id', type: 'INT' }, { name: 'title', type: 'TEXT' }, { name: 'owner_id', type: 'INT' }],
    rows: [
      { id: '1', title: 'eOffice', owner_id: '1' },
      { id: '2', title: 'eDB', owner_id: '2' },
    ],
  },
];

export function useDatabase() {
  const [tables, setTables] = useState<TableDef[]>(SEED_TABLES);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(SEED_TABLES[0]?.id ?? null);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  const createTable = useCallback((name: string) => {
    const id = uid();
    const newTable: TableDef = {
      id, name,
      columns: [{ name: 'id', type: 'INT' }, { name: 'value', type: 'TEXT' }],
      rows: [],
    };
    setTables((prev) => [...prev, newTable]);
    setSelectedTableId(id);
  }, []);

  const dropTable = useCallback((id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
    setSelectedTableId((prev) => (prev === id ? null : prev));
  }, []);

  const insertRow = useCallback((tableId: string, data?: Record<string, string>) => {
    setTables((prev) => prev.map((t) => {
      if (t.id !== tableId) return t;
      const row: Record<string, string> = data ? { ...data } : {};
      if (!data) t.columns.forEach((c) => { row[c.name] = ''; });
      return { ...t, rows: [...t.rows, row] };
    }));
  }, []);

  const importCSV = useCallback((tableId: string, csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    setTables((prev) => prev.map((t) => {
      if (t.id !== tableId) return t;
      // Add any missing columns
      const newCols = [...t.columns];
      headers.forEach((h) => {
        if (!newCols.find((c) => c.name === h)) {
          newCols.push({ name: h, type: 'TEXT' });
        }
      });
      // Parse rows
      const newRows = [...t.rows];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, j) => { row[h] = vals[j] || ''; });
        newRows.push(row);
      }
      return { ...t, columns: newCols, rows: newRows };
    }));
  }, []);

  const updateRow = useCallback((tableId: string, rowIdx: number, col: string, value: string) => {
    setTables((prev) => prev.map((t) => {
      if (t.id !== tableId) return t;
      const rows = t.rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r));
      return { ...t, rows };
    }));
  }, []);

  const deleteRow = useCallback((tableId: string, rowIdx: number) => {
    setTables((prev) => prev.map((t) => {
      if (t.id !== tableId) return t;
      return { ...t, rows: t.rows.filter((_, i) => i !== rowIdx) };
    }));
  }, []);

  const totalRows = tables.reduce((sum, t) => sum + t.rows.length, 0);

  return {
    tables, selectedTableId, selectedTable, totalRows,
    setSelectedTableId, createTable, dropTable,
    insertRow, updateRow, deleteRow, importCSV,
  };
}
