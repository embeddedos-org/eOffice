import React, { useState } from 'react';
import { PresentationState, PresentationTheme, Slide } from '@pages/ImpressPage';
import { Document } from '@store/documentStore';
import { Play, Plus, Save, Download, Printer, Undo, Redo, ZoomIn, ZoomOut, Sparkles, ChevronDown, Palette, Layout, SlidersHorizontal, FileText, Image, Type, Square, Circle, Triangle, BarChart2, Minus, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Eye, EyeOff } from 'lucide-react';
import { cn } from '@utils/cn';

interface Props {
  presentation: PresentationState;
  currentSlide: Slide | undefined;
  onAddSlide: () => void;
  onStartPresentation: () => void;
  onToggleAI: () => void;
  onToggleProperties: () => void;
  onToggleNotes: () => void;
  onThemeChange: (theme: PresentationTheme) => void;
  themes: PresentationTheme[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  document: Document | null;
  onSave: () => void;
}

export default function ImpressToolbar({ presentation, currentSlide, onAddSlide, onStartPresentation, onToggleAI, onToggleProperties, onToggleNotes, onThemeChange, themes, zoom, onZoomChange, document, onSave }: Props) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const ToolbarButton = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button onClick={onClick} title={title} className={cn('toolbar-btn', active && 'toolbar-btn-active')}>{children}</button>
  );

  const Separator = () => <div className="toolbar-separator" />;

  return (
    <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 select-none">
      {/* Top bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-surface-100 dark:border-surface-800">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-4 h-4 rounded bg-impress-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">I</span>
          </div>
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300 max-w-48 truncate">{document?.title || 'Untitled Presentation'}</span>
        </div>
        <Separator />
        <ToolbarButton onClick={onSave} title="Save (Ctrl+S)"><Save size={15} /></ToolbarButton>
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="toolbar-btn flex items-center gap-1" title="Export">
            <Download size={15} /><ChevronDown size={11} />
          </button>
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 overflow-hidden min-w-40">
              <button onClick={() => setShowExportMenu(false)} className="menu-item w-full">PDF (.pdf)</button>
              <button onClick={() => setShowExportMenu(false)} className="menu-item w-full">PowerPoint (.pptx)</button>
              <button onClick={() => setShowExportMenu(false)} className="menu-item w-full">Images (.png)</button>
              <button onClick={() => setShowExportMenu(false)} className="menu-item w-full">HTML</button>
            </div>
          )}
        </div>
        <ToolbarButton onClick={() => window.print()} title="Print"><Printer size={15} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => {}} title="Undo"><Undo size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Redo"><Redo size={15} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => onZoomChange(Math.max(25, zoom - 10))} title="Zoom Out"><ZoomOut size={14} /></ToolbarButton>
        <span className="text-xs font-medium text-surface-600 dark:text-surface-400 min-w-10 text-center">{zoom}%</span>
        <ToolbarButton onClick={() => onZoomChange(Math.min(200, zoom + 10))} title="Zoom In"><ZoomIn size={14} /></ToolbarButton>
        <Separator />
        {/* Theme selector */}
        <div className="relative">
          <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="toolbar-btn flex items-center gap-1.5 text-xs px-2" title="Theme">
            <Palette size={14} />
            <span>{presentation.theme.name}</span>
            <ChevronDown size={10} />
          </button>
          {showThemeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 overflow-hidden p-2 min-w-48">
              <p className="text-xs font-semibold text-surface-400 px-2 mb-2">Themes</p>
              {themes.map(theme => (
                <button
                  key={theme.name}
                  onClick={() => { onThemeChange(theme); setShowThemeMenu(false); }}
                  className={cn('w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors', presentation.theme.name === theme.name && 'bg-primary-50 dark:bg-primary-900/20')}
                >
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.primaryColor }} />
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.backgroundColor }} />
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.accentColor }} />
                  </div>
                  <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{theme.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onStartPresentation} className="btn-primary py-1.5 px-3 text-xs">
            <Play size={13} /> Present
          </button>
          <ToolbarButton onClick={onToggleAI} title="AI Assistant"><Sparkles size={15} className="text-purple-500" /></ToolbarButton>
          <ToolbarButton onClick={onToggleProperties} title="Properties"><SlidersHorizontal size={15} /></ToolbarButton>
          <ToolbarButton onClick={onToggleNotes} title="Speaker Notes"><FileText size={15} /></ToolbarButton>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5">
        <ToolbarButton onClick={onAddSlide} title="Add Slide"><Plus size={15} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => {}} title="Bold"><Bold size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Italic"><Italic size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Underline"><Underline size={15} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => {}} title="Align Left"><AlignLeft size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Align Center"><AlignCenter size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => {}} title="Align Right"><AlignRight size={15} /></ToolbarButton>
        <Separator />
        {/* Insert elements */}
        <div className="relative">
          <button onClick={() => setShowInsertMenu(!showInsertMenu)} className="toolbar-btn flex items-center gap-1 text-xs px-2" title="Insert">
            <Plus size={13} /><span>Insert</span><ChevronDown size={10} />
          </button>
          {showInsertMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 overflow-hidden min-w-36">
              {[
                { icon: Type, label: 'Text Box' },
                { icon: Image, label: 'Image' },
                { icon: Square, label: 'Rectangle' },
                { icon: Circle, label: 'Circle' },
                { icon: BarChart2, label: 'Chart' },
                { icon: Layout, label: 'Table' },
              ].map(({ icon: Icon, label }) => (
                <button key={label} onClick={() => setShowInsertMenu(false)} className="menu-item w-full">
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Separator />
        <ToolbarButton onClick={() => {}} title="Slide Layout"><Layout size={14} /></ToolbarButton>
      </div>
    </div>
  );
}
