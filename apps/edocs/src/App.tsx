import { useState, useCallback, useRef, useEffect } from 'react';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import DocumentSidebar, { DocMeta, TEMPLATES } from './components/DocumentSidebar';
import { useEBot } from './hooks/useEBot';
import { API_URL } from '../../shared/config';
import { exportToDocx, exportToPdf, exportToHtml, exportToMarkdown } from '@eoffice/core/src/file-export';

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  heading: boolean;
  list: boolean;
}

const STORAGE_KEY = 'edocs-documents';

function loadDocuments(): DocMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDocuments(docs: DocMeta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function App() {
  const [documents, setDocuments] = useState<DocMeta[]>(() => loadDocuments());
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled Document');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [ebotSidebarOpen, setEbotSidebarOpen] = useState(false);
  const [docSidebarOpen, setDocSidebarOpen] = useState(false);
  const [ebotResponse, setEbotResponse] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    heading: false,
    list: false,
  });

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { connected: ebotConnected, loading: isLoading, summarize, rewrite, grammarCheck, translate } = useEBot();

  // Persist documents to localStorage whenever they change
  useEffect(() => {
    saveDocuments(documents);
  }, [documents]);

  const computeStats = useCallback((text: string) => {
    const trimmed = text.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    setWordCount(words);
    setCharCount(text.length);
  }, []);

  const persistActiveDoc = useCallback(() => {
    if (!activeDocId) return;
    const htmlContent = editorRef.current?.innerHTML || '';
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === activeDocId ? { ...d, title, content: htmlContent, lastModified: Date.now() } : d
      )
    );
  }, [activeDocId, title]);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      computeStats(newContent);
      setAutoSaveStatus('unsaved');

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        setAutoSaveStatus('saving');
        persistActiveDoc();
        setTimeout(() => setAutoSaveStatus('saved'), 600);
      }, 1500);
    },
    [computeStats, persistActiveDoc]
  );

  const handleFormat = useCallback((command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();

    setFormatState((prev) => {
      const key = command === 'insertUnorderedList' ? 'list' : command;
      if (key in prev) {
        return { ...prev, [key]: !prev[key as keyof FormatState] };
      }
      return prev;
    });
  }, []);

  const handleUndo = useCallback(() => {
    document.execCommand('undo', false);
    editorRef.current?.focus();
  }, []);

  const handleRedo = useCallback(() => {
    document.execCommand('redo', false);
    editorRef.current?.focus();
  }, []);

  const handleHeading = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      document.execCommand('formatBlock', false, formatState.heading ? 'p' : 'h2');
      setFormatState((prev) => ({ ...prev, heading: !prev.heading }));
    }
    editorRef.current?.focus();
  }, [formatState.heading]);

  // Export handlers
  const handleExport = useCallback(
    (format: 'docx' | 'html' | 'md' | 'pdf') => {
      const htmlContent = editorRef.current?.innerHTML || '';
      switch (format) {
        case 'docx':
          exportToDocx(title, htmlContent);
          break;
        case 'html':
          exportToHtml(title, htmlContent);
          break;
        case 'md':
          exportToMarkdown(title, htmlContent);
          break;
        case 'pdf':
          exportToPdf(title, htmlContent);
          break;
      }
    },
    [title]
  );

  // Table insertion
  const handleInsertTable = useCallback((rows: number, cols: number) => {
    let html = '<table class="editor-table"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += '<td>&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, html);
    editorRef.current?.focus();
  }, []);

  // Image insertion via file picker
  const handleInsertImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${dataUrl}" style="max-width:100%;height:auto;margin:8px 0;border-radius:4px;" />`
      );
      editorRef.current?.focus();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  // Find & Replace toggle
  const handleFindReplace = useCallback(() => {
    setShowFindReplace((prev) => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Document management
  const handleNewDocument = useCallback(
    (templateId?: string) => {
      // Save current doc first
      persistActiveDoc();

      const template = TEMPLATES.find((t) => t.id === templateId);
      const newDoc: DocMeta = {
        id: generateId(),
        title: template ? `${template.label} Document` : 'Untitled Document',
        content: template?.content || '',
        lastModified: Date.now(),
        template: templateId,
      };
      setDocuments((prev) => [...prev, newDoc]);
      setActiveDocId(newDoc.id);
      setTitle(newDoc.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = newDoc.content;
      }
      setContent(editorRef.current?.innerText || '');
      computeStats(editorRef.current?.innerText || '');
      setAutoSaveStatus('saved');
    },
    [persistActiveDoc, computeStats]
  );

  const handleOpenDocument = useCallback(
    (id: string) => {
      persistActiveDoc();
      const doc = documents.find((d) => d.id === id);
      if (!doc) return;
      setActiveDocId(doc.id);
      setTitle(doc.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = doc.content;
      }
      setContent(editorRef.current?.innerText || '');
      computeStats(editorRef.current?.innerText || '');
      setAutoSaveStatus('saved');
    },
    [documents, persistActiveDoc, computeStats]
  );

  const handleDeleteDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (activeDocId === id) {
        setActiveDocId(null);
        setTitle('Untitled Document');
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
        setContent('');
        setWordCount(0);
        setCharCount(0);
      }
    },
    [activeDocId]
  );

  const handleEBotAction = useCallback(
    async (action: string) => {
      if (!ebotConnected) return;

      setEbotResponse('');

      const plainText = editorRef.current?.innerText || content;

      if (!plainText.trim()) {
        setEbotResponse('⚠️ Document is empty. Add some content first.');
        return;
      }

      try {
        let response = '';

        switch (action) {
          case 'summarize':
            response = await summarize(plainText);
            response = `📋 **Summary**\n\n${response}`;
            break;

          case 'rewrite-formal':
            response = await rewrite(plainText, 'formal');
            response = `✍️ **Formal Rewrite**\n\n${response}`;
            break;

          case 'rewrite-casual':
            response = await rewrite(plainText, 'casual');
            response = `✍️ **Casual Rewrite**\n\n${response}`;
            break;

          case 'rewrite-concise':
            response = await rewrite(plainText, 'concise');
            response = `✍️ **Concise Rewrite**\n\n${response}`;
            break;

          case 'grammar':
            response = await grammarCheck(plainText);
            response = `✅ **Grammar Check**\n\n${response}`;
            break;

          case 'translate':
            response = await translate(plainText, 'Spanish');
            response = `🌐 **Translation (Spanish)**\n\n${response}`;
            break;

          default:
            response = `eBot processed your "${action}" request.`;
        }

        setEbotResponse(response);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setEbotResponse(`❌ **eBot Error**\n\n${msg}\n\nPlease check that the eBot server is running at ${API_URL}.`);
      }
    },
    [ebotConnected, content, summarize, rewrite, grammarCheck, translate]
  );

  const handleCursorChange = useCallback((line: number, col: number) => {
    setCursorPosition({ line, col });
  }, []);

  return (
    <div className="edocs-app">
      <TopBar
        title={title}
        onTitleChange={setTitle}
        ebotSidebarOpen={ebotSidebarOpen}
        onToggleEBot={() => setEbotSidebarOpen((prev) => !prev)}
        connected={ebotConnected}
        onToggleDocSidebar={() => setDocSidebarOpen((prev) => !prev)}
        docSidebarOpen={docSidebarOpen}
      />
      <Toolbar
        formatState={formatState}
        onFormat={handleFormat}
        onHeading={handleHeading}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        onInsertTable={handleInsertTable}
        onInsertImage={handleInsertImage}
        onFindReplace={handleFindReplace}
      />
      <div className="edocs-body">
        <DocumentSidebar
          open={docSidebarOpen}
          documents={documents}
          activeDocId={activeDocId}
          onNewDocument={handleNewDocument}
          onOpenDocument={handleOpenDocument}
          onDeleteDocument={handleDeleteDocument}
          onClose={() => setDocSidebarOpen(false)}
        />
        <Editor
          ref={editorRef}
          content={content}
          onChange={handleContentChange}
          onCursorChange={handleCursorChange}
          showFindReplace={showFindReplace}
          onCloseFindReplace={() => setShowFindReplace(false)}
        />
        <EBotSidebar
          open={ebotSidebarOpen}
          connected={ebotConnected}
          response={ebotResponse}
          isLoading={isLoading}
          onAction={handleEBotAction}
          onClose={() => setEbotSidebarOpen(false)}
        />
      </div>
      <StatusBar
        wordCount={wordCount}
        charCount={charCount}
        connected={ebotConnected}
        cursorPosition={cursorPosition}
        autoSaveStatus={autoSaveStatus}
      />
      {/* Hidden file input for image insertion */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageSelected}
      />
    </div>
  );
}
