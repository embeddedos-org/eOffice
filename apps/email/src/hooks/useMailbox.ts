import { useState, useCallback, useEffect, useRef } from 'react';
import type { FolderInfo } from '../components/FolderTree';
import { API_URL } from '../../../shared/config';

export type Folder = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive' | string;

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: Folder;
  hasAttachments?: boolean;
  cc?: string;
  bcc?: string;
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
}

const SERVER_URL = API_URL;
const REFRESH_INTERVAL = 30000;

let nextId = 1;
const uid = () => `msg-${nextId++}`;

const SAMPLE_EMAILS: Email[] = [
  { id: uid(), from: 'alice@eoffice.com', to: 'me@eoffice.com', subject: 'Q2 Planning Meeting', body: 'Hi team,\n\nLet\'s schedule our Q2 planning meeting for next Tuesday at 2 PM.\n\nPlease come prepared with your OKR proposals.\n\nBest,\nAlice', date: '2026-04-03', read: false, starred: false, folder: 'inbox', hasAttachments: false },
  { id: uid(), from: 'bob@eoffice.com', to: 'me@eoffice.com', subject: 'Code Review: PR #142', body: 'Hey,\n\nI\'ve reviewed your PR. A few comments:\n\n1. Consider adding error handling in the auth module\n2. The test coverage looks good\n3. Minor style issue on line 45\n\nOverall LGTM with minor changes.\n\n— Bob', date: '2026-04-02', read: true, starred: true, folder: 'inbox', hasAttachments: true },
  { id: uid(), from: 'carol@eoffice.com', to: 'me@eoffice.com', subject: 'Design Assets Ready', body: 'Hi,\n\nThe design assets for the new landing page are ready for development.\n\nYou can find them in the shared drive.\n\nThanks,\nCarol', date: '2026-04-01', read: true, starred: false, folder: 'inbox', hasAttachments: true },
  { id: uid(), from: 'me@eoffice.com', to: 'team@eoffice.com', subject: 'Sprint Recap', body: 'Team,\n\nGreat work this sprint! We completed 15 story points and shipped 3 features.\n\nSee you at the retro tomorrow.\n\nCheers', date: '2026-03-31', read: true, starred: false, folder: 'sent', hasAttachments: false },
  { id: uid(), from: 'newsletter@tech.com', to: 'me@eoffice.com', subject: 'Weekly Tech Digest', body: 'This week in tech:\n\n• AI advances in code generation\n• New framework releases\n• Cloud computing trends\n\nRead more at tech.com', date: '2026-04-03', read: false, starred: false, folder: 'inbox', hasAttachments: false },
  { id: uid(), from: 'me@eoffice.com', to: 'alice@eoffice.com', subject: 'Re: Q2 Planning Meeting', body: 'Hi Alice,\n\nTuesday at 2 PM works for me. I\'ll prepare the engineering OKRs.\n\nBest,\nMe', date: '2026-04-03', read: true, starred: false, folder: 'sent', hasAttachments: false },
  { id: uid(), from: 'me@eoffice.com', to: 'bob@eoffice.com', subject: 'Draft: Project Proposal', body: 'Working on the project proposal for Q3. Need to finalize the budget section.', date: '2026-04-04', read: true, starred: false, folder: 'drafts', hasAttachments: false },
];

export function useMailbox() {
  const [messages, setMessages] = useState<Email[]>(SAMPLE_EMAILS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder>('inbox');
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [serverOnline, setServerOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imapFolders, setImapFolders] = useState<FolderInfo[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedEmail = messages.find((m) => m.id === selectedId) || null;
  const folderMessages = messages.filter((m) => m.folder === currentFolder);
  const unreadCount = messages.filter((m) => m.folder === 'inbox' && !m.read).length;

  const checkServer = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`${SERVER_URL}/api/health`, { signal: ctrl.signal });
      clearTimeout(tid);
      setServerOnline(res.ok);
      return res.ok;
    } catch {
      setServerOnline(false);
      return false;
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/email/accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        if (data.accounts?.length > 0 && !account) {
          setAccount(data.accounts[0]);
        }
      }
    } catch {
      // Server offline
    }
  }, [account]);

  const fetchFolders = useCallback(async (acct?: EmailAccount) => {
    const activeAccount = acct || account;
    if (!activeAccount) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/email/folders?accountId=${activeAccount.id}`);
      if (res.ok) {
        const data = await res.json();
        const mapped: FolderInfo[] = (data.folders || []).map((f: any) => ({
          name: f.name,
          path: f.path,
          icon: getFolderIcon(f.specialUse || f.name),
          unreadCount: f.unseenCount || 0,
          specialUse: f.specialUse,
        }));
        setImapFolders(mapped);
      }
    } catch {
      // Use defaults
    }
  }, [account]);

  const fetchMessages = useCallback(async (acct?: EmailAccount) => {
    const activeAccount = acct || account;
    if (!activeAccount) return;

    setLoading(true);
    try {
      const folderMap: Record<string, string> = {
        inbox: 'INBOX',
        sent: '[Gmail]/Sent Mail',
        drafts: '[Gmail]/Drafts',
        spam: '[Gmail]/Spam',
        trash: '[Gmail]/Trash',
        archive: '[Gmail]/All Mail',
      };
      const imapFolder = folderMap[currentFolder] || currentFolder;
      const res = await fetch(
        `${SERVER_URL}/api/email/messages?accountId=${activeAccount.id}&folder=${encodeURIComponent(imapFolder)}`
      );
      if (res.ok) {
        const data = await res.json();
        const mapped: Email[] = (data.messages || []).map((m: any) => ({
          id: m.id || m.uid?.toString(),
          from: m.fromName || m.from,
          to: m.to,
          subject: m.subject,
          body: m.body || m.html || '',
          date: m.date,
          read: m.read,
          starred: m.starred,
          folder: currentFolder,
          hasAttachments: m.hasAttachments || false,
          cc: m.cc,
          bcc: m.bcc,
        }));
        setMessages(mapped);
      }
    } catch {
      // Keep existing messages
    } finally {
      setLoading(false);
    }
  }, [account, currentFolder]);

  useEffect(() => {
    checkServer().then((online) => {
      if (online) fetchAccounts();
    });
  }, [checkServer, fetchAccounts]);

  useEffect(() => {
    if (account && serverOnline) {
      fetchMessages();
      fetchFolders();
    }
  }, [account, currentFolder, serverOnline, fetchMessages, fetchFolders]);

  useEffect(() => {
    if (account && serverOnline) {
      refreshTimer.current = setInterval(() => {
        fetchMessages();
      }, REFRESH_INTERVAL);
      return () => {
        if (refreshTimer.current) clearInterval(refreshTimer.current);
      };
    }
  }, [account, serverOnline, fetchMessages]);

  const addMessage = useCallback(
    async (email: Omit<Email, 'id'>) => {
      if (account && serverOnline && email.folder === 'sent') {
        try {
          await fetch(`${SERVER_URL}/api/email/messages/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.id,
              to: email.to,
              subject: email.subject,
              body: email.body,
              cc: email.cc,
              bcc: email.bcc,
            }),
          });
          setTimeout(() => fetchMessages(), 1000);
          return { ...email, id: 'sending' };
        } catch {
          // Fall through to local
        }
      }
      const newEmail = { ...email, id: uid() };
      setMessages((prev) => [newEmail, ...prev]);
      return newEmail;
    },
    [account, serverOnline, fetchMessages],
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      if (account && serverOnline) {
        try {
          const folderMap: Record<string, string> = { inbox: 'INBOX', sent: '[Gmail]/Sent Mail', drafts: '[Gmail]/Drafts' };
          const imapFolder = folderMap[currentFolder] || currentFolder;
          await fetch(`${SERVER_URL}/api/email/messages/${id}?accountId=${account.id}&folder=${encodeURIComponent(imapFolder)}`, {
            method: 'DELETE',
          });
        } catch {
          // Fall through
        }
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    },
    [account, serverOnline, currentFolder],
  );

  const markRead = useCallback(
    async (id: string) => {
      if (account && serverOnline) {
        try {
          const folderMap: Record<string, string> = { inbox: 'INBOX', sent: '[Gmail]/Sent Mail', drafts: '[Gmail]/Drafts' };
          const imapFolder = folderMap[currentFolder] || currentFolder;
          await fetch(`${SERVER_URL}/api/email/messages/${id}/read`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: account.id, folder: imapFolder, read: true }),
          });
        } catch {
          // Optimistic
        }
      }
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    },
    [account, serverOnline, currentFolder],
  );

  const toggleStar = useCallback(
    async (id: string) => {
      const msg = messages.find((m) => m.id === id);
      if (account && serverOnline && msg) {
        try {
          const folderMap: Record<string, string> = { inbox: 'INBOX', sent: '[Gmail]/Sent Mail', drafts: '[Gmail]/Drafts' };
          const imapFolder = folderMap[currentFolder] || currentFolder;
          await fetch(`${SERVER_URL}/api/email/messages/${id}/star`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: account.id, folder: imapFolder, starred: !msg.starred }),
          });
        } catch {
          // Optimistic
        }
      }
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)));
    },
    [account, serverOnline, currentFolder, messages],
  );

  const selectEmail = useCallback((id: string) => {
    setSelectedId(id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  }, []);

  const switchAccount = useCallback((acct: EmailAccount) => {
    setAccount(acct);
    setSelectedId(null);
    setMessages([]);
  }, []);

  const refreshInbox = useCallback(() => {
    if (account && serverOnline) fetchMessages();
  }, [account, serverOnline, fetchMessages]);

  const createFolder = useCallback(async (name: string) => {
    if (account && serverOnline) {
      try {
        await fetch(`${SERVER_URL}/api/email/folders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account.id, name }),
        });
        fetchFolders();
      } catch {
        // Local fallback
        setImapFolders((prev) => [
          ...prev,
          { name, path: name.toLowerCase(), icon: '📁', unreadCount: 0 },
        ]);
      }
    } else {
      setImapFolders((prev) => [
        ...prev,
        { name, path: name.toLowerCase(), icon: '📁', unreadCount: 0 },
      ]);
    }
  }, [account, serverOnline, fetchFolders]);

  return {
    messages,
    folderMessages,
    selectedEmail,
    selectedId,
    currentFolder,
    unreadCount,
    account,
    accounts,
    serverOnline,
    loading,
    imapFolders,
    setCurrentFolder,
    selectEmail,
    addMessage,
    deleteMessage,
    markRead,
    toggleStar,
    switchAccount,
    refreshInbox,
    fetchAccounts,
    createFolder,
  };
}

function getFolderIcon(nameOrSpecial: string): string {
  const lower = nameOrSpecial.toLowerCase();
  if (lower.includes('inbox') || lower === '\\inbox') return '📥';
  if (lower.includes('sent') || lower === '\\sent') return '📤';
  if (lower.includes('draft') || lower === '\\drafts') return '📝';
  if (lower.includes('spam') || lower.includes('junk') || lower === '\\junk') return '⚠️';
  if (lower.includes('trash') || lower === '\\trash') return '🗑️';
  if (lower.includes('archive') || lower === '\\archive') return '📦';
  if (lower.includes('star') || lower.includes('flag')) return '⭐';
  return '📁';
}
