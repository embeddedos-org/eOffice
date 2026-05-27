import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Sheet, Selection, CellData, colToLetter, cellRef, DEFAULT_ROWS, DEFAULT_COLS } from '@pages/CalcPage';
import { cn } from '@utils/cn';

interface Props {
  sheet: Sheet;
  selection: Selection;
  zoom: number;
  getCellValue: (row: number, col: number) => string;
  setCellValue: (row: number, col: number, value: string) => void;
  onCellSelect: (row: number, col: number) => void;
  editingCell: { row: number; col: number } | null;
  setEditingCell: (cell: { row: number; col: number } | null) => void;
}

const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 24;
const HEADER_WIDTH = 50;
const HEADER_HEIGHT = 24;

export default function CalcGrid({
  sheet, selection, zoom, getCellValue, setCellValue, onCellSelect, editingCell, setEditingCell
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editValue, setEditValue] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const getColWidth = (col: number) => sheet.colWidths[col] || DEFAULT_COL_WIDTH;
  const getRowHeight = (row: number) => sheet.rowHeights[row] || DEFAULT_ROW_HEIGHT;

  const isSelected = (row: number, col: number) => {
    const { start, end } = selection;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  const isActiveCell = (row: number, col: number) =>
    selection.activeCell.row === row && selection.activeCell.col === col;

  const startEditing = (row: number, col: number) => {
    const ref = cellRef(row, col);
    const cell = sheet.cells[ref];
    setEditValue(cell?.formula || String(cell?.value ?? ''));
    setEditingCell({ row, col });
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    setCellValue(editingCell.row, editingCell.col, editValue);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, setCellValue, setEditingCell]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (editingCell) {
      if (e.key === 'Enter') { commitEdit(); onCellSelect(row + 1, col); }
      else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); onCellSelect(row, col + 1); }
      else if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
      return;
    }

    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); onCellSelect(Math.max(0, row - 1), col); break;
      case 'ArrowDown': e.preventDefault(); onCellSelect(Math.min(DEFAULT_ROWS - 1, row + 1), col); break;
      case 'ArrowLeft': e.preventDefault(); onCellSelect(row, Math.max(0, col - 1)); break;
      case 'ArrowRight': e.preventDefault(); onCellSelect(row, Math.min(DEFAULT_COLS - 1, col + 1)); break;
      case 'Enter': startEditing(row, col); break;
      case 'Tab': e.preventDefault(); onCellSelect(row, Math.min(DEFAULT_COLS - 1, col + 1)); break;
      case 'Delete': case 'Backspace': setCellValue(row, col, ''); break;
      case 'F2': startEditing(row, col); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setEditValue(e.key);
          setEditingCell({ row, col });
          setTimeout(() => editInputRef.current?.focus(), 0);
        }
    }
  }, [editingCell, commitEdit, onCellSelect, startEditing, setCellValue]);

  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    const ref = cellRef(row, col);
    const cell = sheet.cells[ref];
    if (!cell?.style) return {};
    const s = cell.style;
    return {
      fontWeight: s.bold ? 'bold' : undefined,
      fontStyle: s.italic ? 'italic' : undefined,
      textDecoration: [s.underline && 'underline', s.strikethrough && 'line-through'].filter(Boolean).join(' ') || undefined,
      fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
      color: s.color,
      backgroundColor: s.backgroundColor,
      textAlign: s.align,
      verticalAlign: s.verticalAlign,
      whiteSpace: s.wrap ? 'normal' : 'nowrap'
    };
  };

  const scaleFactor = zoom / 100;

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-white dark:bg-surface-900 relative">
      <div style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'top left', width: `${100 / scaleFactor}%` }}>
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {/* Corner cell */}
              <th
                className="sticky top-0 left-0 z-30 bg-surface-100 dark:bg-surface-800 border-r border-b border-surface-300 dark:border-surface-600"
                style={{ width: HEADER_WIDTH, height: HEADER_HEIGHT, minWidth: HEADER_WIDTH }}
              />
              {/* Column headers */}
              {Array.from({ length: DEFAULT_COLS }, (_, col) => (
                <th
                  key={col}
                  className="sticky top-0 z-20 bg-surface-100 dark:bg-surface-800 border-r border-b border-surface-300 dark:border-surface-600 text-xs font-medium text-surface-500 dark:text-surface-400 text-center select-none cursor-pointer hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                  style={{ width: getColWidth(col), minWidth: getColWidth(col), height: HEADER_HEIGHT }}
                >
                  {colToLetter(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DEFAULT_ROWS }, (_, row) => (
              <tr key={row}>
                {/* Row header */}
                <td
                  className="sticky left-0 z-10 bg-surface-100 dark:bg-surface-800 border-r border-b border-surface-300 dark:border-surface-600 text-xs font-medium text-surface-500 dark:text-surface-400 text-center select-none cursor-pointer hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                  style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH, height: getRowHeight(row) }}
                >
                  {row + 1}
                </td>
                {/* Data cells */}
                {Array.from({ length: DEFAULT_COLS }, (_, col) => {
                  const isEditing = editingCell?.row === row && editingCell?.col === col;
                  const active = isActiveCell(row, col);
                  const selected = isSelected(row, col);
                  const value = getCellValue(row, col);

                  return (
                    <td
                      key={col}
                      className={cn(
                        'border-r border-b border-surface-200 dark:border-surface-700 relative overflow-hidden',
                        selected && !active && 'bg-primary-50 dark:bg-primary-900/20',
                        active && 'bg-white dark:bg-surface-900'
                      )}
                      style={{ width: getColWidth(col), minWidth: getColWidth(col), height: getRowHeight(row), ...getCellStyle(row, col) }}
                      onClick={() => { if (!isEditing) { onCellSelect(row, col); } }}
                      onDoubleClick={() => startEditing(row, col)}
                      onKeyDown={(e) => handleKeyDown(e, row, col)}
                      tabIndex={active ? 0 : -1}
                    >
                      {active && !isEditing && (
                        <div className="absolute inset-0 border-2 border-primary-500 pointer-events-none z-10" />
                      )}
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { commitEdit(); onCellSelect(row + 1, col); }
                            else if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
                            else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); onCellSelect(row, col + 1); }
                          }}
                          className="absolute inset-0 w-full h-full px-1 text-xs bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 outline-none border-2 border-primary-500 z-20"
                          style={{ fontSize: '12px' }}
                        />
                      ) : (
                        <span className="block px-1 text-xs text-surface-800 dark:text-surface-200 overflow-hidden whitespace-nowrap" style={{ lineHeight: `${getRowHeight(row)}px` }}>
                          {value}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
