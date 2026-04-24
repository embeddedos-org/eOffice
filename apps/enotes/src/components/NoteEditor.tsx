import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Note } from '../App';

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre class="code-block" data-lang="${lang}"><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Checkboxes
  html = html.replace(/^\[x\]\s*(.*)/gm, '<div class="checkbox-item checked"><input type="checkbox" checked disabled/> <span class="cb-done">$1</span></div>');
  html = html.replace(/^\[ \]\s*(.*)/gm, '<div class="checkbox-item"><input type="checkbox" disabled/> $1</div>');

  // Headers
  html = html.replace(/^### (.*)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)/gm, '<h1>$1</h1>');

  // Bold / Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^- (.*)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}

export default function NoteEditor({ note, onUpdate }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagInput, setTagInput] = useState('');
  const [viewMode, setViewMode] = useState<'raw' | 'rendered'>('raw');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTagInput('');
  }, [note.id, note.title, note.content]);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.max(ta.scrollHeight, 300)}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [content, autoResize]);

  const debouncedUpdate = useCallback(
    (field: 'title' | 'content', value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(note.id, { [field]: value });
      }, 400);
    },
    [note.id, onUpdate],
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    debouncedUpdate('title', val);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    debouncedUpdate('content', val);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !note.tags.includes(tag)) {
      onUpdate(note.id, { tags: [...note.tags, tag] });
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tag: string) => {
    onUpdate(note.id, { tags: note.tags.filter((t) => t !== tag) });
  };

  // ── Insert helpers ──
  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newContent = content.slice(0, start) + text + content.slice(end);
    setContent(newContent);
    debouncedUpdate('content', newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const insertCheckbox = () => insertAtCursor('\n[ ] ');

  const insertTable = () => {
    insertAtCursor('\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n');
  };

  const insertCodeBlock = () => insertAtCursor('\n```\ncode here\n```\n');

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        insertAtCursor(`\n![${file.name}](${reader.result})\n`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle paste for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            insertAtCursor(`\n![pasted-image](${reader.result})\n`);
          }
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const lastModified = new Date(note.updatedAt).toLocaleString();

  return (
    <div className="note-editor">
      <input
        type="text"
        className="note-title-input"
        placeholder="Note title…"
        value={title}
        onChange={handleTitleChange}
        autoFocus
      />

      <div className="tag-bar">
        {note.tags.map((tag) => (
          <span key={tag} className="tag-pill">
            {tag}
            <button className="tag-remove" onClick={() => removeTag(tag)}>
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className="tag-input"
          placeholder="Add tag…"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={addTag}
        />
      </div>

      {/* Editor toolbar */}
      <div className="editor-toolbar">
        <button className="editor-toolbar-btn" onClick={insertCheckbox} title="Insert Checkbox">
          ☐ Checkbox
        </button>
        <button className="editor-toolbar-btn" onClick={insertTable} title="Insert Table">
          ⊞ Table
        </button>
        <button className="editor-toolbar-btn" onClick={insertCodeBlock} title="Insert Code Block">
          {'</>'} Code
        </button>
        <button className="editor-toolbar-btn" onClick={handleImageUpload} title="Insert Image">
          🖼 Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div className="editor-toolbar-spacer" />
        <button
          className={`editor-toolbar-btn ${viewMode === 'rendered' ? 'active' : ''}`}
          onClick={() => setViewMode((v) => (v === 'raw' ? 'rendered' : 'raw'))}
          title="Toggle Markdown Preview"
        >
          {viewMode === 'raw' ? '👁 Preview' : '✏️ Edit'}
        </button>
      </div>

      {viewMode === 'raw' ? (
        <textarea
          ref={textareaRef}
          className="note-content-input"
          placeholder="Start writing… (supports markdown, [ ] for checkboxes, ``` for code blocks)"
          value={content}
          onChange={handleContentChange}
          onPaste={handlePaste}
        />
      ) : (
        <div
          className="note-content-rendered"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}

      <div className="editor-footer">
        <span className="last-modified">Last modified: {lastModified}</span>
        <span className="char-count">{content.length} chars</span>
      </div>
    </div>
  );
}
