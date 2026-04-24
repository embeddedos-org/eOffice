import { useState, useCallback, useMemo, useRef } from 'react';
import type { Cell, CellFormat } from '@eoffice/core';
import { SpreadsheetModel } from '@eoffice/core';

interface SpreadsheetState {
  model: SpreadsheetModel;
  activeCell: { row: number; col: number } | null;
  selection: { startRow: number; startCol: number; endRow: number; endCol: number } | null;
  editingCell: { row: number; col: number } | null;
  editValue: string;
  revision: number;
  frozenRows: number;
  frozenCols: number;
  mergedCells: MergedCell[];
}

export interface MergedCell {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

function colToLetter(col: number): string {
  let result = '';
  let c = col;
  do {
    result = String.fromCharCode(65 + (c % 26)) + result;
    c = Math.floor(c / 26) - 1;
  } while (c >= 0);
  return result;
}

export function useSpreadsheet() {
  const [state, setState] = useState<SpreadsheetState>(() => ({
    model: new SpreadsheetModel(),
    activeCell: null,
    selection: null,
    editingCell: null,
    editValue: '',
    revision: 0,
    frozenRows: 0,
    frozenCols: 0,
    mergedCells: [],
  }));

  const clipboardRef = useRef<{ cells: Record<string, Cell>; startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);

  const setCell = useCallback((row: number, col: number, value: string) => {
    setState((s) => {
      s.model.setCell(s.model.activeSheetId, row, col, value);
      return { ...s, revision: s.revision + 1 };
    });
  }, []);

  const selectCell = useCallback((row: number, col: number) => {
    setState((s) => {
      const cell = s.model.getCell(s.model.activeSheetId, row, col);
      const displayValue = cell?.formula ? `=${cell.formula}` : cell?.value || '';
      return {
        ...s,
        activeCell: { row, col },
        selection: { startRow: row, startCol: col, endRow: row, endCol: col },
        editingCell: null,
        editValue: displayValue,
      };
    });
  }, []);

  const setSelection = useCallback((startRow: number, startCol: number, endRow: number, endCol: number) => {
    const r1 = Math.min(startRow, endRow);
    const r2 = Math.max(startRow, endRow);
    const c1 = Math.min(startCol, endCol);
    const c2 = Math.max(startCol, endCol);
    setState((s) => ({
      ...s,
      selection: { startRow: r1, startCol: c1, endRow: r2, endCol: c2 },
    }));
  }, []);

  const startEditing = useCallback((row: number, col: number) => {
    setState((s) => {
      const cell = s.model.getCell(s.model.activeSheetId, row, col);
      const editVal = cell?.formula ? `=${cell.formula}` : cell?.value || '';
      return {
        ...s,
        editingCell: { row, col },
        editValue: editVal,
      };
    });
  }, []);

  const commitEdit = useCallback(() => {
    setState((s) => {
      if (!s.editingCell) return s;
      s.model.setCell(s.model.activeSheetId, s.editingCell.row, s.editingCell.col, s.editValue);
      return {
        ...s,
        editingCell: null,
        revision: s.revision + 1,
      };
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setState((s) => ({ ...s, editingCell: null, editValue: '' }));
  }, []);

  const setEditValue = useCallback((value: string) => {
    setState((s) => ({ ...s, editValue: value }));
  }, []);

  const setCellFormat = useCallback((row: number, col: number, format: CellFormat) => {
    setState((s) => {
      s.model.setCellFormat(s.model.activeSheetId, row, col, format);
      return { ...s, revision: s.revision + 1 };
    });
  }, []);

  const copySelection = useCallback(() => {
    setState((s) => {
      if (!s.selection) return s;
      const { startRow, startCol, endRow, endCol } = s.selection;
      const cells: Record<string, Cell> = {};
      const sheet = s.model.getActiveSheet();
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const cell = sheet.cells[`${r}:${c}`];
          if (cell) {
            cells[`${r - startRow}:${c - startCol}`] = { ...cell };
          }
        }
      }
      clipboardRef.current = { cells, startRow, startCol, endRow, endCol };
      return s;
    });
  }, []);

  const pasteSelection = useCallback(() => {
    setState((s) => {
      if (!clipboardRef.current || !s.activeCell) return s;
      const { cells, endRow, startRow, endCol, startCol } = clipboardRef.current;
      const rows = endRow - startRow;
      const cols = endCol - startCol;
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const cell = cells[`${r}:${c}`];
          const targetRow = s.activeCell.row + r;
          const targetCol = s.activeCell.col + c;
          if (cell) {
            const value = cell.formula ? `=${cell.formula}` : cell.value;
            s.model.setCell(s.model.activeSheetId, targetRow, targetCol, value);
            if (cell.format) {
              s.model.setCellFormat(s.model.activeSheetId, targetRow, targetCol, cell.format);
            }
          } else {
            s.model.setCell(s.model.activeSheetId, targetRow, targetCol, '');
          }
        }
      }
      return { ...s, revision: s.revision + 1 };
    });
  }, []);

  const mergeCells = useCallback(() => {
    setState((s) => {
      if (!s.selection) return s;
      const { startRow, startCol, endRow, endCol } = s.selection;
      if (startRow === endRow && startCol === endCol) return s;
      // Check if already merged
      const exists = s.mergedCells.some(
        (m) => m.startRow === startRow && m.startCol === startCol && m.endRow === endRow && m.endCol === endCol,
      );
      if (exists) return s;
      // Keep top-left cell value, clear others
      const sheet = s.model.getActiveSheet();
      const topLeftCell = sheet.cells[`${startRow}:${startCol}`];
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          if (r !== startRow || c !== startCol) {
            s.model.setCell(s.model.activeSheetId, r, c, '');
          }
        }
      }
      return {
        ...s,
        mergedCells: [...s.mergedCells, { startRow, startCol, endRow, endCol }],
        revision: s.revision + 1,
      };
    });
  }, []);

  const unmergeCells = useCallback(() => {
    setState((s) => {
      if (!s.selection) return s;
      const { startRow, startCol } = s.selection;
      const filtered = s.mergedCells.filter(
        (m) => !(m.startRow === startRow && m.startCol === startCol),
      );
      if (filtered.length === s.mergedCells.length) return s;
      return { ...s, mergedCells: filtered, revision: s.revision + 1 };
    });
  }, []);

  const toggleFreezeRows = useCallback(() => {
    setState((s) => ({ ...s, frozenRows: s.frozenRows > 0 ? 0 : 1 }));
  }, []);

  const toggleFreezeCols = useCallback(() => {
    setState((s) => ({ ...s, frozenCols: s.frozenCols > 0 ? 0 : 1 }));
  }, []);

  const addSheet = useCallback((name: string) => {
    setState((s) => {
      const sheet = s.model.addSheet(name);
      s.model.activeSheetId = sheet.id;
      return { ...s, revision: s.revision + 1 };
    });
  }, []);

  const removeSheet = useCallback((id: string) => {
    setState((s) => {
      s.model.removeSheet(id);
      return { ...s, revision: s.revision + 1 };
    });
  }, []);

  const switchSheet = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      activeCell: null,
      editingCell: null,
      editValue: '',
    }));
    setState((s) => {
      s.model.activeSheetId = id;
      return { ...s, revision: s.revision + 1 };
    });
  }, []);

  const renameSheet = useCallback((id: string, name: string) => {
    setState((s) => {
      s.model.renameSheet(id, name);
      return { ...s, revision: s.revision + 1 };
    });
  }, []);

  const exportCSV = useCallback((): string => {
    return state.model.exportCSV();
  }, [state.model]);

  const importCSV = useCallback((csv: string) => {
    setState((s) => {
      s.model.importCSV(csv);
      return { ...s, revision: s.revision + 1 };
    });
  }, []);

  const newSpreadsheet = useCallback(() => {
    setState({
      model: new SpreadsheetModel(),
      activeCell: null,
      selection: null,
      editingCell: null,
      editValue: '',
      revision: 0,
      frozenRows: 0,
      frozenCols: 0,
      mergedCells: [],
    });
  }, []);

  const getCell = useCallback((row: number, col: number): Cell | undefined => {
    return state.model.getCell(state.model.activeSheetId, row, col);
  }, [state.model, state.revision]);

  const getCellAddress = useCallback((row: number, col: number): string => {
    return state.model.getCellAddress(row, col);
  }, [state.model]);

  const activeCellFormat = useMemo((): CellFormat => {
    if (!state.activeCell) return {};
    const cell = state.model.getCell(
      state.model.activeSheetId,
      state.activeCell.row,
      state.activeCell.col,
    );
    return cell?.format || {};
  }, [state.activeCell, state.model, state.revision]);

  const cellAddress = useMemo(() => {
    if (!state.activeCell) return '';
    return state.model.getCellAddress(state.activeCell.row, state.activeCell.col);
  }, [state.activeCell, state.model]);

  const selectionRange = useMemo(() => {
    if (!state.selection) return '';
    const { startRow, startCol, endRow, endCol } = state.selection;
    const start = `${colToLetter(startCol)}${startRow + 1}`;
    if (startRow === endRow && startCol === endCol) return start;
    const end = `${colToLetter(endCol)}${endRow + 1}`;
    return `${start}:${end}`;
  }, [state.selection]);

  const selectionStats = useMemo(() => {
    if (!state.selection) return null;
    const sheet = state.model.getActiveSheet();
    const values: number[] = [];
    for (let r = state.selection.startRow; r <= state.selection.endRow; r++) {
      for (let c = state.selection.startCol; c <= state.selection.endCol; c++) {
        const cell = sheet.cells[`${r}:${c}`];
        if (cell) {
          const v = cell.computedValue !== undefined ? cell.computedValue : cell.value;
          const num = Number(v);
          if (!isNaN(num) && v !== '') values.push(num);
        }
      }
    }
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      sum: Math.round(sum * 1000) / 1000,
      avg: Math.round((sum / values.length) * 1000) / 1000,
      count: values.length,
    };
  }, [state.selection, state.model, state.revision]);

  // Get cells in a range for chart data extraction
  const getCellsInRange = useCallback((startRow: number, startCol: number, endRow: number, endCol: number) => {
    const sheet = state.model.getActiveSheet();
    const rows: string[][] = [];
    for (let r = startRow; r <= endRow; r++) {
      const row: string[] = [];
      for (let c = startCol; c <= endCol; c++) {
        const cell = sheet.cells[`${r}:${c}`];
        if (cell) {
          row.push(cell.computedValue !== undefined ? String(cell.computedValue) : cell.value);
        } else {
          row.push('');
        }
      }
      rows.push(row);
    }
    return rows;
  }, [state.model, state.revision]);

  return {
    model: state.model,
    sheets: state.model.sheets,
    activeSheetId: state.model.activeSheetId,
    activeCell: state.activeCell,
    selection: state.selection,
    editingCell: state.editingCell,
    editValue: state.editValue,
    cellAddress,
    activeCellFormat,
    selectionRange,
    selectionStats,
    revision: state.revision,
    frozenRows: state.frozenRows,
    frozenCols: state.frozenCols,
    mergedCells: state.mergedCells,
    setCell,
    selectCell,
    setSelection,
    startEditing,
    commitEdit,
    cancelEdit,
    setEditValue,
    setCellFormat,
    copySelection,
    pasteSelection,
    mergeCells,
    unmergeCells,
    toggleFreezeRows,
    toggleFreezeCols,
    addSheet,
    removeSheet,
    switchSheet,
    renameSheet,
    exportCSV,
    importCSV,
    newSpreadsheet,
    getCell,
    getCellAddress,
    getCellsInRange,
  };
}
