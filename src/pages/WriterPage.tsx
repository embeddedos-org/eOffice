import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Typography from '@tiptap/extension-typography';
import FontFamily from '@tiptap/extension-font-family';
import { useDocumentStore } from '@store/documentStore';
import WriterToolbar from '@components/editor/WriterToolbar';
import WriterSidebar from '@components/editor/WriterSidebar';
import WriterStatusBar from '@components/editor/WriterStatusBar';
import AIPanel from '@components/ai/AIPanel';
import CollaborationPanel from '@components/collaboration/CollaborationPanel';
import toast from 'react-hot-toast';

export default function WriterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    documents, currentDocument, createDocument, openDocument,
    saveDocument, setHasUnsavedChanges, autoSaveEnabled
  } = useDocumentStore();

  const [showAI, setShowAI] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const docRef = useRef(currentDocument);
  docRef.current = currentDocument;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      Placeholder.configure({ placeholder: t('editor.placeholder', { defaultValue: 'Start typing your document...' }) }),
      Subscript,
      Superscript,
      Typography,
      FontFamily
    ],
    content: currentDocument?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      setHasUnsavedChanges(true);
      if (autoSaveEnabled && docRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          saveDocument(docRef.current!.id, editor.getHTML());
          toast.success(t('file.autoSaved'), { duration: 1500, icon: '💾' });
        }, 3000);
      }
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none',
        spellcheck: 'true'
      }
    }
  });

  useEffect(() => {
    if (id) {
      const doc = documents.find(d => d.id === id);
      if (doc) {
        openDocument(id);
        editor?.commands.setContent(doc.content);
      } else {
        navigate('/writer');
      }
    } else {
      const newDoc = createDocument('writer');
      navigate(`/writer/${newDoc.id}`, { replace: true });
    }
  }, [id]);

  useEffect(() => {
    if (currentDocument && editor) {
      const currentContent = editor.getHTML();
      if (currentContent !== currentDocument.content) {
        editor.commands.setContent(currentDocument.content);
      }
    }
  }, [currentDocument?.id]);

  const handleSave = useCallback(() => {
    if (currentDocument && editor) {
      saveDocument(currentDocument.id, editor.getHTML());
      toast.success(t('file.saved'), { icon: '✅' });
    }
  }, [currentDocument, editor, saveDocument, t]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (!editor) return null;

  return (
    <div className={`flex flex-col h-full bg-surface-100 dark:bg-surface-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <WriterToolbar
        editor={editor}
        document={currentDocument}
        onSave={handleSave}
        onToggleAI={() => setShowAI(!showAI)}
        onToggleCollab={() => setShowCollab(!showCollab)}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        zoom={zoom}
        onZoomChange={setZoom}
        isFullscreen={isFullscreen}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document sidebar */}
        {showSidebar && (
          <WriterSidebar editor={editor} document={currentDocument} />
        )}

        {/* Editor canvas */}
        <div className="flex-1 overflow-auto bg-surface-200 dark:bg-surface-800 p-4 md:p-8">
          <div
            className="doc-page"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* AI Panel */}
        {showAI && (
          <AIPanel
            editor={editor}
            document={currentDocument}
            onClose={() => setShowAI(false)}
          />
        )}

        {/* Collaboration Panel */}
        {showCollab && (
          <CollaborationPanel
            document={currentDocument}
            onClose={() => setShowCollab(false)}
          />
        )}
      </div>

      {/* Status bar */}
      <WriterStatusBar editor={editor} document={currentDocument} />
    </div>
  );
}
