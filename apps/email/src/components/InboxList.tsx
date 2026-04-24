import { useState, useMemo, useCallback } from 'react';
import type { Email } from '../hooks/useMailbox';

type SortField = 'date' | 'from' | 'subject' | 'size';
type SortOrder = 'asc' | 'desc';

interface InboxListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  folderLabel: string;
  onBulkDelete?: (ids: string[]) => void;
  onBulkMove?: (ids: string[], folder: string) => void;
  onBulkMarkRead?: (ids: string[], read: boolean) => void;
}

export default function InboxList({
  emails,
  selectedId,
  onSelect,
  onToggleStar,
  folderLabel,
  onBulkDelete,
  onBulkMove,
  onBulkMarkRead,
}: InboxListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const filteredEmails = useMemo(() => {
    let result = emails;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.from.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'from':
          cmp = a.from.localeCompare(b.from);
          break;
        case 'subject':
          cmp = a.subject.localeCompare(b.subject);
          break;
        case 'size':
          cmp = a.body.length - b.body.length;
          break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [emails, searchQuery, sortField, sortOrder]);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredEmails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmails.map((e) => e.id)));
    }
  }, [filteredEmails, selectedIds.size]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="inbox-list">
      <div className="inbox-list-header">
        <div className="inbox-list-header-top">
          <span>{folderLabel} ({filteredEmails.length})</span>
          <div className="inbox-list-controls">
            <button
              className={`inbox-select-toggle ${selectMode ? 'active' : ''}`}
              onClick={() => {
                setSelectMode(!selectMode);
                setSelectedIds(new Set());
              }}
              title="Multi-select"
            >
              ☑️
            </button>
          </div>
        </div>

        <div className="inbox-search-wrapper">
          <span className="inbox-search-icon">🔍</span>
          <input
            className="inbox-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter messages..."
          />
          {searchQuery && (
            <button className="inbox-search-clear" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>

        <div className="inbox-sort-bar">
          {(['date', 'from', 'subject'] as SortField[]).map((field) => (
            <button
              key={field}
              className={`inbox-sort-btn ${sortField === field ? 'active' : ''}`}
              onClick={() => handleSort(field)}
            >
              {field.charAt(0).toUpperCase() + field.slice(1)}
              {sortField === field && (
                <span className="inbox-sort-arrow">{sortOrder === 'desc' ? ' ↓' : ' ↑'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="inbox-bulk-actions">
          <button className="inbox-bulk-select-all" onClick={selectAll}>
            {selectedIds.size === filteredEmails.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="inbox-bulk-count">{selectedIds.size} selected</span>
          {onBulkMarkRead && (
            <button
              className="inbox-bulk-btn"
              onClick={() => onBulkMarkRead(Array.from(selectedIds), true)}
            >
              📖 Read
            </button>
          )}
          {onBulkDelete && (
            <button
              className="inbox-bulk-btn"
              onClick={() => {
                onBulkDelete(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
            >
              🗑️ Delete
            </button>
          )}
          {onBulkMove && (
            <button
              className="inbox-bulk-btn"
              onClick={() => onBulkMove(Array.from(selectedIds), 'archive')}
            >
              📦 Archive
            </button>
          )}
        </div>
      )}

      <div className="inbox-list-body">
        {filteredEmails.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
            {searchQuery ? 'No messages match your search' : 'No messages'}
          </div>
        ) : (
          filteredEmails.map((email) => (
            <div
              key={email.id}
              className={`inbox-item ${email.id === selectedId ? 'active' : ''} ${!email.read ? 'unread' : ''} ${selectedIds.has(email.id) ? 'checked' : ''}`}
              onClick={() => onSelect(email.id)}
            >
              {selectMode && (
                <input
                  type="checkbox"
                  className="inbox-item-checkbox"
                  checked={selectedIds.has(email.id)}
                  onChange={(e) => toggleSelect(email.id, e as any)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className="inbox-item-content">
                <div className="inbox-item-row">
                  <div className="inbox-item-meta">
                    {!email.read && <span className="inbox-item-unread-dot" />}
                    <span className="inbox-item-from">{email.from}</span>
                  </div>
                  <span className="inbox-item-date">{formatDate(email.date)}</span>
                </div>
                <div className="inbox-item-row">
                  <span className="inbox-item-subject">
                    {email.hasAttachments && <span className="inbox-item-attach-icon">📎</span>}
                    {email.subject}
                  </span>
                  <button
                    className="inbox-item-star"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(email.id);
                    }}
                  >
                    {email.starred ? '⭐' : '☆'}
                  </button>
                </div>
                <span className="inbox-item-preview">{email.body.replace(/<[^>]*>/g, '').slice(0, 80)}...</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
