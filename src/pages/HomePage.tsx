import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '@store/documentStore';
import { useThemeStore } from '@store/themeStore';
import { FileText, Table2, Presentation, FileImage, Plus, Clock, Star, Search, Grid, List, MoreVertical, Trash2, Copy, Download, Edit3, Sparkles, Globe, Moon, Sun, Settings, ChevronRight, TrendingUp, Users, Zap, Shield, Cloud, Smartphone } from 'lucide-react';
import { cn } from '@utils/cn';
import { formatDistanceToNow } from 'date-fns';

const APP_CARDS = [
  {
    id: 'writer',
    name: 'Writer',
    description: 'Advanced document editor with AI assistance',
    icon: FileText,
    color: 'writer',
    gradient: 'from-writer-500 to-writer-600',
    route: '/writer',
    features: ['Real-time collaboration', 'AI writing assistant', 'Export to DOCX/PDF/HTML']
  },
  {
    id: 'calc',
    name: 'Calc',
    description: 'Powerful spreadsheet with formula engine',
    icon: Table2,
    color: 'calc',
    gradient: 'from-calc-500 to-calc-600',
    route: '/calc',
    features: ['300+ formulas', 'Charts & visualization', 'Data analysis tools']
  },
  {
    id: 'impress',
    name: 'Impress',
    description: 'Beautiful presentations with animations',
    icon: Presentation,
    color: 'impress',
    gradient: 'from-impress-500 to-impress-600',
    route: '/impress',
    features: ['50+ slide themes', 'Smooth transitions', 'Present from browser']
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'View, annotate and edit PDF documents',
    icon: FileImage,
    color: 'pdf',
    gradient: 'from-pdf-500 to-pdf-600',
    route: '/pdf',
    features: ['Annotations & highlights', 'Form filling', 'PDF to Word conversion']
  }
];

const FEATURES = [
  { icon: Sparkles, title: 'AI-Powered', desc: 'Built-in AI assistant for writing, analysis, and automation' },
  { icon: Users, title: 'Real-time Collaboration', desc: 'Work together with your team in real-time' },
  { icon: Cloud, title: 'Cloud Storage', desc: 'Auto-save and sync across all your devices' },
  { icon: Shield, title: 'Enterprise Security', desc: 'End-to-end encryption and compliance tools' },
  { icon: Smartphone, title: 'Mobile Ready', desc: 'Full-featured mobile apps for iOS and Android' },
  { icon: Globe, title: '25+ Languages', desc: 'Full internationalization and RTL support' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Optimized performance with instant load times' },
  { icon: TrendingUp, title: 'Advanced Analytics', desc: 'Document insights and usage analytics' },
];

const TEMPLATES = [
  { name: 'Business Report', type: 'writer', icon: FileText, color: 'writer' },
  { name: 'Budget Tracker', type: 'calc', icon: Table2, color: 'calc' },
  { name: 'Pitch Deck', type: 'impress', icon: Presentation, color: 'impress' },
  { name: 'Invoice Template', type: 'writer', icon: FileText, color: 'writer' },
  { name: 'Project Timeline', type: 'calc', icon: Table2, color: 'calc' },
  { name: 'Marketing Deck', type: 'impress', icon: Presentation, color: 'impress' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { documents, createDocument, deleteDocument } = useDocumentStore();
  const { theme, setTheme } = useThemeStore();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'starred' | 'writer' | 'calc' | 'impress' | 'pdf'>('all');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; docId: string } | null>(null);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || activeFilter === 'recent' || doc.type === activeFilter || (activeFilter === 'starred' && doc.starred);
    return matchesSearch && matchesFilter;
  }).sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  const handleCreateDocument = (type: 'writer' | 'calc' | 'impress' | 'pdf') => {
    const doc = createDocument(type);
    navigate(`/${type}/${doc.id}`);
  };

  const handleOpenDocument = (doc: any) => {
    navigate(`/${doc.type}/${doc.id}`);
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'writer': return FileText;
      case 'calc': return Table2;
      case 'impress': return Presentation;
      case 'pdf': return FileImage;
      default: return FileText;
    }
  };

  const getDocColor = (type: string) => {
    switch (type) {
      case 'writer': return 'text-writer-600 bg-writer-50 dark:bg-writer-900/20';
      case 'calc': return 'text-calc-600 bg-calc-50 dark:bg-calc-900/20';
      case 'impress': return 'text-impress-600 bg-impress-50 dark:bg-impress-900/20';
      case 'pdf': return 'text-pdf-600 bg-pdf-50 dark:bg-pdf-900/20';
      default: return 'text-surface-600 bg-surface-50';
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <header className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-medium">
                <span className="text-white font-bold text-lg">e</span>
              </div>
              <div>
                <span className="text-xl font-bold text-surface-900 dark:text-white">eOffice</span>
                <span className="ml-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded-full">Pro</span>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-surface-100 placeholder-surface-400"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="toolbar-btn" title="Toggle Theme">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => navigate('/settings')} className="toolbar-btn" title="Settings">
                <Settings size={18} />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
                U
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero section */}
        <div className="mb-10 bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 rounded-2xl p-8 text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Welcome to eOffice</h1>
            <p className="text-primary-100 text-lg mb-6">The world's most advanced open-source office suite. Better than MS Office, LibreOffice, and OpenOffice.</p>
            <div className="flex flex-wrap gap-3">
              {APP_CARDS.map(app => (
                <button
                  key={app.id}
                  onClick={() => handleCreateDocument(app.id as any)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
                >
                  <app.icon size={16} />
                  New {app.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* App cards */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-4">Applications</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {APP_CARDS.map(app => (
              <div
                key={app.id}
                className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-medium transition-all cursor-pointer group"
                onClick={() => handleCreateDocument(app.id as any)}
              >
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform', app.gradient)}>
                  <app.icon size={24} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-surface-900 dark:text-white mb-1">{app.name}</h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-3">{app.description}</p>
                <ul className="space-y-1">
                  {app.features.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
                      <div className="w-1 h-1 rounded-full bg-primary-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center text-xs font-medium text-primary-600 dark:text-primary-400 group-hover:gap-2 transition-all">
                  <span>Create new</span>
                  <ChevronRight size={14} className="ml-1" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent documents */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Documents</h2>
            <div className="flex items-center gap-2">
              {/* Filter tabs */}
              <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-0.5">
                {['all', 'recent', 'starred', 'writer', 'calc', 'impress', 'pdf'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter as any)}
                    className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize', activeFilter === filter ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-soft' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300')}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
                <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white dark:bg-surface-700 shadow-soft' : 'text-surface-400')}>
                  <Grid size={14} />
                </button>
                <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-white dark:bg-surface-700 shadow-soft' : 'text-surface-400')}>
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="text-center py-16 text-surface-400">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm mt-1">Create a new document to get started</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredDocs.map(doc => {
                const Icon = getDocIcon(doc.type);
                return (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-medium transition-all cursor-pointer group overflow-hidden"
                    onClick={() => handleOpenDocument(doc)}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, docId: doc.id }); }}
                  >
                    <div className={cn('h-28 flex items-center justify-center', getDocColor(doc.type))}>
                      <Icon size={40} className="opacity-60" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{doc.title}</p>
                      <p className="text-xs text-surface-400 mt-0.5">{formatDistanceToNow(new Date(doc.modifiedAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100 dark:border-surface-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Modified</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc, i) => {
                    const Icon = getDocIcon(doc.type);
                    return (
                      <tr
                        key={doc.id}
                        className={cn('hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors', i < filteredDocs.length - 1 && 'border-b border-surface-100 dark:border-surface-800')}
                        onClick={() => handleOpenDocument(doc)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', getDocColor(doc.type))}>
                              <Icon size={16} />
                            </div>
                            <span className="text-sm font-medium text-surface-800 dark:text-surface-200">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-500 capitalize">{doc.type}</td>
                        <td className="px-4 py-3 text-sm text-surface-500">{formatDistanceToNow(new Date(doc.modifiedAt), { addSuffix: true })}</td>
                        <td className="px-4 py-3 text-sm text-surface-500">{(doc.size / 1024).toFixed(1)} KB</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, docId: doc.id }); }}
                            className="toolbar-btn opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Templates */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Templates</h2>
            <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TEMPLATES.map(template => {
              const Icon = template.icon;
              return (
                <button
                  key={template.name}
                  onClick={() => handleCreateDocument(template.type as any)}
                  className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-medium transition-all p-4 text-left group"
                >
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform', getDocColor(template.type))}>
                    <Icon size={20} />
                  </div>
                  <p className="text-xs font-medium text-surface-700 dark:text-surface-300">{template.name}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Features grid */}
        <section>
          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-4">Why eOffice?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {FEATURES.map(feature => (
              <div key={feature.title} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-3">
                  <feature.icon size={20} className="text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-sm font-bold text-surface-800 dark:text-surface-200 mb-1">{feature.title}</h3>
                <p className="text-xs text-surface-500 dark:text-surface-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong overflow-hidden min-w-40" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => { const doc = documents.find(d => d.id === contextMenu.docId); if (doc) handleOpenDocument(doc); setContextMenu(null); }} className="menu-item w-full"><Edit3 size={13} />Open</button>
            <button onClick={() => { setContextMenu(null); }} className="menu-item w-full"><Copy size={13} />Duplicate</button>
            <button onClick={() => { setContextMenu(null); }} className="menu-item w-full"><Download size={13} />Download</button>
            <button onClick={() => { setContextMenu(null); }} className="menu-item w-full"><Star size={13} />Star</button>
            <hr className="border-surface-100 dark:border-surface-700" />
            <button onClick={() => { deleteDocument(contextMenu.docId); setContextMenu(null); }} className="menu-item w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={13} />Delete</button>
          </div>
        </>
      )}
    </div>
  );
}
