import { useState, useCallback, useRef, useEffect } from 'react';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import DocumentSidebar, { DocMeta, TEMPLATES } from './components/DocumentSidebar';
import { useEBot } from './hooks/useEBot';
import { useCollab } from './hooks/useCollab';
import { API_URL, apiClient, getUser } from '../../shared/config';
import { LoginScreen } from '../../shared/LoginScreen';
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

function saveDocumentsLocal(docs: DocMeta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function EdocsApp() {
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
  const isRemoteUpdate = useRef(false);

  const { connected: ebotConnected, loading: isLoading, summarize, rewrite, grammarCheck, translate } = useEBot();

  const user = getUser();
  const collab = useCollab({
    docId: activeDocId || 'default',
    userName: user?.username || 'Anonymous',
  });

  // Load documents from server on mount, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    async function fetchDocs() {
      try {
        const serverDocs = await apiClient<DocMeta[]>('/api/documents');
        if (!cancelled && serverDocs.length > 0) {
          setDocuments(serverDocs);
          saveDocumentsLocal(serverDocs);
        }
      } catch {
        // Server unavailable — localStorage data already loaded
      }
    }
    fetchDocs();
    return () => { cancelled = true; };
  }, []);

  // Persist documents to localStorage whenever they change
  useEffect(() => {
    saveDocumentsLocal(documents);
  }, [documents]);

  // Save documents to server whenever they change
  useEffect(() => {
    async function syncToServer() {
      try {
        for (const doc of documents) {
          await apiClient(`/api/documents/${doc.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              title: doc.title,
              content: doc.content || '',
            }),
          }).catch(() => {
            // Document may not exist on server yet — create it
            apiClient('/api/documents', {
              method: 'POST',
              body: JSON.stringify({
                title: doc.title,
                content: doc.content || '',
                app_id: 'edocs',
              }),
            }).catch(() => {});
          });
        }
      } catch {
        // Server unavailable — localStorage is the fallback
      }
    }
    if (documents.length > 0) {
      syncToServer();
    }
  }, [documents]);

  // Wire remote edits from collaborators
  useEffect(() => {
    if (!collab.connected) return;
    const unsubscribe = collab.onRemoteEdit((remoteHtml: string) => {
      if (editorRef.current) {
        isRemoteUpdate.current = true;
        editorRef.current.innerHTML = remoteHtml;
        setContent(editorRef.current.innerText || '');
        computeStats(editorRef.current.innerText || '');
        isRemoteUpdate.current = false;
      }
    });
    return unsubscribe;
  }, [collab.connected, collab.onRemoteEdit]);

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

      // Send edit to collaborators (skip if this was a remote update)
      if (!isRemoteUpdate.current && collab.connected) {
        collab.sendEdit(editorRef.current?.innerHTML || '');
      }

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        setAutoSaveStatus('saving');
        persistActiveDoc();
        setTimeout(() => setAutoSaveStatus('saved'), 600);
      }, 1500);
    },
    [computeStats, persistActiveDoc, collab.connected, collab.sendEdit]
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

  // Collaborate button handler
  const handleCollaborate = useCallback(() => {
    if (collab.connected) {
      collab.disconnect();
    } else {
      collab.connect(editorRef.current?.innerHTML || '');
    }
  }, [collab.connected, collab.connect, collab.disconnect]);

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
      >
        {/* Collaborate button and connected users */}
        <button
          className={`collab-btn ${collab.connected ? 'active' : ''}`}
          onClick={handleCollaborate}
          title={collab.connected ? 'Disconnect collaboration' : 'Start collaboration'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '6px',
            border: collab.connected ? '1px solid #34d399' : '1px solid #555',
            background: collab.connected ? 'rgba(52,211,153,0.15)' : 'transparent',
            color: collab.connected ? '#34d399' : '#aaa',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          {collab.connected ? 'Live' : 'Collaborate'}
        </button>
        {collab.connected && collab.users.length > 0 && (
          <div
            className="collab-users"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}
          >
            {collab.users.map((u) => (
              <span
                key={u.id}
                title={u.name}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: u.color,
                  display: 'inline-block',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        )}
      </TopBar>
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

export default function App() {
  return (
    <LoginScreen appName="eDocs" appIcon="📝">
      <EdocsApp />
    </LoginScreen>
  );
}
