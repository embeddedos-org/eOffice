import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type DocumentType = 'writer' | 'calc' | 'impress' | 'pdf';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  content: string;
  createdAt: string;
  modifiedAt: string;
  size: number;
  starred: boolean;
  tags: string[];
  collaborators: Collaborator[];
  version: number;
  isShared: boolean;
  shareUrl?: string;
  thumbnail?: string;
  language: string;
  wordCount?: number;
  pageCount?: number;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  online: boolean;
  color: string;
  cursor?: { x: number; y: number };
}

export interface RecentDocument {
  id: string;
  title: string;
  type: DocumentType;
  modifiedAt: string;
  thumbnail?: string;
}

interface DocumentStore {
  documents: Document[];
  recentDocuments: RecentDocument[];
  currentDocument: Document | null;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;

  // Actions
  initializeStore: () => void;
  createDocument: (type: DocumentType, title?: string) => Document;
  openDocument: (id: string) => void;
  saveDocument: (id: string, content: string) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, title: string) => void;
  duplicateDocument: (id: string) => Document;
  starDocument: (id: string) => void;
  setCurrentDocument: (doc: Document | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  addToRecent: (doc: RecentDocument) => void;
  clearRecent: () => void;
  exportDocument: (id: string, format: string) => Promise<void>;
  shareDocument: (id: string) => Promise<string>;
  searchDocuments: (query: string) => Document[];
}

const generateId = () => `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const COLLABORATOR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];

export const useDocumentStore = create<DocumentStore>()(
  persist(
    immer((set, get) => ({
      documents: [],
      recentDocuments: [],
      currentDocument: null,
      isLoading: false,
      isSaving: false,
      hasUnsavedChanges: false,
      autoSaveEnabled: true,
      autoSaveInterval: 30000,

      initializeStore: () => {
        // Initialize with sample documents if empty
        const { documents } = get();
        if (documents.length === 0) {
          const sampleDocs: Document[] = [
            {
              id: 'sample_writer_1',
              title: 'Welcome to eOffice Writer',
              type: 'writer',
              content: '<h1>Welcome to eOffice Writer</h1><p>The most powerful document editor in the world. Start typing to create your document.</p>',
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
              size: 1024,
              starred: true,
              tags: ['welcome', 'sample'],
              collaborators: [],
              version: 1,
              isShared: false,
              language: 'en',
              wordCount: 20,
              pageCount: 1
            },
            {
              id: 'sample_calc_1',
              title: 'Budget 2024',
              type: 'calc',
              content: JSON.stringify({ sheets: [{ name: 'Sheet1', data: [] }] }),
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
              size: 2048,
              starred: false,
              tags: ['finance', 'budget'],
              collaborators: [],
              version: 1,
              isShared: false,
              language: 'en'
            },
            {
              id: 'sample_impress_1',
              title: 'Q4 Presentation',
              type: 'impress',
              content: JSON.stringify({ slides: [] }),
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
              size: 4096,
              starred: false,
              tags: ['presentation', 'quarterly'],
              collaborators: [],
              version: 1,
              isShared: false,
              language: 'en',
              pageCount: 5
            }
          ];
          set((state) => { state.documents = sampleDocs; });
        }
      },

      createDocument: (type, title) => {
        const id = generateId();
        const defaultTitles = { writer: 'Untitled Document', calc: 'Untitled Spreadsheet', impress: 'Untitled Presentation', pdf: 'Untitled PDF' };
        const newDoc: Document = {
          id,
          title: title || defaultTitles[type],
          type,
          content: type === 'writer' ? '<p></p>' : type === 'calc' ? JSON.stringify({ sheets: [{ name: 'Sheet1', data: [] }] }) : JSON.stringify({ slides: [{ id: 'slide_1', elements: [], background: '#ffffff' }] }),
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          size: 0,
          starred: false,
          tags: [],
          collaborators: [],
          version: 1,
          isShared: false,
          language: 'en'
        };
        set((state) => { state.documents.unshift(newDoc); state.currentDocument = newDoc; });
        get().addToRecent({ id, title: newDoc.title, type, modifiedAt: newDoc.modifiedAt });
        return newDoc;
      },

      openDocument: (id) => {
        const doc = get().documents.find(d => d.id === id);
        if (doc) {
          set((state) => { state.currentDocument = doc; });
          get().addToRecent({ id, title: doc.title, type: doc.type, modifiedAt: doc.modifiedAt });
        }
      },

      saveDocument: (id, content) => {
        set((state) => {
          state.isSaving = true;
          const doc = state.documents.find(d => d.id === id);
          if (doc) {
            doc.content = content;
            doc.modifiedAt = new Date().toISOString();
            doc.version += 1;
            doc.size = new Blob([content]).size;
            if (state.currentDocument?.id === id) {
              state.currentDocument = { ...doc };
            }
          }
          state.hasUnsavedChanges = false;
        });
        setTimeout(() => set((state) => { state.isSaving = false; }), 500);
      },

      deleteDocument: (id) => {
        set((state) => {
          state.documents = state.documents.filter(d => d.id !== id);
          if (state.currentDocument?.id === id) state.currentDocument = null;
          state.recentDocuments = state.recentDocuments.filter(d => d.id !== id);
        });
      },

      renameDocument: (id, title) => {
        set((state) => {
          const doc = state.documents.find(d => d.id === id);
          if (doc) { doc.title = title; doc.modifiedAt = new Date().toISOString(); }
          if (state.currentDocument?.id === id) state.currentDocument!.title = title;
          const recent = state.recentDocuments.find(d => d.id === id);
          if (recent) recent.title = title;
        });
      },

      duplicateDocument: (id) => {
        const doc = get().documents.find(d => d.id === id);
        if (!doc) throw new Error('Document not found');
        const newDoc: Document = { ...doc, id: generateId(), title: `${doc.title} (Copy)`, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), starred: false, version: 1 };
        set((state) => { state.documents.unshift(newDoc); });
        return newDoc;
      },

      starDocument: (id) => {
        set((state) => {
          const doc = state.documents.find(d => d.id === id);
          if (doc) doc.starred = !doc.starred;
        });
      },

      setCurrentDocument: (doc) => set((state) => { state.currentDocument = doc; }),
      setHasUnsavedChanges: (value) => set((state) => { state.hasUnsavedChanges = value; }),
      setAutoSave: (enabled) => set((state) => { state.autoSaveEnabled = enabled; }),

      addToRecent: (doc) => {
        set((state) => {
          state.recentDocuments = [doc, ...state.recentDocuments.filter(d => d.id !== doc.id)].slice(0, 20);
        });
      },

      clearRecent: () => set((state) => { state.recentDocuments = []; }),

      exportDocument: async (id, format) => {
        const doc = get().documents.find(d => d.id === id);
        if (!doc) return;
        // Export logic handled by individual app components
        console.log(`Exporting ${doc.title} as ${format}`);
      },

      shareDocument: async (id) => {
        const shareUrl = `https://eoffice.app/share/${id}`;
        set((state) => {
          const doc = state.documents.find(d => d.id === id);
          if (doc) { doc.isShared = true; doc.shareUrl = shareUrl; }
        });
        return shareUrl;
      },

      searchDocuments: (query) => {
        const { documents } = get();
        if (!query.trim()) return documents;
        const q = query.toLowerCase();
        return documents.filter(d =>
          d.title.toLowerCase().includes(q) ||
          d.tags.some(t => t.toLowerCase().includes(q)) ||
          d.content.toLowerCase().includes(q)
        );
      }
    })),
    { name: 'eoffice-documents', partialize: (state) => ({ documents: state.documents, recentDocuments: state.recentDocuments, autoSaveEnabled: state.autoSaveEnabled }) }
  )
);
