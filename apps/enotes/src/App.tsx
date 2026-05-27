import { useState, useCallback, useEffect } from 'react';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import EBotPanel from './components/EBotPanel';
import { LoginScreen } from '../../shared/LoginScreen';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  notebookId?: string;
  sectionId?: string;
}

export interface Section {
  id: string;
  name: string;
  color: string;
  notebookId: string;
}

export interface Notebook {
  id: string;
  name: string;
  sections: Section[];
}

const STORAGE_KEY = 'enotes-data';
const NOTEBOOKS_KEY = 'enotes-notebooks';

const SECTION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function loadNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: 'nb-default',
      name: 'My Notebook',
      sections: [
        { id: 'sec-general', name: 'General', color: SECTION_COLORS[0], notebookId: 'nb-default' },
      ],
    },
  ];
}

function saveNotebooks(notebooks: Notebook[]): void {
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

function EnotesApp() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [notebooks, setNotebooks] = useState<Notebook[]>(loadNotebooks);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'modified'>('modified');
  const [ebotPanelOpen, setEbotPanelOpen] = useState(false);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    saveNotebooks(notebooks);
  }, [notebooks]);

  const createNote = useCallback(() => {
    const now = Date.now();
    const newNote: Note = {
      id: generateId(),
      title: '',
      content: '',
      tags: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
      sectionId: selectedSectionId || undefined,
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
  }, [selectedSectionId]);

  const updateNote = useCallback((id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n,
      ),
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedNoteId((prev) => (prev === id ? null : prev));
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n,
      ),
    );
  }, []);

  const addNotebook = useCallback((name: string) => {
    const nb: Notebook = {
      id: generateId(),
      name,
      sections: [
        { id: generateId(), name: 'General', color: SECTION_COLORS[0], notebookId: '' },
      ],
    };
    nb.sections[0].notebookId = nb.id;
    setNotebooks((prev) => [...prev, nb]);
  }, []);

  const addSection = useCallback((notebookId: string, name: string) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== notebookId) return nb;
        const color = SECTION_COLORS[nb.sections.length % SECTION_COLORS.length];
        return {
          ...nb,
          sections: [...nb.sections, { id: generateId(), name, color, notebookId }],
        };
      }),
    );
  }, []);

  const filteredNotes = notes
    .filter((n) => {
      if (selectedSectionId && n.sectionId !== selectedSectionId) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sortBy) {
        case 'title':
          return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
        case 'date':
          return b.createdAt - a.createdAt;
        case 'modified':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  return (
    <div className="enotes-app">
      <NoteList
        notes={filteredNotes}
        notebooks={notebooks}
        selectedNoteId={selectedNoteId}
        selectedSectionId={selectedSectionId}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onSearchChange={setSearchQuery}
        onSelectNote={setSelectedNoteId}
        onSelectSection={setSelectedSectionId}
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
        onTogglePin={togglePin}
        onAddNotebook={addNotebook}
        onAddSection={addSection}
      />
      <div className="editor-area">
        {selectedNote ? (
          <>
            <NoteEditor note={selectedNote} onUpdate={updateNote} />
            <EBotPanel
              note={selectedNote}
              isOpen={ebotPanelOpen}
              onToggle={() => setEbotPanelOpen((o) => !o)}
              onApplyTags={(tags) =>
                updateNote(selectedNote.id, {
                  tags: [...new Set([...selectedNote.tags, ...tags])],
                })
              }
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h2>Welcome to eNotes</h2>
            <p>Select a note or create a new one to get started.</p>
            <button className="btn-primary" onClick={createNote}>
              + New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


export default function App() {
  return (
    <LoginScreen appName="eNotes" appIcon="📒">
      <EnotesApp />
    </LoginScreen>
  );
}
