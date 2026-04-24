import { API_URL } from '../../../shared/config';

interface EBotSidebarProps {
  open: boolean;
  connected: boolean;
  response: string;
  isLoading: boolean;
  onAction: (action: string) => void;
  onClose: () => void;
}

export default function EBotSidebar({
  open,
  connected,
  response,
  isLoading,
  onAction,
  onClose,
}: EBotSidebarProps) {
  return (
    <div className={`ebot-sidebar ${open ? 'open' : ''}`}>
      <div className="ebot-sidebar-inner">
        <div className="ebot-sidebar-header">
          <div className="ebot-sidebar-title">
            <span>🤖</span>
            <span>eBot — Mail AI</span>
          </div>
          <button className="ebot-sidebar-close" onClick={onClose}>✕</button>
        </div>

        {!connected ? (
          <div className="ebot-offline">
            <div className="ebot-offline-icon">🔌</div>
            <div className="ebot-offline-title">eBot Offline</div>
            <div className="ebot-offline-desc">
              Cannot connect to eBot server at {API_URL}.
            </div>
          </div>
        ) : (
          <>
            <div className="ebot-actions">
              <div className="ebot-actions-label">Email Tools</div>
              <div className="ebot-actions-grid">
                <button
                  className="ebot-action-btn"
                  disabled={isLoading}
                  onClick={() => onAction('draft-reply')}
                >
                  <span className="ebot-action-icon">↩️</span>
                  <span>Draft Reply</span>
                </button>
                <button
                  className="ebot-action-btn"
                  disabled={isLoading}
                  onClick={() => onAction('summarize')}
                >
                  <span className="ebot-action-icon">📋</span>
                  <span>Summarize</span>
                </button>
                <button
                  className="ebot-action-btn"
                  disabled={isLoading}
                  onClick={() => onAction('smart-compose')}
                >
                  <span className="ebot-action-icon">✨</span>
                  <span>Smart Compose</span>
                </button>
                <button
                  className="ebot-action-btn"
                  disabled={isLoading}
                  onClick={() => onAction('extract-tasks')}
                >
                  <span className="ebot-action-icon">✅</span>
                  <span>Extract Tasks</span>
                </button>
              </div>
            </div>

            <div className="ebot-actions">
              <div className="ebot-actions-label">Writing AI</div>
              <div className="ebot-actions-grid">
                <button
                  className="ebot-action-btn"
                  disabled={isLoading}
                  onClick={() => onAction('spell-check')}
                >
                  <span className="ebot-action-icon">📝</span>
                  <span>Spell Check</span>
                </button>
                <button
                  className="ebot-action-btn"
                  disabled={isLoading}
                  onClick={() => onAction('improve')}
                >
                  <span className="ebot-action-icon">💡</span>
                  <span>Improve</span>
                </button>
                <button
                  className="ebot-action-btn"
                  disabled={isLoading}
                  onClick={() => onAction('rewrite-formal')}
                >
                  <span className="ebot-action-icon">👔</span>
                  <span>Make Formal</span>
                </button>
                <button
                  className="ebot-action-btn"
                  disabled={isLoading}
                  onClick={() => onAction('rewrite-concise')}
                >
                  <span className="ebot-action-icon">✂️</span>
                  <span>Make Concise</span>
                </button>
              </div>
            </div>

            <div className="ebot-response-area">
              {isLoading ? (
                <div className="ebot-loading">
                  <div className="ebot-spinner" />
                  <span>eBot is thinking...</span>
                </div>
              ) : response ? (
                <div className="ebot-response">
                  <div className="ebot-response-header">
                    <span>🤖</span>
                    <span>eBot Response</span>
                  </div>
                  <div className="ebot-response-body">{response}</div>
                </div>
              ) : (
                <div className="ebot-empty">
                  Select an email and use eBot to draft replies, spell-check, rewrite, summarize, or compose messages with AI.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
