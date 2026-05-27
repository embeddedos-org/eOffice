import React from 'react';
import { useCallback, useRef, useEffect, useState } from 'react';
import type { Cell } from '@eoffice/core';
import type { MergedCell } from '../hooks/useSpreadsheet';

const NUM_ROWS = 50;
const NUM_COLS = 26;

const FORMULA_FUNCTIONS = [
  'SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'IF', 'VLOOKUP', 'HLOOKUP',
  'INDEX', 'MATCH', 'CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN',
  'TRIM', 'UPPER', 'LOWER', 'ROUND', 'ABS', 'SQRT', 'POWER',
  'NOW', 'TODAY', 'DATE', 'YEAR', 'MONTH', 'DAY',
  'AND', 'OR', 'NOT', 'IFERROR', 'COUNTIF', 'SUMIF',
];

interface SpreadsheetGridProps {
  activeCell: { row: number; col: number } | null;
  editingCell: { row: number; col: number } | null;
  editValue: string;
  revision: number;
  selection: { startRow: number; startCol: number; endRow: number; endCol: number } | null;
  frozenRows: number;
  frozenCols: number;
  mergedCells: MergedCell[];
  getCell: (row: number, col: number) => Cell | undefined;
  getCellAddress: (row: number, col: number) => string;
  onSelectCell: (row: number, col: number) => void;
  onSetSelection: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
  onStartEditing: (row: number, col: number) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onCopy: () => void;
  onPaste: () => void;
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

function getCellDisplayValue(cell: Cell | undefined): string {
  if (!cell) return '';
  if (cell.computedValue !== undefined) return String(cell.computedValue);
  return cell.value;
}

function formatDisplayValue(value: string, format?: Cell['format']): string {
  if (!format?.numberFormat || format.numberFormat === 'general') return value;
  const num = Number(value);
  if (isNaN(num)) return value;
  switch (format.numberFormat) {
    case 'number': return num.toFixed(2);
    case 'currency': return `$${num.toFixed(2)}`;
    case 'percent': return `${(num * 100).toFixed(1)}%`;
    case 'date': {
      const d = new Date(num);
      return isNaN(d.getTime()) ? value : d.toLocaleDateString();
    }
    default: return value;
  }
}

function isErrorValue(value: string): boolean {
  return value.startsWith('#') && value.endsWith('!');
}

function isCellInMerge(row: number, col: number, mergedCells: MergedCell[]): MergedCell | undefined {
  return mergedCells.find(
    (m) => row >= m.startRow && row <= m.endRow && col >= m.startCol && col <= m.endCol,
  );
}

function isMergeOrigin(row: number, col: number, merge: MergedCell): boolean {
  return row === merge.startRow && col === merge.startCol;
}

export default function SpreadsheetGrid({
  activeCell,
  editingCell,
  editValue,
  revision: _revision,
  selection,
  frozenRows,
  frozenCols,
  mergedCells,
  getCell,
  onSelectCell,
  onSetSelection,
  onStartEditing,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onCopy,
  onPaste,
}: SpreadsheetGridProps) {
  const editInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{ row: number; col: number } | null>(null);

  // Column/row resize state
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const resizing = useRef<{ type: 'col' | 'row'; index: number; startPos: number; startSize: number } | null>(null);

  // Formula autocomplete
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<string[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);

  // Update autocomplete when edit value changes
  useEffect(() => {
    if (editingCell && editValue.startsWith('=')) {
      const afterEquals = editValue.slice(1);
      const lastToken = afterEquals.split(/[^A-Za-z]/).pop() || '';
      if (lastToken.length > 0) {
        const matches = FORMULA_FUNCTIONS.filter((f) =>
          f.startsWith(lastToken.toUpperCase()),
        );
        setAutocompleteItems(matches);
        setShowAutocomplete(matches.length > 0);
        setAutocompleteIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  }, [editValue, editingCell]);

  const applyAutocomplete = useCallback((func: string) => {
    const afterEquals = editValue.slice(1);
    const tokens = afterEquals.split(/([^A-Za-z])/);
    tokens[tokens.length - 1] = func + '(';
    onEditValueChange('=' + tokens.join(''));
    setShowAutocomplete(false);
  }, [editValue, onEditValueChange]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (editingCell) {
        onCommitEdit();
      }
      onSelectCell(row, col);
    },
    [editingCell, onCommitEdit, onSelectCell],
  );

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      onStartEditing(row, col);
    },
    [onStartEditing],
  );

  const handleMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      dragStart.current = { row, col };
      onSelectCell(row, col);
    },
    [onSelectCell],
  );

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (!isDragging.current || !dragStart.current) return;
      onSetSelection(dragStart.current.row, dragStart.current.col, row, col);
    },
    [onSetSelection],
  );

  useEffect(() => {
    const handleMouseUp = () => {
      isDragging.current = false;
      dragStart.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Column resize handlers
  const handleColResizeStart = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startSize = colWidths[col] || 100;
    resizing.current = { type: 'col', index: col, startPos: e.clientX, startSize };

    const handleMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const diff = ev.clientX - resizing.current.startPos;
      const newWidth = Math.max(40, resizing.current.startSize + diff);
      setColWidths((prev) => ({ ...prev, [resizing.current!.index]: newWidth }));
    };

    const handleUp = () => {
      resizing.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [colWidths]);

  // Row resize handlers
  const handleRowResizeStart = useCallback((row: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startSize = rowHeights[row] || 24;
    resizing.current = { type: 'row', index: row, startPos: e.clientY, startSize };

    const handleMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const diff = ev.clientY - resizing.current.startPos;
      const newHeight = Math.max(18, resizing.current.startSize + diff);
      setRowHeights((prev) => ({ ...prev, [resizing.current!.index]: newHeight }));
    };

    const handleUp = () => {
      resizing.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'row-resize';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [rowHeights]);

  const isInSelection = useCallback(
    (row: number, col: number) => {
      if (!selection) return false;
      return (
        row >= selection.startRow &&
        row <= selection.endRow &&
        col >= selection.startCol &&
        col <= selection.endCol
      );
    },
    [selection],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeCell) return;

      // Copy/Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !editingCell) {
        e.preventDefault();
        onCopy();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !editingCell) {
        e.preventDefault();
        onPaste();
        return;
      }

      if (editingCell) {
        if (showAutocomplete) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAutocompleteIndex((i) => Math.min(i + 1, autocompleteItems.length - 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAutocompleteIndex((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === 'Tab' || e.key === 'Enter') {
            if (autocompleteItems.length > 0) {
              e.preventDefault();
              applyAutocomplete(autocompleteItems[autocompleteIndex]);
              return;
            }
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setShowAutocomplete(false);
            return;
          }
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommitEdit();
          onSelectCell(activeCell.row + 1, activeCell.col);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancelEdit();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          onCommitEdit();
          onSelectCell(activeCell.row, activeCell.col + (e.shiftKey ? -1 : 1));
        }
        return;
      }

      const { row, col } = activeCell;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (row > 0) onSelectCell(row - 1, col);
          break;
        case 'ArrowDown':
        case 'Enter':
          e.preventDefault();
          if (row < NUM_ROWS - 1) onSelectCell(row + 1, col);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (col > 0) onSelectCell(row, col - 1);
          break;
        case 'ArrowRight':
        case 'Tab':
          e.preventDefault();
          if (col < NUM_COLS - 1) onSelectCell(row, col + 1);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          onStartEditing(row, col);
          onEditValueChange('');
          break;
        case 'F2':
          e.preventDefault();
          onStartEditing(row, col);
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            onStartEditing(row, col);
            onEditValueChange(e.key);
          }
      }
    },
    [activeCell, editingCell, onSelectCell, onStartEditing, onCommitEdit, onCancelEdit, onEditValueChange, onCopy, onPaste, showAutocomplete, autocompleteItems, autocompleteIndex, applyAutocomplete],
  );

  return (
    <div
      className="grid-container"
      ref={gridRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <table className="grid-table">
        <thead>
          <tr>
            <th className="grid-corner" />
            {Array.from({ length: NUM_COLS }, (_, c) => (
              <th
                key={c}
                className={`grid-col-header ${activeCell?.col === c ? 'selected' : ''} ${isInSelection(-1, c) ? 'in-selection' : ''}`}
                style={{ width: colWidths[c] || 100, minWidth: colWidths[c] || 100 }}
              >
                {colToLetter(c)}
                <div
                  className="col-resize-handle"
                  onMouseDown={(e) => handleColResizeStart(c, e)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: NUM_ROWS }, (_, r) => (
            <tr key={r}>
              <td
                className={`grid-row-header ${activeCell?.row === r ? 'selected' : ''}`}
                style={{ height: rowHeights[r] || 24 }}
              >
                {r + 1}
                <div
                  className="row-resize-handle"
                  onMouseDown={(e) => handleRowResizeStart(r, e)}
                />
              </td>
              {Array.from({ length: NUM_COLS }, (_, c) => {
                const merge = isCellInMerge(r, c, mergedCells);

                // Skip cells that are inside a merge but not the origin
                if (merge && !isMergeOrigin(r, c, merge)) {
                  return null;
                }

                const isActive = activeCell?.row === r && activeCell?.col === c;
                const isEditing = editingCell?.row === r && editingCell?.col === c;
                const inSelection = isInSelection(r, c);
                const cell = getCell(r, c);
                const rawValue = getCellDisplayValue(cell);
                const displayValue = formatDisplayValue(rawValue, cell?.format);
                const align = cell?.format?.align || (cell && !isNaN(Number(rawValue)) && rawValue !== '' ? 'right' : 'left');
                const isError = isErrorValue(rawValue);

                const isFrozenRow = r < frozenRows;
                const isFrozenCol = c < frozenCols;

                const cellStyle: React.CSSProperties = {
                  width: colWidths[c] || 100,
                  minWidth: colWidths[c] || 100,
                  height: rowHeights[r] || 24,
                };
                if (cell?.format?.bold) cellStyle.fontWeight = 700;
                if (cell?.format?.italic) cellStyle.fontStyle = 'italic';
                if (cell?.format?.underline) cellStyle.textDecoration = 'underline';
                if (cell?.format?.color) cellStyle.color = cell.format.color;
                if (cell?.format?.backgroundColor) cellStyle.backgroundColor = cell.format.backgroundColor;

                if (isFrozenRow || isFrozenCol) {
                  cellStyle.position = 'sticky';
                  if (isFrozenRow) cellStyle.top = 24; // after header
                  if (isFrozenCol) cellStyle.left = 48; // after row header
                  cellStyle.zIndex = isFrozenRow && isFrozenCol ? 4 : 2;
                  cellStyle.background = cellStyle.backgroundColor || 'var(--bg-cell)';
                }

                const colSpan = merge ? merge.endCol - merge.startCol + 1 : undefined;
                const rowSpan = merge ? merge.endRow - merge.startRow + 1 : undefined;

                return (
                  <td
                    key={c}
                    className={[
                      'grid-cell',
                      isActive ? 'active' : '',
                      isEditing ? 'editing' : '',
                      inSelection && !isActive ? 'in-selection' : '',
                      `align-${align}`,
                      isError ? 'cell-error' : '',
                      isFrozenRow ? 'frozen-row' : '',
                      isFrozenCol ? 'frozen-col' : '',
                      merge ? 'merged-cell' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={cellStyle}
                    colSpan={colSpan}
                    rowSpan={rowSpan}
                    onClick={() => handleCellClick(r, c)}
                    onDoubleClick={() => handleCellDoubleClick(r, c)}
                    onMouseDown={(e) => handleMouseDown(r, c, e)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                  >
                    {isEditing ? (
                      <div className="grid-cell-edit-wrapper">
                        <input
                          ref={editInputRef}
                          className="grid-cell-input"
                          value={editValue}
                          onChange={(e) => onEditValueChange(e.target.value)}
                          onBlur={onCommitEdit}
                        />
                        {showAutocomplete && (
                          <div className="formula-autocomplete">
                            {autocompleteItems.map((item, i) => (
                              <div
                                key={item}
                                className={`formula-autocomplete-item ${i === autocompleteIndex ? 'active' : ''}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  applyAutocomplete(item);
                                }}
                              >
                                <span className="formula-autocomplete-fn">fx</span>
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      displayValue
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
