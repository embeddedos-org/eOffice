import { useState, useEffect, useRef } from 'react';
import type { Message } from '../hooks/useConnect';

interface MessageThreadProps {
  messages: Message[];
  channelName: string;
  typingUser: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageThread({ messages, channelName, typingUser }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUser]);

  if (messages.length === 0) {
    return (
      <div className="message-thread">
        <div className="message-empty">
          <div className="message-empty-icon">💬</div>
          <div>No messages in #{channelName} yet</div>
          <div style={{ fontSize: 12 }}>Start the conversation!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-thread">
      {messages.map((msg) => (
        <div key={msg.id} className={`message-item ${msg.type === 'file' ? 'file-message' : ''}`}>
          <div className="message-avatar">
            <span className={`message-presence ${msg.author === 'You' ? 'online' : ''}`} />
            {msg.author[0]}
          </div>
          <div className="message-body">
            <div className="message-header">
              <span className="message-author">{msg.author}</span>
              <span className="message-time">{msg.timestamp}</span>
            </div>
            {msg.type === 'file' ? (
              <div className="message-file-card">
                <span className="message-file-icon">📎</span>
                <div className="message-file-info">
                  <div className="message-file-name">{msg.fileName}</div>
                  {msg.fileSize !== undefined && (
                    <div className="message-file-size">{formatFileSize(msg.fileSize)}</div>
                  )}
                </div>
                <button className="message-file-download" onClick={() => { const a = document.createElement('a'); a.href = '#'; a.download = msg.fileName || 'file'; a.click(); }}>
                  📥
                </button>
              </div>
            ) : (
              <div className="message-content">{msg.content}</div>
            )}
          </div>
        </div>
      ))}
      {typingUser && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span /><span /><span />
          </div>
          <span>{typingUser} is typing...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}


// --- Message Reactions Component ---
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface MessageReactionsProps {
  messageId: string;
  reactions: Record<string, string[]>;
  currentUser: string;
  onReact: (messageId: string, emoji: string) => void;
}

export function MessageReactions({ messageId, reactions, currentUser, onReact }: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
      {Object.entries(reactions || {}).map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => onReact(messageId, emoji)}
          style={{
            padding: '2px 6px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
            border: users.includes(currentUser) ? '1px solid #667eea' : '1px solid #e0e0e0',
            background: users.includes(currentUser) ? '#eef' : '#f5f5f5',
          }}
        >
          {emoji} {users.length}
        </button>
      ))}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          style={{ padding: '2px 6px', borderRadius: 12, fontSize: 12, cursor: 'pointer', border: '1px solid #e0e0e0', background: '#f5f5f5' }}
        >
          +
        </button>
        {showPicker && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 4, display: 'flex', gap: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 10 }}>
            {QUICK_REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => { onReact(messageId, emoji); setShowPicker(false); }}
                style={{ padding: 4, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
