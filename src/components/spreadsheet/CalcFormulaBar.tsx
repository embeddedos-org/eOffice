import React from 'react';
import { Selection, Sheet, colToLetter, cellRef } from '@pages/CalcPage';
import { Sigma } from 'lucide-react';

interface Props {
  selection: Selection;
  value: string;
  onChange: (value: string) => void;
  activeSheet: Sheet;
}

export default function CalcFormulaBar({ selection, value, onChange, activeSheet }: Props) {
  const { activeCell } = selection;
  const ref = cellRef(activeCell.row, activeCell.col);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
      {/* Cell reference box */}
      <div className="flex-shrink-0 w-20 text-center text-xs font-mono font-medium text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded px-2 py-1">
        {ref}
      </div>

      {/* Function icon */}
      <button className="toolbar-btn flex-shrink-0" title="Insert Function">
        <Sigma size={14} className="text-primary-500" />
      </button>

      {/* Formula input */}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter value or formula (start with = for formulas)"
        className="flex-1 text-xs font-mono bg-transparent text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none border-none"
      />
    </div>
  );
}
