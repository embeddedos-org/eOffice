import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, Printer, Search, RotateCw, Maximize2, FileText, Bookmark, Highlighter, MessageSquare, Scissors, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import AIPanel from '@components/ai/AIPanel';
import toast from 'react-hot-toast';
import { cn } from '@utils/cn';

interface PDFAnnotation {
  id: string;
  type: 'highlight' | 'note' | 'underline' | 'strikethrough';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  content: string;
  createdAt: string;
}

interface PDFBookmark {
  id: string;
  title: string;
  page: number;
  createdAt: string;
}

export default function PDFPage() {
  const { t } = useTranslation();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'thumbnails' | 'bookmarks' | 'annotations'>('thumbnails');
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [bookmarks, setBookmarks] = useState<PDFBookmark[]>([]);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setCurrentPage(1);
      toast.success(`Loaded: ${file.name}`);
    } else {
      toast.error('Please upload a PDF file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    noClick: !!pdfUrl
  });

  const addBookmark = () => {
    const bookmark: PDFBookmark = {
      id: Date.now().toString(),
      title: `Page ${currentPage}`,
      page: currentPage,
      createdAt: new Date().toISOString()
    };
    setBookmarks(prev => [...prev, bookmark]);
    toast.success('Bookmark added');
  };

  const handleDownload = () => {
    if (pdfFile) {
      const a = document.createElement('a');
      a.href = pdfUrl!;
      a.download = pdfFile.name;
      a.click();
    }
  };

  const ToolbarButton = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button onClick={onClick} title={title} className={cn('toolbar-btn', active && 'toolbar-btn-active')}>{children}</button>
  );

  return (
    <div className="flex flex-col h-full bg-surface-100 dark:bg-surface-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 select-none">
        <div className="flex items-center gap-1 px-3 py-2">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-4 h-4 rounded bg-pdf-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300 max-w-48 truncate">
              {pdfFile?.name || 'PDF Viewer'}
            </span>
          </div>

          {pdfUrl && (
            <>
              <div className="toolbar-separator" />
              <ToolbarButton onClick={handleDownload} title="Download"><Download size={15} /></ToolbarButton>
              <ToolbarButton onClick={() => window.print()} title="Print"><Printer size={15} /></ToolbarButton>
              <div className="toolbar-separator" />
              {/* Page navigation */}
              <ToolbarButton onClick={() => setCurrentPage(p => Math.max(1, p - 1))} title="Previous Page">
                <ChevronLeft size={15} />
              </ToolbarButton>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentPage}
                  onChange={e => setCurrentPage(Math.max(1, Math.min(totalPages || 1, Number(e.target.value))))}
                  className="w-12 text-center text-xs border border-surface-200 dark:border-surface-700 rounded px-1 py-0.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                  min={1}
                  max={totalPages || 1}
                />
                <span className="text-xs text-surface-400">/ {totalPages || '--'}</span>
              </div>
              <ToolbarButton onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))} title="Next Page">
                <ChevronRight size={15} />
              </ToolbarButton>
              <div className="toolbar-separator" />
              {/* Zoom */}
              <ToolbarButton onClick={() => setZoom(z => Math.max(25, z - 10))} title="Zoom Out"><ZoomOut size={14} /></ToolbarButton>
              <span className="text-xs font-medium text-surface-600 dark:text-surface-400 min-w-10 text-center">{zoom}%</span>
              <ToolbarButton onClick={() => setZoom(z => Math.min(300, z + 10))} title="Zoom In"><ZoomIn size={14} /></ToolbarButton>
              <ToolbarButton onClick={() => setZoom(100)} title="Reset Zoom"><Maximize2 size={14} /></ToolbarButton>
              <div className="toolbar-separator" />
              <ToolbarButton onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate"><RotateCw size={14} /></ToolbarButton>
              <div className="toolbar-separator" />
              {/* Annotation tools */}
              <ToolbarButton onClick={() => setActiveAnnotationTool(activeAnnotationTool === 'highlight' ? null : 'highlight')} active={activeAnnotationTool === 'highlight'} title="Highlight">
                <Highlighter size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => setActiveAnnotationTool(activeAnnotationTool === 'note' ? null : 'note')} active={activeAnnotationTool === 'note'} title="Add Note">
                <MessageSquare size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={addBookmark} title="Add Bookmark"><Bookmark size={14} /></ToolbarButton>
              <div className="toolbar-separator" />
              <ToolbarButton onClick={() => setShowSearch(!showSearch)} active={showSearch} title="Search"><Search size={14} /></ToolbarButton>
            </>
          )}

          <div className="ml-auto flex items-center gap-1">
            <ToolbarButton onClick={() => setShowAI(!showAI)} title="AI Assistant"><Sparkles size={15} className="text-purple-500" /></ToolbarButton>
            {pdfUrl && <ToolbarButton onClick={() => setShowSidebar(!showSidebar)} title="Toggle Sidebar"><FileText size={15} /></ToolbarButton>}
          </div>
        </div>

        {/* Search bar */}
        {showSearch && pdfUrl && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-surface-100 dark:border-surface-800">
            <Search size={14} className="text-surface-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search in PDF..."
              className="flex-1 text-sm bg-transparent focus:outline-none text-surface-900 dark:text-surface-100 placeholder-surface-400"
              autoFocus
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-xs text-surface-400 hover:text-surface-600">Clear</button>}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && pdfUrl && (
          <div className="w-48 flex-shrink-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 flex flex-col">
            {/* Sidebar tabs */}
            <div className="flex border-b border-surface-200 dark:border-surface-700">
              {[
                { id: 'thumbnails', label: 'Pages' },
                { id: 'bookmarks', label: 'Bookmarks' },
                { id: 'annotations', label: 'Notes' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSidebarTab(id as any)}
                  className={cn('flex-1 py-2 text-xs font-medium transition-colors', sidebarTab === id ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' : 'text-surface-500 hover:text-surface-700')}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sidebarTab === 'thumbnails' && (
                <div className="space-y-2">
                  {Array.from({ length: Math.min(totalPages || 5, 20) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn('w-full aspect-[3/4] rounded border-2 transition-all flex items-center justify-center text-xs text-surface-400 bg-surface-50 dark:bg-surface-800', currentPage === i + 1 ? 'border-primary-500' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300')}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
              {sidebarTab === 'bookmarks' && (
                <div className="space-y-1">
                  {bookmarks.length === 0 ? (
                    <p className="text-xs text-surface-400 italic p-2">No bookmarks yet. Click the bookmark button to add one.</p>
                  ) : (
                    bookmarks.map(bm => (
                      <button key={bm.id} onClick={() => setCurrentPage(bm.page)} className="w-full text-left p-2 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                        <p className="text-xs font-medium text-surface-700 dark:text-surface-300">{bm.title}</p>
                        <p className="text-xs text-surface-400">Page {bm.page}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
              {sidebarTab === 'annotations' && (
                <div className="space-y-1">
                  {annotations.length === 0 ? (
                    <p className="text-xs text-surface-400 italic p-2">No annotations yet.</p>
                  ) : (
                    annotations.map(ann => (
                      <div key={ann.id} className="p-2 rounded bg-surface-50 dark:bg-surface-800 text-xs">
                        <p className="font-medium text-surface-700 dark:text-surface-300 capitalize">{ann.type}</p>
                        <p className="text-surface-500">Page {ann.page}</p>
                        {ann.content && <p className="text-surface-600 dark:text-surface-400 mt-1">{ann.content}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PDF viewer area */}
        <div className="flex-1 overflow-auto bg-surface-300 dark:bg-surface-700 flex items-start justify-center p-6">
          {!pdfUrl ? (
            <div
              {...getRootProps()}
              className={cn(
                'w-full max-w-2xl aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all',
                isDragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 hover:border-primary-400 hover:bg-primary-50/50'
              )}
            >
              <input {...getInputProps()} />
              <div className="w-20 h-20 rounded-2xl bg-pdf-500/10 flex items-center justify-center">
                <FileText size={40} className="text-pdf-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-surface-700 dark:text-surface-300">
                  {isDragActive ? 'Drop PDF here' : 'Open a PDF file'}
                </p>
                <p className="text-sm text-surface-400 mt-1">Drag & drop or click to browse</p>
                <p className="text-xs text-surface-300 mt-2">Supports PDF files up to 100MB</p>
              </div>
              <button className="btn-primary">
                <Upload size={16} /> Choose File
              </button>
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease'
              }}
            >
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#page=${currentPage}`}
                className="shadow-strong bg-white"
                style={{ width: '794px', height: '1123px', border: 'none' }}
                title="PDF Viewer"
                onLoad={() => {
                  // Try to get page count from iframe
                  setTotalPages(prev => prev || 1);
                }}
              />
            </div>
          )}
        </div>

        {/* AI Panel */}
        {showAI && (
          <AIPanel document={null} onClose={() => setShowAI(false)} />
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-500 dark:text-surface-400">
        <div className="flex items-center gap-4">
          {pdfFile && <span>{pdfFile.name}</span>}
          {pdfFile && <span>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</span>}
        </div>
        <div className="flex items-center gap-4">
          {pdfUrl && <span>Page {currentPage} of {totalPages || '--'}</span>}
          <span>PDF Viewer</span>
        </div>
      </div>
    </div>
  );
}
