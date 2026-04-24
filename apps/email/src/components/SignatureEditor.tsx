import { useState, useEffect } from 'react';

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface SignatureEditorProps {
  signatures: EmailSignature[];
  onSave: (signature: EmailSignature) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onClose: () => void;
}

const STORAGE_KEY = 'eoffice-email-signatures';

export function loadSignatures(): EmailSignature[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveSignatures(sigs: EmailSignature[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sigs));
}

export function getDefaultSignature(): EmailSignature | null {
  const sigs = loadSignatures();
  return sigs.find((s) => s.isDefault) || null;
}

export default function SignatureEditor({
  signatures,
  onSave,
  onDelete,
  onSetDefault,
  onClose,
}: SignatureEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    signatures[0]?.id || null
  );
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isNew, setIsNew] = useState(false);

  const selected = signatures.find((s) => s.id === selectedId);

  useEffect(() => {
    if (selected) {
      setEditName(selected.name);
      setEditContent(selected.content);
      setIsNew(false);
    }
  }, [selected]);

  const handleNew = () => {
    setIsNew(true);
    setSelectedId(null);
    setEditName('');
    setEditContent(
      '<div style="font-family: Arial, sans-serif; font-size: 13px;">\n' +
        '<p>Best regards,</p>\n' +
        '<p><strong>Your Name</strong></p>\n' +
        '<p style="color: #666;">Your Title | Your Company</p>\n' +
        '</div>'
    );
  };

  const handleSave = () => {
    const sig: EmailSignature = {
      id: isNew ? `sig-${Date.now()}` : selectedId!,
      name: editName || 'Untitled Signature',
      content: editContent,
      isDefault: isNew ? signatures.length === 0 : selected?.isDefault || false,
    };
    onSave(sig);
    if (isNew) {
      setSelectedId(sig.id);
      setIsNew(false);
    }
  };

  return (
    <div className="composer-overlay" onClick={onClose}>
      <div className="signature-editor" onClick={(e) => e.stopPropagation()}>
        <div className="signature-editor-header">
          <h3>✍️ Email Signatures</h3>
          <button className="composer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="signature-editor-body">
          <div className="signature-list">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className={`signature-list-item ${selectedId === sig.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedId(sig.id);
                  setIsNew(false);
                }}
              >
                <span className="signature-list-name">
                  {sig.name}
                  {sig.isDefault && <span className="signature-default-badge">Default</span>}
                </span>
              </div>
            ))}
            <button className="signature-new-btn" onClick={handleNew}>
              + New Signature
            </button>
          </div>

          <div className="signature-edit">
            <label className="signature-label">
              Signature Name
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Work, Personal"
                className="signature-name-input"
              />
            </label>
            <label className="signature-label">
              Content (HTML supported)
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="signature-content-input"
                rows={8}
              />
            </label>
            <div className="signature-preview">
              <div className="signature-preview-label">Preview</div>
              <div
                className="signature-preview-content"
                dangerouslySetInnerHTML={{ __html: editContent }}
              />
            </div>
            <div className="signature-actions">
              {selectedId && !isNew && (
                <>
                  {!selected?.isDefault && (
                    <button
                      className="composer-btn"
                      onClick={() => onSetDefault(selectedId)}
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    className="composer-btn"
                    onClick={() => {
                      onDelete(selectedId);
                      setSelectedId(signatures[0]?.id || null);
                    }}
                    style={{ color: 'var(--error)' }}
                  >
                    Delete
                  </button>
                </>
              )}
              <button className="composer-btn primary" onClick={handleSave}>
                {isNew ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
