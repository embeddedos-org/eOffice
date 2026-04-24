import React, { useState } from 'react';
import type { Note, Notebook } from '../App';

interface NoteListProps {
  notes: Note[];
  notebooks: Notebook[];
  selectedNoteId: string | null;
  selectedSectionId: string | null;
  searchQuery: string;
  sortBy: 'date' | 'title' | 'modified';
  onSortChange: (sort: 'date' | 'title' | 'modified') => void;
  onSearchChange: (query: string) => void;
  onSelectNote: (id: string) => void;
  onSelectSection: (id: string | null) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onAddNotebook: (name: string) => void;
  onAddSection: (notebookId: string, name: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function getPreview(content: string, maxLen = 80): string {
  const text = content.replace(/\n/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

export default function NoteList({
  notes,
  notebooks,
  selectedNoteId,
  selectedSectionId,
  searchQuery,
  sortBy,
  onSortChange,
  onSearchChange,
  onSelectNote,
  onSelectSection,
  onCreateNote,
  onDeleteNote,
  onTogglePin,
  onAddNotebook,
  onAddSection,
}: NoteListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set(notebooks.map((nb) => nb.id)),
  );

  const toggleNotebook = (id: string) => {
    setExpandedNotebooks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      onDeleteNote(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handlePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onTogglePin(id);
  };

  const handleAddNotebook = () => {
    const name = prompt('Notebook name:');
    if (name?.trim()) onAddNotebook(name.trim());
  };

  const handleAddSection = (e: React.MouseEvent, notebookId: string) => {
    e.stopPropagation();
    const name = prompt('Section name:');
    if (name?.trim()) onAddSection(notebookId, name.trim());
  };

  return (
    <aside className="note-list-panel">
      <div className="note-list-header">
        <h1 className="app-title">📝 eNotes</h1>
        <div className="note-list-header-actions">
          <button className="btn-new-note" onClick={onCreateNote} title="New Note">
            +
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search notes…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => onSearchChange('')}>
            ×
          </button>
        )}
      </div>

      {/* Sort & Notebook controls */}
      <div className="list-controls">
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'date' | 'title' | 'modified')}
        >
          <option value="modified">Modified</option>
          <option value="date">Created</option>
          <option value="title">Title</option>
        </select>
        <button className="btn-icon" onClick={handleAddNotebook} title="New Notebook">
          📓+
        </button>
        <button
          className={`btn-icon ${!selectedSectionId ? 'active' : ''}`}
          onClick={() => onSelectSection(null)}
          title="All Notes"
        >
          All
        </button>
      </div>

      {/* Notebook / Section Hierarchy */}
      <div className="notebook-tree">
        {notebooks.map((nb) => (
          <div key={nb.id} className="notebook-item">
            <div className="notebook-header" onClick={() => toggleNotebook(nb.id)}>
              <span className="notebook-expand">{expandedNotebooks.has(nb.id) ? '▾' : '▸'}</span>
              <span className="notebook-name">📓 {nb.name}</span>
              <button
                className="btn-icon btn-add-section"
                onClick={(e) => handleAddSection(e, nb.id)}
                title="Add Section"
              >
                +
              </button>
            </div>
            {expandedNotebooks.has(nb.id) && (
              <div className="section-list">
                {nb.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className={`section-item ${selectedSectionId === sec.id ? 'active' : ''}`}
                    onClick={() => onSelectSection(sec.id)}
                  >
                    <span className="section-color-dot" style={{ background: sec.color }} />
                    <span className="section-name">{sec.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Note list */}
      <div className="note-list-scroll">
        {notes.length === 0 ? (
          <div className="note-list-empty">
            {searchQuery ? 'No matching notes.' : 'No notes yet. Create one!'}
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`note-list-item ${selectedNoteId === note.id ? 'selected' : ''} ${note.pinned ? 'pinned' : ''}`}
              onClick={() => onSelectNote(note.id)}
            >
              <div className="note-item-header">
                <span className="note-item-title">
                  {note.pinned && <span className="pin-icon">📌 </span>}
                  {note.title || 'Untitled Note'}
                </span>
                <span className="note-item-date">{formatDate(note.updatedAt)}</span>
              </div>
              <div className="note-item-preview">
                {getPreview(note.content) || 'Empty note'}
              </div>
              {note.tags.length > 0 && (
                <div className="note-item-tags">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag-mini">
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="tag-mini tag-more">+{note.tags.length - 3}</span>
                  )}
                </div>
              )}
              <div className="note-item-actions">
                <button
                  className="btn-icon"
                  onClick={(e) => handlePin(e, note.id)}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  {note.pinned ? '📌' : '📍'}
                </button>
                <button
                  className={`btn-icon btn-delete ${deleteConfirmId === note.id ? 'confirm' : ''}`}
                  onClick={(e) => handleDelete(e, note.id)}
                  title={deleteConfirmId === note.id ? 'Click again to confirm' : 'Delete'}
                >
                  {deleteConfirmId === note.id ? '⚠️' : '🗑️'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
