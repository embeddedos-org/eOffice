import React, { useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import {
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, Code, Code2,
  Link, Image, Table, Minus, Undo, Redo,
  Save, Share2, Users, Sidebar, Maximize2, Minimize2,
  ZoomIn, ZoomOut, ChevronDown, Download, Printer,
  Highlighter, Palette, Type, FileText, Sparkles,
  MoreHorizontal, Search, Replace, Eye
} from 'lucide-react';
import { Document } from '@store/documentStore';
import { cn } from '@utils/cn';
import { saveAs } from 'file-saver';

interface WriterToolbarProps {
  editor: Editor;
  document: Document | null;
  onSave: () => void;
  onToggleAI: () => void;
  onToggleCollab: () => void;
  onToggleSidebar: () => void;
  onToggleFullscreen: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  isFullscreen: boolean;
}

const FONT_FAMILIES = ['Inter', 'Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS'];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
const HEADING_LEVELS = [
  { label: 'Normal', value: 0 },
  { label: 'Heading 1', value: 1 },
  { label: 'Heading 2', value: 2 },
  { label: 'Heading 3', value: 3 },
  { label: 'Heading 4', value: 4 },
  { label: 'Heading 5', value: 5 },
  { label: 'Heading 6', value: 6 },
];
const COLORS = ['#000000', '#374151', '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bae6fd', '#fecaca', '#e9d5ff', '#fed7aa', '#fbcfe8'];

export default function WriterToolbar({
  editor, document, onSave, onToggleAI, onToggleCollab, onToggleSidebar,
  onToggleFullscreen, zoom, onZoomChange, isFullscreen
}: WriterToolbarProps) {
  const { t } = useTranslation();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  const handleExport = async (format: string) => {
    if (!document) return;
    setShowExportMenu(false);
    const content = editor.getHTML();
    switch (format) {
      case 'html': {
        const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${document.title}</title></head><body>${content}</body></html>`], { type: 'text/html' });
        saveAs(blob, `${document.title}.html`);
        break;
      }
      case 'txt': {
        const blob = new Blob([editor.getText()], { type: 'text/plain' });
        saveAs(blob, `${document.title}.txt`);
        break;
      }
      case 'md': {
        // Simple HTML to Markdown conversion
        const text = editor.getText();
        const blob = new Blob([text], { type: 'text/markdown' });
        saveAs(blob, `${document.title}.md`);
        break;
      }
      default:
        break;
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setShowInsertMenu(false);
  };

  const insertImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
    setShowInsertMenu(false);
  };

  const setLink = () => {
    const url = window.prompt('Enter URL:', editor.getAttributes('link').href);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const ToolbarButton = ({ onClick, active, disabled, title, children }: {
    onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn('toolbar-btn', active && 'toolbar-btn-active')}
    >
      {children}
    </button>
  );

  const Separator = () => <div className="toolbar-separator" />;

  return (
    <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 select-none">
      {/* Top bar: File operations */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-surface-100 dark:border-surface-800">
        {/* Document title */}
        <div className="flex items-center gap-2 mr-2">
          <FileText size={16} className="text-writer-500" />
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300 max-w-48 truncate">
            {document?.title || t('file.untitled')}
          </span>
        </div>

        <Separator />

        {/* File operations */}
        <ToolbarButton onClick={onSave} title={`${t('actions.save')} (Ctrl+S)`}>
          <Save size={15} />
        </ToolbarButton>

        {/* Export menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="toolbar-btn flex items-center gap-1"
            title={t('actions.export')}
          >
            <Download size={15} />
            <ChevronDown size={11} />
          </button>
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 min-w-40 overflow-hidden">
              {[
                { label: 'HTML Document', format: 'html', ext: '.html' },
                { label: 'Plain Text', format: 'txt', ext: '.txt' },
                { label: 'Markdown', format: 'md', ext: '.md' },
              ].map(({ label, format }) => (
                <button key={format} onClick={() => handleExport(format)} className="menu-item w-full">{label}</button>
              ))}
            </div>
          )}
        </div>

        <ToolbarButton onClick={() => window.print()} title={t('actions.print')}>
          <Printer size={15} />
        </ToolbarButton>

        <Separator />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title={`${t('actions.undo')} (Ctrl+Z)`}>
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title={`${t('actions.redo')} (Ctrl+Y)`}>
          <Redo size={15} />
        </ToolbarButton>

        <Separator />

        {/* Zoom */}
        <div className="relative">
          <button onClick={() => setShowZoomMenu(!showZoomMenu)} className="toolbar-btn flex items-center gap-1 text-xs font-medium min-w-12 justify-center">
            {zoom}%
            <ChevronDown size={10} />
          </button>
          {showZoomMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 overflow-hidden">
              {[50, 75, 90, 100, 110, 125, 150, 175, 200].map(z => (
                <button key={z} onClick={() => { onZoomChange(z); setShowZoomMenu(false); }} className={cn('menu-item w-full', zoom === z && 'text-primary-600 font-medium')}>{z}%</button>
              ))}
            </div>
          )}
        </div>
        <ToolbarButton onClick={() => onZoomChange(Math.max(50, zoom - 10))} title={t('actions.zoomOut')}>
          <ZoomOut size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => onZoomChange(Math.min(200, zoom + 10))} title={t('actions.zoomIn')}>
          <ZoomIn size={14} />
        </ToolbarButton>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton onClick={onToggleAI} title="AI Assistant" active={false}>
            <Sparkles size={15} className="text-purple-500" />
          </ToolbarButton>
          <ToolbarButton onClick={onToggleCollab} title="Collaboration">
            <Users size={15} />
          </ToolbarButton>
          <ToolbarButton onClick={onToggleSidebar} title="Toggle Sidebar">
            <Sidebar size={15} />
          </ToolbarButton>
          <ToolbarButton onClick={onToggleFullscreen} title={isFullscreen ? t('actions.exitFullscreen') : t('actions.fullscreen')}>
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </ToolbarButton>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5">
        {/* Heading/Style selector */}
        <div className="relative">
          <button onClick={() => setShowHeadingMenu(!showHeadingMenu)} className="toolbar-btn flex items-center gap-1 text-xs font-medium min-w-28 justify-between px-2">
            <span>{editor.isActive('heading') ? `Heading ${editor.getAttributes('heading').level}` : 'Normal'}</span>
            <ChevronDown size={11} />
          </button>
          {showHeadingMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 overflow-hidden min-w-36">
              {HEADING_LEVELS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => {
                    if (value === 0) editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: value as 1|2|3|4|5|6 }).run();
                    setShowHeadingMenu(false);
                  }}
                  className={cn('menu-item w-full', value === 0 ? 'text-sm' : `text-${['3xl','2xl','xl','lg','base','sm'][value-1]} font-bold`)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font family */}
        <div className="relative">
          <button onClick={() => setShowFontMenu(!showFontMenu)} className="toolbar-btn flex items-center gap-1 text-xs min-w-24 justify-between px-2">
            <span className="truncate">{editor.getAttributes('textStyle').fontFamily || 'Inter'}</span>
            <ChevronDown size={11} />
          </button>
          {showFontMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 overflow-hidden max-h-48 overflow-y-auto min-w-40">
              {FONT_FAMILIES.map(font => (
                <button key={font} onClick={() => { editor.chain().focus().setFontFamily(font).run(); setShowFontMenu(false); }} className="menu-item w-full" style={{ fontFamily: font }}>{font}</button>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title={`${t('format.bold')} (Ctrl+B)`}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title={`${t('format.italic')} (Ctrl+I)`}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title={`${t('format.underline')} (Ctrl+U)`}>
          <Underline size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title={t('format.strikethrough')}>
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title={t('format.subscript')}>
          <Subscript size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title={t('format.superscript')}>
          <Superscript size={15} />
        </ToolbarButton>

        {/* Text color */}
        <div className="relative">
          <button onClick={() => setShowColorPicker(!showColorPicker)} className="toolbar-btn flex items-center gap-0.5" title={t('format.fontColor')}>
            <div className="flex flex-col items-center">
              <Type size={14} />
              <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }} />
            </div>
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 p-3">
              <p className="text-xs text-surface-500 mb-2">Text Color</p>
              <div className="grid grid-cols-6 gap-1.5">
                {COLORS.map(color => (
                  <button key={color} onClick={() => { editor.chain().focus().setColor(color).run(); setShowColorPicker(false); }} className="w-6 h-6 rounded-md border border-surface-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
                ))}
              </div>
              <button onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }} className="mt-2 text-xs text-surface-500 hover:text-surface-700 w-full text-center">Reset</button>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative">
          <button onClick={() => setShowHighlightPicker(!showHighlightPicker)} className="toolbar-btn flex items-center gap-0.5" title={t('format.highlight')}>
            <Highlighter size={15} />
          </button>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong z-50 p-3">
              <p className="text-xs text-surface-500 mb-2">Highlight Color</p>
              <div className="flex gap-1.5">
                {HIGHLIGHT_COLORS.map(color => (
                  <button key={color} onClick={() => { editor.chain().focus().toggleHighlight({ color }).run(); setShowHighlightPicker(false); }} className="w-6 h-6 rounded-md border border-surface-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                ))}
              </div>
              <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }} className="mt-2 text-xs text-surface-500 hover:text-surface-700 w-full text-center">Remove</button>
            </div>
          )}
        </div>

        <Separator />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title={t('format.alignLeft')}>
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title={t('format.alignCenter')}>
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title={t('format.alignRight')}>
          <AlignRight size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title={t('format.alignJustify')}>
          <AlignJustify size={15} />
        </ToolbarButton>

        <Separator />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title={t('format.bulletList')}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title={t('format.numberedList')}>
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task List">
          <CheckSquare size={15} />
        </ToolbarButton>

        <Separator />

        {/* Block elements */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title={t('format.blockquote')}>
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title={t('format.code')}>
          <Code size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title={t('format.codeBlock')}>
          <Code2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t('format.horizontalRule')}>
          <Minus size={15} />
        </ToolbarButton>

        <Separator />

        {/* Insert */}
        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title={t('insert.link')}>
          <Link size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} title={t('insert.image')}>
          <Image size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={insertTable} title={t('insert.table')}>
          <Table size={15} />
        </ToolbarButton>

        <Separator />

        {/* Share */}
        <ToolbarButton onClick={onToggleCollab} title={t('actions.share')}>
          <Share2 size={15} />
        </ToolbarButton>
      </div>
    </div>
  );
}
