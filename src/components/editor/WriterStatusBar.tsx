import React from 'react';
import { Editor } from '@tiptap/react';
import { Document } from '@store/documentStore';
import { useDocumentStore } from '@store/documentStore';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Props { editor: Editor; document: Document | null; }

export default function WriterStatusBar({ editor, document }: Props) {
  const { hasUnsavedChanges, isSaving } = useDocumentStore();
  const wordCount = editor?.storage.characterCount?.words() || 0;
  const charCount = editor?.storage.characterCount?.characters() || 0;
  const { from, to } = editor?.state.selection || { from: 0, to: 0 };
  const selectedChars = to - from;

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-500 dark:text-surface-400 select-none">
      <div className="flex items-center gap-4">
        {/* Save status */}
        <div className="flex items-center gap-1.5">
          {isSaving ? (
            <><Loader2 size={11} className="animate-spin text-yellow-500" /><span className="text-yellow-600">Saving...</span></>
          ) : hasUnsavedChanges ? (
            <><AlertCircle size={11} className="text-orange-500" /><span className="text-orange-600">Unsaved changes</span></>
          ) : (
            <><CheckCircle size={11} className="text-green-500" /><span className="text-green-600">Saved</span></>
          )}
        </div>

        <span>Words: {wordCount.toLocaleString()}</span>
        <span>Characters: {charCount.toLocaleString()}</span>
        {selectedChars > 0 && <span>Selected: {selectedChars}</span>}
      </div>

      <div className="flex items-center gap-4">
        {document && (
          <>
            <span>Version {document.version}</span>
            <span>{document.language?.toUpperCase() || 'EN'}</span>
          </>
        )}
        <span>Writer</span>
      </div>
    </div>
  );
}
