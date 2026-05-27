import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Document } from '@store/documentStore';
import { Hash, List, BookOpen, Clock, FileText } from 'lucide-react';
import { cn } from '@utils/cn';

interface Props { editor: Editor; document: Document | null; }

export default function WriterSidebar({ editor, document }: Props) {
  const [activeTab, setActiveTab] = useState<'outline' | 'stats' | 'history'>('outline');

  // Extract headings for outline
  const headings: { level: number; text: string; id: string }[] = [];
  if (editor) {
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({ level: node.attrs.level, text: node.textContent, id: `heading-${pos}` });
      }
    });
  }

  const wordCount = editor?.storage.characterCount?.words() || 0;
  const charCount = editor?.storage.characterCount?.characters() || 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="w-56 flex-shrink-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-surface-200 dark:border-surface-700">
        {[
          { id: 'outline', icon: List, label: 'Outline' },
          { id: 'stats', icon: FileText, label: 'Stats' },
          { id: 'history', icon: Clock, label: 'History' }
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={cn('flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors', activeTab === id ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300')}
          >
            <Icon size={13} />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'outline' && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Document Outline</p>
            {headings.length === 0 ? (
              <p className="text-xs text-surface-400 italic">No headings found. Add headings to see the outline.</p>
            ) : (
              headings.map((h, i) => (
                <button
                  key={i}
                  className="w-full text-left text-xs text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-1 truncate"
                  style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                  title={h.text}
                >
                  <span className="text-surface-300 mr-1">{'H' + h.level}</span>
                  {h.text}
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Document Statistics</p>
            {[
              { label: 'Words', value: wordCount.toLocaleString(), icon: Hash },
              { label: 'Characters', value: charCount.toLocaleString(), icon: FileText },
              { label: 'Reading time', value: `~${readingTime} min`, icon: Clock },
              { label: 'Paragraphs', value: editor?.state.doc.childCount || 0, icon: List },
              { label: 'Version', value: document?.version || 1, icon: BookOpen },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <Icon size={12} />
                  <span>{label}</span>
                </div>
                <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{value}</span>
              </div>
            ))}
            {document && (
              <>
                <hr className="border-surface-200 dark:border-surface-700" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">File Info</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-surface-500">Created</span>
                    <span className="text-surface-700 dark:text-surface-300">{new Date(document.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-surface-500">Modified</span>
                    <span className="text-surface-700 dark:text-surface-300">{new Date(document.modifiedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-surface-500">Size</span>
                    <span className="text-surface-700 dark:text-surface-300">{(document.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Version History</p>
            {[1, 2, 3].map(v => (
              <div key={v} className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-surface-700 dark:text-surface-300">Version {v}</span>
                  <span className="text-surface-400">{new Date(Date.now() - v * 3600000).toLocaleTimeString()}</span>
                </div>
                <p className="text-surface-500 mt-0.5">Auto-saved</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
