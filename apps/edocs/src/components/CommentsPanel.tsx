import { useState } from 'react';

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  resolved: boolean;
  replies: Comment[];
  selectionText?: string;
}

interface CommentsPanelProps {
  comments: Comment[];
  onAddComment: (text: string, selectionText?: string) => void;
  onReply: (commentId: string, text: string) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}

export default function CommentsPanel({ comments, onAddComment, onReply, onResolve, onDelete }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const selection = window.getSelection()?.toString();
    onAddComment(newComment.trim(), selection || undefined);
    setNewComment('');
  };

  const handleReply = (commentId: string) => {
    if (!replyText.trim()) return;
    onReply(commentId, replyText.trim());
    setReplyText('');
    setReplyingTo(null);
  };

  const filtered = showResolved ? comments : comments.filter(c => !c.resolved);

  return (
    <div style={{ width: 300, borderLeft: '1px solid #e0e0e0', background: '#fafafa', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Comments ({comments.length})</span>
        <label style={{ fontSize: 12, fontWeight: 400 }}>
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} /> Show resolved
        </label>
      </div>

      <div style={{ padding: 12 }}>
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          style={{ width: '100%', minHeight: 60, padding: 8, border: '1px solid #ddd', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box' }}
        />
        <button onClick={handleSubmit} disabled={!newComment.trim()} style={{ marginTop: 4, padding: '6px 12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Comment
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
        {filtered.map(comment => (
          <div key={comment.id} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 12, marginBottom: 8, opacity: comment.resolved ? 0.6 : 1 }}>
            {comment.selectionText && (
              <div style={{ fontSize: 12, color: '#666', background: '#fff9c4', padding: '4px 8px', borderRadius: 4, marginBottom: 8, borderLeft: '3px solid #fbc02d' }}>
                "{comment.selectionText}"
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{comment.author}</div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{new Date(comment.timestamp).toLocaleString()}</div>
            <div style={{ fontSize: 13, color: '#444' }}>{comment.text}</div>

            {comment.replies.map(reply => (
              <div key={reply.id} style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #e0e0e0' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{reply.author}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{reply.text}</div>
              </div>
            ))}

            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#667eea', cursor: 'pointer' }}>Reply</button>
              <button onClick={() => onResolve(comment.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#4caf50', cursor: 'pointer' }}>
                {comment.resolved ? 'Unresolve' : 'Resolve'}
              </button>
              <button onClick={() => onDelete(comment.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#f44336', cursor: 'pointer' }}>Delete</button>
            </div>

            {replyingTo === comment.id && (
              <div style={{ marginTop: 8 }}>
                <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply..." style={{ width: '100%', padding: 6, border: '1px solid #ddd', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }} />
                <button onClick={() => handleReply(comment.id)} style={{ marginTop: 4, padding: '4px 8px', fontSize: 11, background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Send</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { Comment };
