import React, { useState } from 'react';
import { Document } from '@store/documentStore';
import { useDocumentStore } from '@store/documentStore';
import { Users, Link2, Copy, Mail, X, Check, Globe, Lock, Eye, Edit3, Crown } from 'lucide-react';
import { cn } from '@utils/cn';
import toast from 'react-hot-toast';

interface Props { document: Document | null; onClose: () => void; }

const MOCK_COLLABORATORS = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'owner' as const, online: true, color: '#ef4444', avatar: 'AJ' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'editor' as const, online: true, color: '#3b82f6', avatar: 'BS' },
  { id: '3', name: 'Carol White', email: 'carol@example.com', role: 'viewer' as const, online: false, color: '#22c55e', avatar: 'CW' },
];

export default function CollaborationPanel({ document, onClose }: Props) {
  const { shareDocument } = useDocumentStore();
  const [shareUrl, setShareUrl] = useState(document?.shareUrl || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [shareMode, setShareMode] = useState<'private' | 'link' | 'public'>('private');
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!document) return;
    const url = await shareDocument(document.id);
    setShareUrl(url);
    setShareMode('link');
    toast.success('Share link created!');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl || `https://eoffice.app/share/${document?.id}`);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
  };

  const RoleIcon = ({ role }: { role: string }) => {
    if (role === 'owner') return <Crown size={12} className="text-yellow-500" />;
    if (role === 'editor') return <Edit3 size={12} className="text-blue-500" />;
    return <Eye size={12} className="text-surface-400" />;
  };

  return (
    <div className="w-80 flex flex-col bg-white dark:bg-surface-900 border-l border-surface-200 dark:border-surface-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary-500" />
          <span className="text-sm font-semibold">Collaboration</span>
        </div>
        <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Share settings */}
        <div>
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Share Settings</p>
          <div className="space-y-2">
            {[
              { mode: 'private', icon: Lock, label: 'Private', desc: 'Only invited people can access' },
              { mode: 'link', icon: Link2, label: 'Anyone with link', desc: 'Anyone with the link can view' },
              { mode: 'public', icon: Globe, label: 'Public', desc: 'Anyone can find and view' },
            ].map(({ mode, icon: Icon, label, desc }) => (
              <button
                key={mode}
                onClick={() => { setShareMode(mode as any); if (mode !== 'private') handleShare(); }}
                className={cn('w-full flex items-start gap-3 p-3 rounded-xl border transition-all', shareMode === mode ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600')}
              >
                <Icon size={16} className={shareMode === mode ? 'text-primary-600 mt-0.5' : 'text-surface-400 mt-0.5'} />
                <div className="text-left">
                  <p className={cn('text-sm font-medium', shareMode === mode ? 'text-primary-700 dark:text-primary-400' : 'text-surface-700 dark:text-surface-300')}>{label}</p>
                  <p className="text-xs text-surface-400">{desc}</p>
                </div>
                {shareMode === mode && <Check size={14} className="text-primary-600 ml-auto mt-0.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Share link */}
        {shareMode !== 'private' && (
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Share Link</p>
            <div className="flex gap-2">
              <input
                value={shareUrl || `https://eoffice.app/share/${document?.id}`}
                readOnly
                className="input text-xs flex-1"
              />
              <button onClick={handleCopyLink} className={cn('btn-secondary px-3', copied && 'bg-green-50 text-green-600 border-green-200')}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Invite people */}
        <div>
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Invite People</p>
          <div className="flex gap-2 mb-2">
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder="Enter email address..."
              className="input text-xs flex-1"
              type="email"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as any)}
              className="input text-xs w-24"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button onClick={handleInvite} className="btn-primary w-full text-xs py-2">
            <Mail size={13} /> Send Invite
          </button>
        </div>

        {/* Collaborators list */}
        <div>
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
            Collaborators ({MOCK_COLLABORATORS.length})
          </p>
          <div className="space-y-2">
            {MOCK_COLLABORATORS.map(collab => (
              <div key={collab.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: collab.color }}>
                    {collab.avatar}
                  </div>
                  <div className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-surface-900', collab.online ? 'bg-green-500' : 'bg-surface-300')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{collab.name}</p>
                  <p className="text-xs text-surface-400 truncate">{collab.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <RoleIcon role={collab.role} />
                  <span className="text-xs text-surface-400 capitalize">{collab.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
