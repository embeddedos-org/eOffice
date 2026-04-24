import { useState, useCallback, useRef } from 'react';
import { sanitizeHtml } from '@eoffice/core';
import type { EmailSignature } from './SignatureEditor';

interface EmailComposerProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onSend: (to: string, subject: string, body: string, cc?: string, bcc?: string, attachments?: File[]) => void;
  onSaveDraft?: (to: string, subject: string, body: string) => void;
  onClose: () => void;
  onSpellCheck?: (text: string) => Promise<{ suggestions: string[]; corrected: string }>;
  onRewrite?: (text: string, tone: string) => Promise<string>;
  onImprove?: (text: string) => Promise<string>;
  ebotConnected?: boolean;
  ebotLoading?: boolean;
  signatures?: EmailSignature[];
  defaultSignature?: EmailSignature | null;
}

export default function EmailComposer({
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  onSend,
  onSaveDraft,
  onClose,
  onSpellCheck,
  onRewrite,
  onImprove,
  ebotConnected = false,
  ebotLoading = false,
  signatures = [],
  defaultSignature = null,
}: EmailComposerProps) {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(
    defaultSignature
      ? `${initialBody}\n\n--\n${defaultSignature.content.replace(/<[^>]*>/g, '')}`
      : initialBody
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [aiResult, setAiResult] = useState<string>('');
  const [showAiTools, setShowAiTools] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);
  const [isRichText, setIsRichText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!to.trim() || !subject.trim()) return;
    const content = isRichText && editorRef.current ? editorRef.current.innerHTML : body;
    onSend(to, subject, content, cc || undefined, bcc || undefined, attachments.length > 0 ? attachments : undefined);
    onClose();
  };

  const handleSaveDraft = () => {
    if (onSaveDraft) {
      const content = isRichText && editorRef.current ? editorRef.current.innerHTML : body;
      onSaveDraft(to, subject, content);
    }
  };

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const insertSignature = (sig: EmailSignature) => {
    const sigText = sig.content.replace(/<[^>]*>/g, '');
    if (isRichText && editorRef.current) {
      editorRef.current.innerHTML += `<br><br>--<br>${sig.content}`;
    } else {
      setBody((prev) => `${prev}\n\n--\n${sigText}`);
    }
    setShowSignatures(false);
  };

  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSpellCheck = useCallback(async () => {
    if (!onSpellCheck || !body.trim()) return;
    setProcessing(true);
    setAiStatus('🔍 Checking spelling & grammar...');
    setAiResult('');
    try {
      const result = await onSpellCheck(body);
      if (result.suggestions.length === 0) {
        setAiStatus('✅ No spelling or grammar issues found!');
      } else {
        setBody(result.corrected);
        setAiStatus(`✅ Fixed ${result.suggestions.length} issue(s)`);
        setAiResult(result.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n'));
      }
    } catch (e: any) {
      setAiStatus(`❌ ${e.message}`);
    } finally {
      setProcessing(false);
    }
  }, [body, onSpellCheck]);

  const handleRewrite = useCallback(async (tone: string) => {
    if (!onRewrite || !body.trim()) return;
    setProcessing(true);
    setAiStatus(`✍️ Rewriting in ${tone} tone...`);
    setAiResult('');
    try {
      const rewritten = await onRewrite(body, tone);
      setBody(rewritten);
      setAiStatus(`✅ Rewritten in ${tone} tone`);
    } catch (e: any) {
      setAiStatus(`❌ ${e.message}`);
    } finally {
      setProcessing(false);
    }
  }, [body, onRewrite]);

  const handleImprove = useCallback(async () => {
    if (!onImprove || !body.trim()) return;
    setProcessing(true);
    setAiStatus('💡 Improving writing...');
    setAiResult('');
    try {
      const improved = await onImprove(body);
      setBody(improved);
      setAiStatus('✅ Writing improved');
    } catch (e: any) {
      setAiStatus(`❌ ${e.message}`);
    } finally {
      setProcessing(false);
    }
  }, [body, onImprove]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="composer-overlay" onClick={onClose}>
      <div
        className="composer"
        onClick={(e) => e.stopPropagation()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{ width: 640 }}
      >
        <div className="composer-header">
          <h3>New Message</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {ebotConnected && (
              <button
                onClick={() => setShowAiTools(!showAiTools)}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  background: showAiTools ? 'var(--accent-light)' : 'var(--bg-primary)',
                  padding: '3px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                🤖 AI Tools
              </button>
            )}
            <button className="composer-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {showAiTools && ebotConnected && (
          <div className="composer-ai-tools">
            <button onClick={handleSpellCheck} disabled={processing || !body.trim()} style={aiToolBtnStyle}>
              📝 Spell Check
            </button>
            <button onClick={handleImprove} disabled={processing || !body.trim()} style={aiToolBtnStyle}>
              💡 Improve
            </button>
            <button onClick={() => handleRewrite('formal')} disabled={processing || !body.trim()} style={aiToolBtnStyle}>
              👔 Formal
            </button>
            <button onClick={() => handleRewrite('casual')} disabled={processing || !body.trim()} style={aiToolBtnStyle}>
              😊 Casual
            </button>
            <button onClick={() => handleRewrite('concise')} disabled={processing || !body.trim()} style={aiToolBtnStyle}>
              ✂️ Concise
            </button>
            <button onClick={() => handleRewrite('friendly')} disabled={processing || !body.trim()} style={aiToolBtnStyle}>
              🤝 Friendly
            </button>
          </div>
        )}

        {aiStatus && (
          <div
            style={{
              fontSize: 11,
              padding: '6px 10px',
              background: aiStatus.startsWith('❌') ? '#fef2f2' : 'var(--accent-light)',
              border: `1px solid ${aiStatus.startsWith('❌') ? '#fecaca' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-sm)',
              color: aiStatus.startsWith('❌') ? '#991b1b' : 'var(--text-secondary)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {aiStatus}
            {aiResult && (
              <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
                {aiResult}
              </div>
            )}
          </div>
        )}

        <label>
          To
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@email.com" />
        </label>

        <div className="composer-cc-toggle">
          <button onClick={() => setShowCcBcc(!showCcBcc)} className="composer-cc-btn">
            {showCcBcc ? 'Hide' : 'Show'} Cc/Bcc
          </button>
        </div>

        {showCcBcc && (
          <>
            <label>
              Cc
              <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@email.com" />
            </label>
            <label>
              Bcc
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@email.com" />
            </label>
          </>
        )}

        <label>
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        </label>

        <div className="composer-editor-toolbar">
          <button className={`composer-mode-btn ${!isRichText ? 'active' : ''}`} onClick={() => setIsRichText(false)}>
            Plain Text
          </button>
          <button className={`composer-mode-btn ${isRichText ? 'active' : ''}`} onClick={() => setIsRichText(true)}>
            Rich Text
          </button>
          {isRichText && (
            <div className="composer-format-btns">
              <button onClick={() => execFormat('bold')} title="Bold"><strong>B</strong></button>
              <button onClick={() => execFormat('italic')} title="Italic"><em>I</em></button>
              <button onClick={() => execFormat('underline')} title="Underline"><u>U</u></button>
              <button onClick={() => execFormat('insertUnorderedList')} title="List">•</button>
              <button onClick={() => {
                const url = prompt('Enter link URL:');
                if (url) execFormat('createLink', url);
              }} title="Link">🔗</button>
              <input
                type="color"
                onChange={(e) => execFormat('foreColor', e.target.value)}
                title="Text color"
                style={{ width: 24, height: 24, border: 'none', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>

        {isRichText ? (
          <div
            ref={editorRef}
            className="composer-richtext-editor"
            contentEditable
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
            onInput={() => {
              setAiStatus('');
              setAiResult('');
            }}
          />
        ) : (
          <label>
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setAiStatus(''); setAiResult(''); }}
              placeholder="Write your message..."
              style={{ minHeight: 150 }}
            />
          </label>
        )}

        {attachments.length > 0 && (
          <div className="composer-attachments">
            <div className="composer-attachments-label">📎 Attachments ({attachments.length})</div>
            {attachments.map((file, i) => (
              <div key={i} className="composer-attachment-item">
                <span className="composer-attachment-name">{file.name}</span>
                <span className="composer-attachment-size">{formatFileSize(file.size)}</span>
                <button className="composer-attachment-remove" onClick={() => removeAttachment(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="composer-actions">
          <div className="composer-actions-left">
            <button
              className="composer-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
            >
              📎 Attach
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleAttachFiles}
              style={{ display: 'none' }}
            />
            {signatures.length > 0 && (
              <div className="composer-signature-dropdown">
                <button
                  className="composer-btn"
                  onClick={() => setShowSignatures(!showSignatures)}
                >
                  ✍️ Signature
                </button>
                {showSignatures && (
                  <div className="composer-signature-menu">
                    {signatures.map((sig) => (
                      <button key={sig.id} onClick={() => insertSignature(sig)}>
                        {sig.name} {sig.isDefault && '(default)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="composer-actions-right">
            {onSaveDraft && (
              <button className="composer-btn" onClick={handleSaveDraft}>
                💾 Save Draft
              </button>
            )}
            <button className="composer-btn" onClick={onClose}>Discard</button>
            <button className="composer-btn primary" onClick={handleSend} disabled={!to.trim() || !subject.trim()}>
              📨 Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const aiToolBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-primary)',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: 'var(--text-primary)',
};
