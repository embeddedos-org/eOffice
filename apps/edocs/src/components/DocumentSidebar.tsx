import React, { useState } from 'react';

export interface DocMeta {
  id: string;
  title: string;
  content: string;
  lastModified: number;
  template?: string;
}

interface DocumentSidebarProps {
  open: boolean;
  documents: DocMeta[];
  activeDocId: string | null;
  onNewDocument: (template?: string) => void;
  onOpenDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onClose: () => void;
}

const TEMPLATES: { id: string; label: string; icon: string; content: string }[] = [
  { id: 'blank', label: 'Blank', icon: '📄', content: '' },
  {
    id: 'letter',
    label: 'Letter',
    icon: '✉️',
    content:
      '<p>[Your Name]<br>[Your Address]<br>[City, State ZIP]</p><p><br></p><p>[Date]</p><p><br></p><p>Dear [Recipient],</p><p><br></p><p>[Body of letter]</p><p><br></p><p>Sincerely,<br>[Your Name]</p>',
  },
  {
    id: 'report',
    label: 'Report',
    icon: '📊',
    content:
      '<h2>Report Title</h2><p><strong>Author:</strong> [Name]</p><p><strong>Date:</strong> [Date]</p><p><br></p><h2>Executive Summary</h2><p>[Summary here]</p><p><br></p><h2>Introduction</h2><p>[Introduction text]</p><p><br></p><h2>Findings</h2><p>[Details]</p><p><br></p><h2>Conclusion</h2><p>[Conclusion]</p>',
  },
  {
    id: 'resume',
    label: 'Resume',
    icon: '📋',
    content:
      '<h2>[Your Name]</h2><p>[Email] | [Phone] | [Location]</p><p><br></p><h2>Experience</h2><p><strong>[Job Title]</strong> — [Company], [Dates]</p><ul><li>[Achievement 1]</li><li>[Achievement 2]</li></ul><p><br></p><h2>Education</h2><p><strong>[Degree]</strong> — [University], [Year]</p><p><br></p><h2>Skills</h2><p>[Skill 1], [Skill 2], [Skill 3]</p>',
  },
];

export default function DocumentSidebar({
  open,
  documents,
  activeDocId,
  onNewDocument,
  onOpenDocument,
  onDeleteDocument,
  onClose,
}: DocumentSidebarProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const sortedDocs = [...documents].sort((a, b) => b.lastModified - a.lastModified);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <aside className={`doc-sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="doc-sidebar-inner">
        <div className="doc-sidebar-header">
          <h2 className="doc-sidebar-title">Documents</h2>
          <button className="doc-sidebar-close" onClick={onClose} title="Close sidebar" aria-label="Close document sidebar">
            ✕
          </button>
        </div>

        <div className="doc-sidebar-actions">
          <button className="doc-sidebar-btn doc-sidebar-btn-primary" onClick={() => onNewDocument()}>
            + New Document
          </button>
          <button
            className={`doc-sidebar-btn ${showTemplates ? 'active' : ''}`}
            onClick={() => setShowTemplates(!showTemplates)}
          >
            Templates
          </button>
        </div>

        {showTemplates && (
          <div className="doc-template-gallery">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                className="doc-template-card"
                onClick={() => {
                  onNewDocument(tpl.id);
                  setShowTemplates(false);
                }}
                title={`Create from ${tpl.label} template`}
              >
                <span className="doc-template-icon">{tpl.icon}</span>
                <span className="doc-template-label">{tpl.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="doc-sidebar-list">
          <p className="doc-sidebar-list-label">Recent Documents</p>
          {sortedDocs.length === 0 ? (
            <div className="doc-sidebar-empty">
              <p>No documents yet.</p>
              <p>Click "New Document" to get started.</p>
            </div>
          ) : (
            sortedDocs.map((doc) => (
              <div
                key={doc.id}
                className={`doc-sidebar-item ${doc.id === activeDocId ? 'active' : ''}`}
                onClick={() => onOpenDocument(doc.id)}
              >
                <div className="doc-sidebar-item-info">
                  <span className="doc-sidebar-item-title">{doc.title || 'Untitled'}</span>
                  <span className="doc-sidebar-item-date">{formatDate(doc.lastModified)}</span>
                </div>
                <button
                  className="doc-sidebar-item-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument(doc.id);
                  }}
                  title="Delete document"
                  aria-label={`Delete ${doc.title}`}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

export { TEMPLATES };
