import React, { useMemo } from 'react';
import { Selection, Sheet, cellRef } from '@pages/CalcPage';

interface Props {
  selection: Selection;
  activeSheet: Sheet;
  getCellValue: (row: number, col: number) => string;
}

export default function CalcStatusBar({ selection, activeSheet, getCellValue }: Props) {
  const stats = useMemo(() => {
    const { start, end } = selection;
    const values: number[] = [];
    for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
      for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
        const v = getCellValue(r, c);
        if (v !== '' && !isNaN(Number(v))) values.push(Number(v));
      }
    }
    const count = (Math.abs(end.row - start.row) + 1) * (Math.abs(end.col - start.col) + 1);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? sum / values.length : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    return { count, numCount: values.length, sum, avg, min, max };
  }, [selection, getCellValue]);

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-500 dark:text-surface-400 select-none">
      <div className="flex items-center gap-4">
        <span>Cells: {stats.count.toLocaleString()}</span>
        {stats.numCount > 0 && (
          <>
            <span>Sum: {stats.sum.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
            <span>Avg: {stats.avg.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
            <span>Min: {stats.min.toLocaleString()}</span>
            <span>Max: {stats.max.toLocaleString()}</span>
            <span>Count: {stats.numCount}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>Sheets: {activeSheet?.name || 'Sheet1'}</span>
        <span>Calc</span>
      </div>
    </div>
  );
}
