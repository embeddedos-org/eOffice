import React, { useState, useRef, useEffect, useCallback } from 'react';

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  heading: boolean;
  list: boolean;
}

interface ToolbarProps {
  formatState: FormatState;
  onFormat: (command: string) => void;
  onHeading: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: (format: 'docx' | 'html' | 'md' | 'pdf') => void;
  onInsertTable: (rows: number, cols: number) => void;
  onInsertImage: () => void;
  onFindReplace: () => void;
}

const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];
const LINE_SPACINGS = [
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3' },
];

function DropdownMenu({ trigger, children, className }: { trigger: React.ReactNode; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={`toolbar-dropdown ${className || ''}`} ref={ref}>
      <button className="toolbar-btn toolbar-dropdown-trigger" onClick={() => setOpen(!open)} type="button">
        {trigger}
      </button>
      {open && (
        <div className="toolbar-dropdown-menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Toolbar({
  formatState,
  onFormat,
  onHeading,
  onUndo,
  onRedo,
  onExport,
  onInsertTable,
  onInsertImage,
  onFindReplace,
}: ToolbarProps) {
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const execFont = useCallback((family: string) => {
    document.execCommand('fontName', false, family);
  }, []);

  const execFontSize = useCallback((size: string) => {
    // execCommand fontSize only accepts 1-7, so we use a workaround
    document.execCommand('fontSize', false, '7');
    const fontElements = document.querySelectorAll('font[size="7"]');
    fontElements.forEach((el) => {
      (el as HTMLElement).removeAttribute('size');
      (el as HTMLElement).style.fontSize = size + 'pt';
    });
  }, []);

  const execAlignment = useCallback((align: string) => {
    document.execCommand(align, false);
  }, []);

  const execColor = useCallback((command: string, color: string) => {
    document.execCommand(command, false, color);
  }, []);

  const execLineSpacing = useCallback((value: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let block = range.startContainer as HTMLElement;
    if (block.nodeType === Node.TEXT_NODE) block = block.parentElement!;
    // Walk up to block-level
    while (block && !['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE'].includes(block.tagName)) {
      block = block.parentElement!;
    }
    if (block) {
      block.style.lineHeight = value;
    }
  }, []);

  const TEXT_COLORS = ['#000000', '#e53935', '#fb8c00', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#546e7a'];
  const HIGHLIGHT_COLORS = ['transparent', '#fff176', '#aed581', '#81d4fa', '#ce93d8', '#ef9a9a', '#ffcc80', '#e0e0e0'];

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting toolbar">
      {/* Font Family */}
      <div className="toolbar-group">
        <DropdownMenu trigger={<span className="toolbar-select-label">Font ▾</span>} className="toolbar-font-dropdown">
          {FONT_FAMILIES.map((f) => (
            <button key={f} className="toolbar-dropdown-item" onClick={() => execFont(f)} style={{ fontFamily: f }}>
              {f}
            </button>
          ))}
        </DropdownMenu>

        {/* Font Size */}
        <DropdownMenu trigger={<span className="toolbar-select-label">Size ▾</span>}>
          {FONT_SIZES.map((s) => (
            <button key={s} className="toolbar-dropdown-item" onClick={() => execFontSize(s)}>
              {s}pt
            </button>
          ))}
        </DropdownMenu>
      </div>

      <div className="toolbar-divider" />

      {/* B / I / U / H / List */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn fmt-bold ${formatState.bold ? 'active' : ''}`}
          onClick={() => onFormat('bold')}
          title="Bold (Ctrl+B)"
          aria-pressed={formatState.bold}
          aria-label="Bold"
        >
          B
        </button>
        <button
          className={`toolbar-btn fmt-italic ${formatState.italic ? 'active' : ''}`}
          onClick={() => onFormat('italic')}
          title="Italic (Ctrl+I)"
          aria-pressed={formatState.italic}
          aria-label="Italic"
        >
          I
        </button>
        <button
          className={`toolbar-btn fmt-underline ${formatState.underline ? 'active' : ''}`}
          onClick={() => onFormat('underline')}
          title="Underline (Ctrl+U)"
          aria-pressed={formatState.underline}
          aria-label="Underline"
        >
          U
        </button>
        <button
          className={`toolbar-btn ${formatState.heading ? 'active' : ''}`}
          onClick={onHeading}
          title="Heading"
          aria-pressed={formatState.heading}
          aria-label="Heading"
        >
          H
        </button>
        <button
          className={`toolbar-btn ${formatState.list ? 'active' : ''}`}
          onClick={() => onFormat('insertUnorderedList')}
          title="Bullet List"
          aria-pressed={formatState.list}
          aria-label="Bullet List"
        >
          ☰
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Text Color */}
      <div className="toolbar-group">
        <DropdownMenu trigger={<span title="Text Color">A<span style={{ display: 'block', height: 3, background: '#e53935', borderRadius: 1 }} /></span>}>
          <div className="toolbar-color-grid">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                className="toolbar-color-swatch"
                style={{ background: c }}
                onClick={() => execColor('foreColor', c)}
                title={c}
              />
            ))}
          </div>
        </DropdownMenu>

        {/* Highlight Color */}
        <DropdownMenu trigger={<span title="Highlight Color">🖍</span>}>
          <div className="toolbar-color-grid">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                className="toolbar-color-swatch"
                style={{ background: c === 'transparent' ? '#fff' : c, border: c === 'transparent' ? '2px dashed #ccc' : undefined }}
                onClick={() => execColor('hiliteColor', c)}
                title={c === 'transparent' ? 'None' : c}
              />
            ))}
          </div>
        </DropdownMenu>
      </div>

      <div className="toolbar-divider" />

      {/* Alignment */}
      <div className="toolbar-group">
        <button className="toolbar-btn toolbar-align-btn" onClick={() => execAlignment('justifyLeft')} title="Align Left" aria-label="Align Left"><span className="align-icon align-left">☰</span></button>
        <button className="toolbar-btn toolbar-align-btn" onClick={() => execAlignment('justifyCenter')} title="Align Center" aria-label="Align Center"><span className="align-icon align-center">☰</span></button>
        <button className="toolbar-btn toolbar-align-btn" onClick={() => execAlignment('justifyRight')} title="Align Right" aria-label="Align Right"><span className="align-icon align-right">☰</span></button>
        <button className="toolbar-btn toolbar-align-btn" onClick={() => execAlignment('justifyFull')} title="Justify" aria-label="Justify"><span className="align-icon align-justify">☰</span></button>
      </div>

      <div className="toolbar-divider" />

      {/* Line Spacing */}
      <div className="toolbar-group">
        <DropdownMenu trigger={<span title="Line Spacing">↕</span>}>
          {LINE_SPACINGS.map((ls) => (
            <button key={ls.value} className="toolbar-dropdown-item" onClick={() => execLineSpacing(ls.value)}>
              {ls.label}
            </button>
          ))}
        </DropdownMenu>
      </div>

      <div className="toolbar-divider" />

      {/* Table Insert */}
      <div className="toolbar-group">
        <DropdownMenu trigger={<span title="Insert Table">⊞</span>}>
          <div className="toolbar-table-insert">
            <label>
              Rows: <input type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(+e.target.value)} className="toolbar-table-input" />
            </label>
            <label>
              Cols: <input type="number" min={1} max={10} value={tableCols} onChange={(e) => setTableCols(+e.target.value)} className="toolbar-table-input" />
            </label>
            <button className="toolbar-table-insert-btn" onClick={() => onInsertTable(tableRows, tableCols)}>
              Insert Table
            </button>
          </div>
        </DropdownMenu>

        {/* Image Insert */}
        <button className="toolbar-btn" onClick={onInsertImage} title="Insert Image" aria-label="Insert Image">
          🖼
        </button>

        {/* Find & Replace */}
        <button className="toolbar-btn" onClick={onFindReplace} title="Find & Replace (Ctrl+H)" aria-label="Find & Replace">
          🔍
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Undo / Redo */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onUndo} title="Undo (Ctrl+Z)" aria-label="Undo">↩</button>
        <button className="toolbar-btn" onClick={onRedo} title="Redo (Ctrl+Y)" aria-label="Redo">↪</button>
      </div>

      <div className="toolbar-divider" />

      {/* Export */}
      <div className="toolbar-group">
        <DropdownMenu trigger={<span title="Export">📥 Export ▾</span>}>
          <button className="toolbar-dropdown-item" onClick={() => onExport('docx')}>Export as .docx</button>
          <button className="toolbar-dropdown-item" onClick={() => onExport('html')}>Export as .html</button>
          <button className="toolbar-dropdown-item" onClick={() => onExport('md')}>Export as .md</button>
          <button className="toolbar-dropdown-item" onClick={() => onExport('pdf')}>Export as .pdf</button>
        </DropdownMenu>
      </div>
    </div>
  );
}
