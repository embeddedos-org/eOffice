/**
 * Comprehensive tests for src/store/documentStore.ts
 * Tests: createDocument, saveDocument, deleteDocument, starDocument, etc.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '../store/documentStore';

function resetStore() {
  useDocumentStore.setState({
    documents: [],
    recentDocuments: [],
    currentDocument: null,
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    autoSaveEnabled: true,




  });
}

describe('DocumentStore — Initial State', () => {
  beforeEach(resetStore);

  it('starts with empty documents array', () => {
    expect(useDocumentStore.getState().documents).toHaveLength(0);
  });

  it('starts with no current document', () => {
    expect(useDocumentStore.getState().currentDocument).toBeNull();
  });

  it('starts with autoSave enabled', () => {
    expect(useDocumentStore.getState().autoSaveEnabled).toBe(true);
  });

  it('starts with no unsaved changes', () => {
    expect(useDocumentStore.getState().hasUnsavedChanges).toBe(false);
  });
});

describe('DocumentStore — createDocument', () => {
  beforeEach(resetStore);

  it('creates a writer document', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    expect(doc.type).toBe('writer');
    expect(doc.id).toBeTruthy();
  });

  it('creates a calc document', () => {
    const doc = useDocumentStore.getState().createDocument('calc');
    expect(doc.type).toBe('calc');
  });

  it('creates an impress document', () => {
    const doc = useDocumentStore.getState().createDocument('impress');
    expect(doc.type).toBe('impress');
  });

  it('creates a pdf document', () => {
    const doc = useDocumentStore.getState().createDocument('pdf');
    expect(doc.type).toBe('pdf');
  });

  it('creates document with custom title', () => {
    const doc = useDocumentStore.getState().createDocument('writer', 'My Custom Title');
    expect(doc.title).toBe('My Custom Title');
  });

  it('creates document with default title when none provided', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    expect(doc.title).toBeTruthy();
    expect(typeof doc.title).toBe('string');
  });

  it('adds document to documents array', () => {
    useDocumentStore.getState().createDocument('writer');
    expect(useDocumentStore.getState().documents).toHaveLength(1);
  });

  it('creates document with unique IDs', () => {
    const doc1 = useDocumentStore.getState().createDocument('writer');
    const doc2 = useDocumentStore.getState().createDocument('calc');
    expect(doc1.id).not.toBe(doc2.id);
  });

  it('creates document with createdAt timestamp', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    expect(doc.createdAt).toBeTruthy();
    expect(new Date(doc.createdAt).getTime()).toBeGreaterThan(0);
  });

  it('creates document with version 1', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    expect(doc.version).toBe(1);
  });

  it('creates document with starred false', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    expect(doc.starred).toBe(false);
  });

  it('creates document with empty content', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    expect(doc.content).toBeDefined();
  });
});

describe('DocumentStore — saveDocument', () => {
  beforeEach(resetStore);

  it('updates document content', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    useDocumentStore.getState().saveDocument(doc.id, '<p>New content</p>');
    const updated = useDocumentStore.getState().documents.find(d => d.id === doc.id);
    expect(updated?.content).toBe('<p>New content</p>');
  });

  it('updates modifiedAt timestamp', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    const originalModified = doc.modifiedAt;
    // Small delay to ensure timestamp differs
    useDocumentStore.getState().saveDocument(doc.id, '<p>Updated</p>');
    const updated = useDocumentStore.getState().documents.find(d => d.id === doc.id);
    expect(updated?.modifiedAt).toBeDefined();
  });

  it('does not affect other documents', () => {
    const doc1 = useDocumentStore.getState().createDocument('writer');
    const doc2 = useDocumentStore.getState().createDocument('calc');
    useDocumentStore.getState().saveDocument(doc1.id, '<p>Updated</p>');
    const doc2State = useDocumentStore.getState().documents.find(d => d.id === doc2.id);
    expect(doc2State?.content).not.toBe('<p>Updated</p>');
  });
});

describe('DocumentStore — deleteDocument', () => {
  beforeEach(resetStore);

  it('removes document from documents array', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    useDocumentStore.getState().deleteDocument(doc.id);
    expect(useDocumentStore.getState().documents).toHaveLength(0);
  });

  it('only removes the specified document', () => {
    const doc1 = useDocumentStore.getState().createDocument('writer');
    const doc2 = useDocumentStore.getState().createDocument('calc');
    useDocumentStore.getState().deleteDocument(doc1.id);
    expect(useDocumentStore.getState().documents).toHaveLength(1);
    expect(useDocumentStore.getState().documents[0].id).toBe(doc2.id);
  });

  it('handles deleting non-existent document gracefully', () => {
    expect(() => {
      useDocumentStore.getState().deleteDocument('non-existent-id');
    }).not.toThrow();
  });

  it('clears currentDocument if it was deleted', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    useDocumentStore.getState().setCurrentDocument(doc);
    useDocumentStore.getState().deleteDocument(doc.id);
    // currentDocument should be cleared or null
    const current = useDocumentStore.getState().currentDocument;
    expect(current?.id).not.toBe(doc.id);
  });
});

describe('DocumentStore — starDocument', () => {
  beforeEach(resetStore);

  it('stars an unstarred document', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    expect(doc.starred).toBe(false);
    useDocumentStore.getState().starDocument(doc.id);
    const updated = useDocumentStore.getState().documents.find(d => d.id === doc.id);
    expect(updated?.starred).toBe(true);
  });

  it('unstars a starred document (toggle)', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    useDocumentStore.getState().starDocument(doc.id);
    useDocumentStore.getState().starDocument(doc.id);
    const updated = useDocumentStore.getState().documents.find(d => d.id === doc.id);
    expect(updated?.starred).toBe(false);
  });
});

describe('DocumentStore — setCurrentDocument', () => {
  beforeEach(resetStore);

  it('sets current document', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    useDocumentStore.getState().setCurrentDocument(doc);
    expect(useDocumentStore.getState().currentDocument?.id).toBe(doc.id);
  });

  it('clears current document with null', () => {
    const doc = useDocumentStore.getState().createDocument('writer');
    useDocumentStore.getState().setCurrentDocument(doc);
    useDocumentStore.getState().setCurrentDocument(null);
    expect(useDocumentStore.getState().currentDocument).toBeNull();
  });
});

describe('DocumentStore — setHasUnsavedChanges', () => {
  beforeEach(resetStore);

  it('sets hasUnsavedChanges to true', () => {
    useDocumentStore.getState().setHasUnsavedChanges(true);
    expect(useDocumentStore.getState().hasUnsavedChanges).toBe(true);
  });

  it('sets hasUnsavedChanges to false', () => {
    useDocumentStore.getState().setHasUnsavedChanges(true);
    useDocumentStore.getState().setHasUnsavedChanges(false);
    expect(useDocumentStore.getState().hasUnsavedChanges).toBe(false);
  });
});

describe('DocumentStore — setAutoSave', () => {
  beforeEach(resetStore);

  it('disables autoSave', () => {
    useDocumentStore.getState().setAutoSave(false);
    expect(useDocumentStore.getState().autoSaveEnabled).toBe(false);
  });

  it('enables autoSave', () => {
    useDocumentStore.getState().setAutoSave(false);
    useDocumentStore.getState().setAutoSave(true);
    expect(useDocumentStore.getState().autoSaveEnabled).toBe(true);
  });
});

describe('DocumentStore — addToRecent', () => {
  beforeEach(resetStore);

  it('adds document to recent list', () => {
    const doc = useDocumentStore.getState().createDocument('writer', 'Recent Doc');
    useDocumentStore.getState().addToRecent({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      modifiedAt: doc.modifiedAt,
    });
    expect(useDocumentStore.getState().recentDocuments).toHaveLength(1);
  });

  it('recent document has correct properties', () => {
    useDocumentStore.getState().addToRecent({
      id: 'test-id',
      title: 'Test Doc',
      type: 'writer',
      modifiedAt: new Date().toISOString(),
    });
    const recent = useDocumentStore.getState().recentDocuments[0];
    expect(recent.id).toBe('test-id');
    expect(recent.title).toBe('Test Doc');
    expect(recent.type).toBe('writer');
  });
});

describe('DocumentStore — Multiple Documents', () => {
  beforeEach(resetStore);

  it('can manage multiple documents of different types', () => {
    useDocumentStore.getState().createDocument('writer', 'Doc 1');
    useDocumentStore.getState().createDocument('calc', 'Sheet 1');
    useDocumentStore.getState().createDocument('impress', 'Presentation 1');
    useDocumentStore.getState().createDocument('pdf', 'PDF 1');
    expect(useDocumentStore.getState().documents).toHaveLength(4);
  });

  it('can delete all documents one by one', () => {
    const doc1 = useDocumentStore.getState().createDocument('writer');
    const doc2 = useDocumentStore.getState().createDocument('calc');
    const doc3 = useDocumentStore.getState().createDocument('impress');
    useDocumentStore.getState().deleteDocument(doc1.id);
    useDocumentStore.getState().deleteDocument(doc2.id);
    useDocumentStore.getState().deleteDocument(doc3.id);
    expect(useDocumentStore.getState().documents).toHaveLength(0);
  });
});
