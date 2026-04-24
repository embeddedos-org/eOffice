import { useEffect, useRef } from 'react';
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
                <button className="message-file-download" onClick={() => alert(`Downloading ${msg.fileName}... (simulated)`)}>
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
