import { useState, useCallback } from 'react';

interface EmailComposerProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onSend: (to: string, subject: string, body: string) => void;
  onClose: () => void;
  onSpellCheck?: (text: string) => Promise<{ suggestions: string[]; corrected: string }>;
  onRewrite?: (text: string, tone: string) => Promise<string>;
  onImprove?: (text: string) => Promise<string>;
  ebotConnected?: boolean;
  ebotLoading?: boolean;
}

export default function EmailComposer({
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  onSend,
  onClose,
  onSpellCheck,
  onRewrite,
  onImprove,
  ebotConnected = false,
  ebotLoading = false,
}: EmailComposerProps) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [aiResult, setAiResult] = useState<string>('');
  const [showAiTools, setShowAiTools] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSend = () => {
    if (!to.trim() || !subject.trim()) return;
    onSend(to, subject, body);
    onClose();
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
        setAiResult('');
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

  return (
    <div className="composer-overlay" onClick={onClose}>
      <div className="composer" onClick={(e) => e.stopPropagation()} style={{ width: 580 }}>
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
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              padding: '8px 0',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={handleSpellCheck}
              disabled={processing || !body.trim()}
              style={aiToolBtnStyle}
            >
              📝 Spell Check
            </button>
            <button
              onClick={handleImprove}
              disabled={processing || !body.trim()}
              style={aiToolBtnStyle}
            >
              💡 Improve
            </button>
            <button
              onClick={() => handleRewrite('formal')}
              disabled={processing || !body.trim()}
              style={aiToolBtnStyle}
            >
              👔 Formal
            </button>
            <button
              onClick={() => handleRewrite('casual')}
              disabled={processing || !body.trim()}
              style={aiToolBtnStyle}
            >
              😊 Casual
            </button>
            <button
              onClick={() => handleRewrite('concise')}
              disabled={processing || !body.trim()}
              style={aiToolBtnStyle}
            >
              ✂️ Concise
            </button>
            <button
              onClick={() => handleRewrite('friendly')}
              disabled={processing || !body.trim()}
              style={aiToolBtnStyle}
            >
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
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@eoffice.com" />
        </label>
        <label>
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        </label>
        <label>
          Body
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setAiStatus(''); setAiResult(''); }}
            placeholder="Write your message..."
            style={{ minHeight: 150 }}
          />
        </label>
        <div className="composer-actions">
          <button className="composer-btn" onClick={onClose}>Discard</button>
          <button className="composer-btn primary" onClick={handleSend} disabled={!to.trim() || !subject.trim()}>
            📨 Send
          </button>
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
