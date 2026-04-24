import { useState } from 'react';

export interface EmailRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    field: 'from' | 'subject' | 'body' | 'to';
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
    value: string;
  };
  action: {
    type: 'move' | 'markRead' | 'star' | 'delete' | 'label';
    target?: string;
  };
}

interface RulesEditorProps {
  rules: EmailRule[];
  onSave: (rule: EmailRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
  folders: string[];
}

const STORAGE_KEY = 'eoffice-email-rules';

export function loadRules(): EmailRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveRules(rules: EmailRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function applyRules(rules: EmailRule[], email: { from: string; to: string; subject: string; body: string }) {
  const actions: EmailRule['action'][] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const fieldValue = email[rule.condition.field] || '';
    let matches = false;
    switch (rule.condition.operator) {
      case 'contains':
        matches = fieldValue.toLowerCase().includes(rule.condition.value.toLowerCase());
        break;
      case 'equals':
        matches = fieldValue.toLowerCase() === rule.condition.value.toLowerCase();
        break;
      case 'startsWith':
        matches = fieldValue.toLowerCase().startsWith(rule.condition.value.toLowerCase());
        break;
      case 'endsWith':
        matches = fieldValue.toLowerCase().endsWith(rule.condition.value.toLowerCase());
        break;
    }
    if (matches) actions.push(rule.action);
  }
  return actions;
}

export default function RulesEditor({
  rules,
  onSave,
  onDelete,
  onToggle,
  onClose,
  folders,
}: RulesEditorProps) {
  const [editingRule, setEditingRule] = useState<EmailRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleNew = () => {
    setIsNew(true);
    setEditingRule({
      id: `rule-${Date.now()}`,
      name: '',
      enabled: true,
      condition: { field: 'from', operator: 'contains', value: '' },
      action: { type: 'move', target: 'archive' },
    });
  };

  const handleSave = () => {
    if (editingRule && editingRule.name.trim() && editingRule.condition.value.trim()) {
      onSave(editingRule);
      setEditingRule(null);
      setIsNew(false);
    }
  };

  return (
    <div className="composer-overlay" onClick={onClose}>
      <div className="rules-editor" onClick={(e) => e.stopPropagation()}>
        <div className="rules-editor-header">
          <h3>📋 Email Rules</h3>
          <button className="composer-close" onClick={onClose}>✕</button>
        </div>

        <div className="rules-editor-body">
          <div className="rules-list">
            {rules.length === 0 && !editingRule && (
              <div className="rules-empty">
                No rules yet. Create a rule to automatically organize your emails.
              </div>
            )}
            {rules.map((rule) => (
              <div key={rule.id} className={`rules-item ${!rule.enabled ? 'disabled' : ''}`}>
                <div className="rules-item-header">
                  <label className="rules-toggle">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => onToggle(rule.id)}
                    />
                    <span className="rules-toggle-slider" />
                  </label>
                  <span className="rules-item-name">{rule.name}</span>
                  <div className="rules-item-actions">
                    <button
                      onClick={() => {
                        setEditingRule({ ...rule });
                        setIsNew(false);
                      }}
                    >
                      ✏️
                    </button>
                    <button onClick={() => onDelete(rule.id)}>🗑️</button>
                  </div>
                </div>
                <div className="rules-item-desc">
                  If <strong>{rule.condition.field}</strong>{' '}
                  <em>{rule.condition.operator}</em>{' '}
                  "{rule.condition.value}" → <strong>{rule.action.type}</strong>
                  {rule.action.target && ` to ${rule.action.target}`}
                </div>
              </div>
            ))}
            <button className="rules-new-btn" onClick={handleNew}>
              + New Rule
            </button>
          </div>

          {editingRule && (
            <div className="rules-edit-form">
              <h4>{isNew ? 'Create Rule' : 'Edit Rule'}</h4>
              <label className="rules-form-field">
                <span>Rule Name</span>
                <input
                  value={editingRule.name}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, name: e.target.value })
                  }
                  placeholder="e.g., Move newsletters to Archive"
                />
              </label>

              <div className="rules-condition-section">
                <span className="rules-form-label">If</span>
                <select
                  value={editingRule.condition.field}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      condition: { ...editingRule.condition, field: e.target.value as any },
                    })
                  }
                >
                  <option value="from">From</option>
                  <option value="to">To</option>
                  <option value="subject">Subject</option>
                  <option value="body">Body</option>
                </select>
                <select
                  value={editingRule.condition.operator}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      condition: { ...editingRule.condition, operator: e.target.value as any },
                    })
                  }
                >
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                  <option value="startsWith">starts with</option>
                  <option value="endsWith">ends with</option>
                </select>
                <input
                  value={editingRule.condition.value}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      condition: { ...editingRule.condition, value: e.target.value },
                    })
                  }
                  placeholder="Value..."
                />
              </div>

              <div className="rules-action-section">
                <span className="rules-form-label">Then</span>
                <select
                  value={editingRule.action.type}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      action: { ...editingRule.action, type: e.target.value as any },
                    })
                  }
                >
                  <option value="move">Move to folder</option>
                  <option value="markRead">Mark as read</option>
                  <option value="star">Star</option>
                  <option value="delete">Delete</option>
                </select>
                {editingRule.action.type === 'move' && (
                  <select
                    value={editingRule.action.target || ''}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        action: { ...editingRule.action, target: e.target.value },
                      })
                    }
                  >
                    <option value="">Select folder...</option>
                    <option value="archive">Archive</option>
                    <option value="spam">Spam</option>
                    <option value="trash">Trash</option>
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="rules-form-actions">
                <button
                  className="composer-btn"
                  onClick={() => {
                    setEditingRule(null);
                    setIsNew(false);
                  }}
                >
                  Cancel
                </button>
                <button className="composer-btn primary" onClick={handleSave}>
                  {isNew ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
