import React, { useState } from 'react';
import { Sheet } from '@pages/CalcPage';
import { Plus, X, MoreHorizontal } from 'lucide-react';
import { cn } from '@utils/cn';

interface Props {
  sheets: Sheet[];
  activeSheetId: string;
  onSheetSelect: (id: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (id: string, name: string) => void;
  onDeleteSheet: (id: string) => void;
}

export default function CalcSheetTabs({ sheets, activeSheetId, onSheetSelect, onAddSheet, onRenameSheet, onDeleteSheet }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startRename = (sheet: Sheet) => {
    setEditingId(sheet.id);
    setEditName(sheet.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRenameSheet(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center bg-surface-100 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 overflow-x-auto no-scrollbar">
      <div className="flex items-center">
        {sheets.map(sheet => (
          <div
            key={sheet.id}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 border-r border-surface-200 dark:border-surface-700 cursor-pointer select-none group min-w-0 transition-colors',
              sheet.id === activeSheetId
                ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 border-t-2 border-t-primary-500'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
            )}
            onClick={() => onSheetSelect(sheet.id)}
            onDoubleClick={() => startRename(sheet)}
          >
            {sheet.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sheet.color }} />}
            {editingId === sheet.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                className="text-xs bg-transparent border-b border-primary-500 outline-none w-20"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="text-xs font-medium truncate max-w-24">{sheet.name}</span>
            )}
            {sheet.id === activeSheetId && sheets.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); onDeleteSheet(sheet.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 transition-all"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onAddSheet}
        className="flex items-center justify-center w-8 h-8 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors flex-shrink-0"
        title="Add Sheet"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
