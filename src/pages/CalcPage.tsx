import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '@store/documentStore';
import CalcToolbar from '@components/spreadsheet/CalcToolbar';
import CalcGrid from '@components/spreadsheet/CalcGrid';
import CalcStatusBar from '@components/spreadsheet/CalcStatusBar';
import CalcFormulaBar from '@components/spreadsheet/CalcFormulaBar';
import CalcSheetTabs from '@components/spreadsheet/CalcSheetTabs';
import AIPanel from '@components/ai/AIPanel';
import toast from 'react-hot-toast';

export interface CellData {
  value: string | number | boolean | null;
  formula?: string;
  format?: CellFormat;
  style?: CellStyle;
}

export interface CellFormat {
  type: 'general' | 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'text' | 'scientific';
  decimals?: number;
  currency?: string;
  dateFormat?: string;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  border?: BorderStyle;
}

export interface BorderStyle {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface Sheet {
  id: string;
  name: string;
  cells: Record<string, CellData>;
  rowHeights: Record<number, number>;
  colWidths: Record<number, number>;
  frozenRows: number;
  frozenCols: number;
  hidden: boolean;
  color?: string;
}

export interface SpreadsheetState {
  sheets: Sheet[];
  activeSheetId: string;
  selection: Selection;
  clipboard?: { cells: Record<string, CellData>; mode: 'copy' | 'cut' };
}

export interface Selection {
  start: { row: number; col: number };
  end: { row: number; col: number };
  activeCell: { row: number; col: number };
}

const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 26;

const createDefaultSheet = (id: string, name: string): Sheet => ({
  id,
  name,
  cells: {},
  rowHeights: {},
  colWidths: {},
  frozenRows: 0,
  frozenCols: 0,
  hidden: false
});

const colToLetter = (col: number): string => {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode(65 + (c % 26)) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
};

const cellRef = (row: number, col: number) => `${colToLetter(col)}${row + 1}`;

// Simple formula evaluator
const evaluateFormula = (formula: string, cells: Record<string, CellData>): number | string => {
  try {
    const expr = formula.slice(1).toUpperCase();

    // SUM function
    const sumMatch = expr.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (sumMatch) {
      const [, start, end] = sumMatch;
      const startCol = start.match(/[A-Z]+/)![0];
      const startRow = parseInt(start.match(/\d+/)![0]);
      const endCol = end.match(/[A-Z]+/)![0];
      const endRow = parseInt(end.match(/\d+/)![0]);
      let sum = 0;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
          const ref = `${String.fromCharCode(c)}${r}`;
          const cell = cells[ref];
          if (cell && typeof cell.value === 'number') sum += cell.value;
          else if (cell && typeof cell.value === 'string' && !isNaN(Number(cell.value))) sum += Number(cell.value);
        }
      }
      return sum;
    }

    // AVERAGE function
    const avgMatch = expr.match(/^AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (avgMatch) {
      const [, start, end] = avgMatch;
      const startCol = start.match(/[A-Z]+/)![0];
      const startRow = parseInt(start.match(/\d+/)![0]);
      const endCol = end.match(/[A-Z]+/)![0];
      const endRow = parseInt(end.match(/\d+/)![0]);
      let sum = 0; let count = 0;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
          const ref = `${String.fromCharCode(c)}${r}`;
          const cell = cells[ref];
          if (cell && (typeof cell.value === 'number' || (typeof cell.value === 'string' && !isNaN(Number(cell.value))))) {
            sum += Number(cell.value); count++;
          }
        }
      }
      return count > 0 ? sum / count : 0;
    }

    // COUNT function
    const countMatch = expr.match(/^COUNT\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (countMatch) {
      const [, start, end] = countMatch;
      const startCol = start.match(/[A-Z]+/)![0];
      const startRow = parseInt(start.match(/\d+/)![0]);
      const endCol = end.match(/[A-Z]+/)![0];
      const endRow = parseInt(end.match(/\d+/)![0]);
      let count = 0;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
          const ref = `${String.fromCharCode(c)}${r}`;
          if (cells[ref]?.value !== null && cells[ref]?.value !== undefined && cells[ref]?.value !== '') count++;
        }
      }
      return count;
    }

    // MAX/MIN
    const maxMinMatch = expr.match(/^(MAX|MIN)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (maxMinMatch) {
      const [, fn, start, end] = maxMinMatch;
      const values: number[] = [];
      const startCol = start.match(/[A-Z]+/)![0];
      const startRow = parseInt(start.match(/\d+/)![0]);
      const endCol = end.match(/[A-Z]+/)![0];
      const endRow = parseInt(end.match(/\d+/)![0]);
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
          const ref = `${String.fromCharCode(c)}${r}`;
          const cell = cells[ref];
          if (cell && (typeof cell.value === 'number' || (typeof cell.value === 'string' && !isNaN(Number(cell.value))))) {
            values.push(Number(cell.value));
          }
        }
      }
      if (values.length === 0) return 0;
      return fn === 'MAX' ? Math.max(...values) : Math.min(...values);
    }

    // Cell reference
    const cellRefMatch = expr.match(/^([A-Z]+\d+)$/);
    if (cellRefMatch) {
      const cell = cells[cellRefMatch[1]];
      return (cell?.value ?? '') as string | number;
    }

    // Simple arithmetic
    const sanitized = expr.replace(/([A-Z]+\d+)/g, (ref) => {
      const cell = cells[ref];
      return String(cell?.value ?? 0);
    });
    return Function(`"use strict"; return (${sanitized})`)();
  } catch {
    return '#ERROR!';
  }
};

export { colToLetter, cellRef, evaluateFormula, DEFAULT_ROWS, DEFAULT_COLS };

export default function CalcPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { documents, currentDocument, createDocument, openDocument, saveDocument } = useDocumentStore();

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetState>({
    sheets: [createDefaultSheet('sheet_1', 'Sheet1'), createDefaultSheet('sheet_2', 'Sheet2'), createDefaultSheet('sheet_3', 'Sheet3')],
    activeSheetId: 'sheet_1',
    selection: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 }, activeCell: { row: 0, col: 0 } }
  });

  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [zoom, setZoom] = useState(100);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (id) {
      const doc = documents.find(d => d.id === id);
      if (doc) {
        openDocument(id);
        try {
          const parsed = JSON.parse(doc.content);
          if (parsed.sheets) setSpreadsheet(prev => ({ ...prev, sheets: parsed.sheets, activeSheetId: parsed.sheets[0]?.id || 'sheet_1' }));
        } catch {
          // Malformed content: keep the current spreadsheet as-is.
        }
      } else {
        navigate('/calc');
      }
    } else {
      const newDoc = createDocument('calc');
      navigate(`/calc/${newDoc.id}`, { replace: true });
    }
  }, [id]);

  const activeSheet = useMemo(() => spreadsheet.sheets.find(s => s.id === spreadsheet.activeSheetId) || spreadsheet.sheets[0], [spreadsheet]);

  const getCellValue = useCallback((row: number, col: number): string => {
    const ref = cellRef(row, col);
    const cell = activeSheet.cells[ref];
    if (!cell) return '';
    if (cell.formula) {
      const result = evaluateFormula(cell.formula, activeSheet.cells);
      return String(result);
    }
    return String(cell.value ?? '') as string;
  }, [activeSheet]);

  const setCellValue = useCallback((row: number, col: number, value: string) => {
    const ref = cellRef(row, col);
    setSpreadsheet(prev => {
      const newSheets = prev.sheets.map(s => {
        if (s.id !== prev.activeSheetId) return s;
        const newCells = { ...s.cells };
        if (value === '') {
          delete newCells[ref];
        } else if (value.startsWith('=')) {
          newCells[ref] = { value: null, formula: value };
        } else {
          const num = Number(value);
          newCells[ref] = { value: isNaN(num) ? value : num };
        }
        return { ...s, cells: newCells };
      });
      return { ...prev, sheets: newSheets };
    });

    // Auto-save
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (currentDocument) {
        saveDocument(currentDocument.id, JSON.stringify({ sheets: spreadsheet.sheets }));
      }
    }, 2000);
  }, [currentDocument, saveDocument, spreadsheet.sheets]);

  const handleCellSelect = useCallback((row: number, col: number) => {
    const ref = cellRef(row, col);
    const cell = activeSheet.cells[ref];
    setFormulaBarValue(cell?.formula || String(cell?.value ?? ''));
    setSpreadsheet(prev => ({
      ...prev,
      selection: { start: { row, col }, end: { row, col }, activeCell: { row, col } }
    }));
  }, [activeSheet]);

  const handleFormulaBarChange = (value: string) => {
    setFormulaBarValue(value);
    const { activeCell } = spreadsheet.selection;
    setCellValue(activeCell.row, activeCell.col, value);
  };

  return (
    <div className="flex flex-col h-full bg-surface-100 dark:bg-surface-900">
      {/* Toolbar */}
      <CalcToolbar
        spreadsheet={spreadsheet}
        activeSheet={activeSheet}
        selection={spreadsheet.selection}
        onCellStyleChange={(style) => {
          const { activeCell } = spreadsheet.selection;
          const ref = cellRef(activeCell.row, activeCell.col);
          setSpreadsheet(prev => ({
            ...prev,
            sheets: prev.sheets.map(s => s.id !== prev.activeSheetId ? s : {
              ...s,
              cells: { ...s.cells, [ref]: { ...s.cells[ref], style: { ...s.cells[ref]?.style, ...style } } }
            })
          }));
        }}
        onToggleAI={() => setShowAI(!showAI)}
        zoom={zoom}
        onZoomChange={setZoom}
        document={currentDocument}
        onSave={() => {
          if (currentDocument) {
            saveDocument(currentDocument.id, JSON.stringify({ sheets: spreadsheet.sheets }));
            toast.success('Saved!');
          }
        }}
      />

      {/* Formula bar */}
      <CalcFormulaBar
        selection={spreadsheet.selection}
        value={formulaBarValue}
        onChange={handleFormulaBarChange}
        activeSheet={activeSheet}
      />

      {/* Main grid area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <CalcGrid
            sheet={activeSheet}
            selection={spreadsheet.selection}
            zoom={zoom}
            getCellValue={getCellValue}
            setCellValue={setCellValue}
            onCellSelect={handleCellSelect}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
          />
        </div>

        {showAI && (
          <AIPanel document={currentDocument} onClose={() => setShowAI(false)} />
        )}
      </div>

      {/* Sheet tabs */}
      <CalcSheetTabs
        sheets={spreadsheet.sheets}
        activeSheetId={spreadsheet.activeSheetId}
        onSheetSelect={(id) => setSpreadsheet(prev => ({ ...prev, activeSheetId: id }))}
        onAddSheet={() => {
          const newId = `sheet_${Date.now()}`;
          const newName = `Sheet${spreadsheet.sheets.length + 1}`;
          setSpreadsheet(prev => ({
            ...prev,
            sheets: [...prev.sheets, createDefaultSheet(newId, newName)],
            activeSheetId: newId
          }));
        }}
        onRenameSheet={(id, name) => {
          setSpreadsheet(prev => ({
            ...prev,
            sheets: prev.sheets.map(s => s.id === id ? { ...s, name } : s)
          }));
        }}
        onDeleteSheet={(id) => {
          if (spreadsheet.sheets.length <= 1) return;
          setSpreadsheet(prev => {
            const newSheets = prev.sheets.filter(s => s.id !== id);
            return { ...prev, sheets: newSheets, activeSheetId: newSheets[0].id };
          });
        }}
      />

      {/* Status bar */}
      <CalcStatusBar selection={spreadsheet.selection} activeSheet={activeSheet} getCellValue={getCellValue} />
    </div>
  );
}
