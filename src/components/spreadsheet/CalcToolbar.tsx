import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Save, Download, Printer, Undo, Redo, ZoomIn, ZoomOut, Sparkles, ChevronDown, FileText, BarChart2, PaintBucket, Type, Merge, Scissors, Copy, Clipboard, Filter, SortAsc, Search, Plus, Minus } from 'lucide-react';
import { Sheet, Selection, CellStyle, SpreadsheetState } from '@pages/CalcPage';
import { Document } from '@store/documentStore';
import { cn } from '@utils/cn';
import { saveAs } from 'file-saver';

interface Props {
  spreadsheet: SpreadsheetState;
  activeSheet: Sheet;
  selection: Selection;
  onCellStyleChange: (style: Partial<CellStyle>) => void;
  onToggleAI: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  document: Document | null;
  onSave: () => void;
}

const COLORS = ['#000000', '#374151', '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];
const BG_COLORS = ['#ffffff', '#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3', '#f3e8ff', '#ffedd5', '#fee2e2'];

export default function CalcToolbar({ spreadsheet, activeSheet, selection, onCellStyleChange, onToggleAI, zoom, onZoomChange, document, onSave }: Props) {
  const { t } = useTranslation();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const handleExport = (format: string) => {
    setShowExportMenu(false);
    if (format === 'csv') {
      const cells = activeSheet.cells;
      let csv = '';
      for (let r = 0; r < 100; r++) {
        const row = [];
        for (let c = 0; c < 26; c++) {
          const ref = `${String.fromCharCode(65 + c)}${r + 1}`;
          row.push(cells[ref]?.value ?? '');
        }
        if (row.some(v => v !== '')) csv += row.join(',') + '\n';
      }
      const blob = new Blob([csv], { type: 'text/csv' });
      saveAs(blob, `${document?.title || 'spreadsheet'}.csv`);
    }
  };

  const ToolbarButton = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button onClick={onClick} title={title} className={cn('toolbar-btn', active && 'toolbar-btn-active')}>{children}</button>
  );

  const Separator = () => <div className="toolbar-separator" />;

  return (
    <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 select-none">
      {/* Top bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-surface-100 dark:border-surface-800">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-4 h-4 rounded bg-calc-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300 max-w-48 truncate">{document?.title || 'Untitled Spreadsheet'}</span>
        </div>
        <Separator />
        <ToolbarButton onClick={onSave} title="Save (Ctrl+S)"><Save size={15} /></ToolbarButton>
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="toolbar-btn flex items-center gap-1" title="Export">
            <Download size={15} /><ChevronDown size={11} />
          </button>
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 overflow-hidden min-w-36">
              <button onClick={() => handleExport('csv')} className="menu-item w-full">CSV (.csv)</button>
              <button onClick={() => handleExport('xlsx')} className="menu-item w-full">Excel (.xlsx)</button>
              <button onClick={() => handleExport('pdf')} className="menu-item w-full">PDF (.pdf)</button>
            </div>
          )}
        </div>
        <ToolbarButton onClick={() => window.print()} title="Print"><Printer size={15} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => {}} title="Undo (Ctrl+Z)"><Undo size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Redo (Ctrl+Y)"><Redo size={15} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => onZoomChange(Math.max(50, zoom - 10))} title="Zoom Out"><ZoomOut size={14} /></ToolbarButton>
        <span className="text-xs font-medium text-surface-600 dark:text-surface-400 min-w-10 text-center">{zoom}%</span>
        <ToolbarButton onClick={() => onZoomChange(Math.min(200, zoom + 10))} title="Zoom In"><ZoomIn size={14} /></ToolbarButton>
        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton onClick={onToggleAI} title="AI Assistant"><Sparkles size={15} className="text-purple-500" /></ToolbarButton>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5">
        <ToolbarButton onClick={() => onCellStyleChange({ bold: true })} title="Bold"><Bold size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => onCellStyleChange({ italic: true })} title="Italic"><Italic size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => onCellStyleChange({ underline: true })} title="Underline"><Underline size={15} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => onCellStyleChange({ align: 'left' })} title="Align Left"><AlignLeft size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => onCellStyleChange({ align: 'center' })} title="Align Center"><AlignCenter size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => onCellStyleChange({ align: 'right' })} title="Align Right"><AlignRight size={15} /></ToolbarButton>
        <Separator />
        {/* Text color */}
        <div className="relative">
          <button onClick={() => setShowColorPicker(!showColorPicker)} className="toolbar-btn flex items-center gap-0.5" title="Text Color">
            <Type size={14} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 p-3">
              <div className="grid grid-cols-6 gap-1.5">
                {COLORS.map(c => <button key={c} onClick={() => { onCellStyleChange({ color: c }); setShowColorPicker(false); }} className="w-6 h-6 rounded-md border border-surface-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />)}
              </div>
            </div>
          )}
        </div>
        {/* Background color */}
        <div className="relative">
          <button onClick={() => setShowBgPicker(!showBgPicker)} className="toolbar-btn flex items-center gap-0.5" title="Background Color">
            <PaintBucket size={14} />
          </button>
          {showBgPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 p-3">
              <div className="flex flex-wrap gap-1.5">
                {BG_COLORS.map(c => <button key={c} onClick={() => { onCellStyleChange({ backgroundColor: c }); setShowBgPicker(false); }} className="w-6 h-6 rounded-md border border-surface-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />)}
              </div>
            </div>
          )}
        </div>
        <Separator />
        {/* Number formats */}
        <div className="relative">
          <button onClick={() => setShowFormatMenu(!showFormatMenu)} className="toolbar-btn flex items-center gap-1 text-xs px-2" title="Number Format">
            <span>123</span><ChevronDown size={10} />
          </button>
          {showFormatMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 overflow-hidden min-w-40">
              {['General', 'Number', 'Currency', 'Percentage', 'Date', 'Time', 'Scientific', 'Text'].map(f => (
                <button key={f} onClick={() => setShowFormatMenu(false)} className="menu-item w-full">{f}</button>
              ))}
            </div>
          )}
        </div>
        <Separator />
        <ToolbarButton onClick={() => {}} title="Insert Row"><Plus size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Delete Row"><Minus size={14} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => {}} title="Sort"><SortAsc size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Filter"><Filter size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Find"><Search size={14} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => {}} title="Insert Chart"><BarChart2 size={14} /></ToolbarButton>
      </div>
    </div>
  );
}
