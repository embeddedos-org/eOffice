import { useState, useCallback, useEffect, useRef } from 'react';

export type Folder = 'inbox' | 'sent' | 'drafts' | string;

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
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
}

const SERVER_URL = 'http://localhost:3001';
const REFRESH_INTERVAL = 30000;

let nextId = 1;
const uid = () => `msg-${nextId++}`;

const SAMPLE_EMAILS: Email[] = [
  { id: uid(), from: 'alice@eoffice.com', to: 'me@eoffice.com', subject: 'Q2 Planning Meeting', body: 'Hi team,\n\nLet\'s schedule our Q2 planning meeting for next Tuesday at 2 PM.\n\nPlease come prepared with your OKR proposals.\n\nBest,\nAlice', date: '2026-04-03', read: false, starred: false, folder: 'inbox' },
  { id: uid(), from: 'bob@eoffice.com', to: 'me@eoffice.com', subject: 'Code Review: PR #142', body: 'Hey,\n\nI\'ve reviewed your PR. A few comments:\n\n1. Consider adding error handling in the auth module\n2. The test coverage looks good\n3. Minor style issue on line 45\n\nOverall LGTM with minor changes.\n\n— Bob', date: '2026-04-02', read: true, starred: true, folder: 'inbox' },
  { id: uid(), from: 'carol@eoffice.com', to: 'me@eoffice.com', subject: 'Design Assets Ready', body: 'Hi,\n\nThe design assets for the new landing page are ready for development.\n\nYou can find them in the shared drive.\n\nThanks,\nCarol', date: '2026-04-01', read: true, starred: false, folder: 'inbox' },
  { id: uid(), from: 'me@eoffice.com', to: 'team@eoffice.com', subject: 'Sprint Recap', body: 'Team,\n\nGreat work this sprint! We completed 15 story points and shipped 3 features.\n\nSee you at the retro tomorrow.\n\nCheers', date: '2026-03-31', read: true, starred: false, folder: 'sent' },
];

export function useMailbox() {
  const [messages, setMessages] = useState<Email[]>(SAMPLE_EMAILS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder>('inbox');
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [serverOnline, setServerOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedEmail = messages.find((m) => m.id === selectedId) || null;
  const folderMessages = messages.filter((m) => m.folder === currentFolder);
  const unreadCount = messages.filter((m) => m.folder === 'inbox' && !m.read).length;

  // Check server availability
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

  // Fetch accounts from server
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
      // Server offline, use mock mode
    }
  }, [account]);

  // Fetch messages from server
  const fetchMessages = useCallback(async (acct?: EmailAccount) => {
    const activeAccount = acct || account;
    if (!activeAccount) return;

    setLoading(true);
    try {
      const folderMap: Record<string, string> = {
        inbox: 'INBOX',
        sent: '[Gmail]/Sent Mail',
        drafts: '[Gmail]/Drafts',
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
        }));
        setMessages(mapped);
      }
    } catch {
      // Keep existing messages on error
    } finally {
      setLoading(false);
    }
  }, [account, currentFolder]);

  // Initialize: check server and fetch accounts
  useEffect(() => {
    checkServer().then((online) => {
      if (online) fetchAccounts();
    });
  }, [checkServer, fetchAccounts]);

  // Fetch messages when account or folder changes
  useEffect(() => {
    if (account && serverOnline) {
      fetchMessages();
    }
  }, [account, currentFolder, serverOnline, fetchMessages]);

  // Auto-refresh inbox
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
      if (account && serverOnline) {
        try {
          await fetch(`${SERVER_URL}/api/email/messages/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.id,
              to: email.to,
              subject: email.subject,
              body: email.body,
            }),
          });
          // Refresh to see sent message
          setTimeout(() => fetchMessages(), 1000);
          return { ...email, id: 'sending' };
        } catch {
          // Fall through to local add
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
          setMessages((prev) => prev.filter((m) => m.id !== id));
          setSelectedId((prev) => (prev === id ? null : prev));
          return;
        } catch {
          // Fall through to local delete
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
          // Optimistic update below
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
          // Optimistic update below
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
    setCurrentFolder,
    selectEmail,
    addMessage,
    deleteMessage,
    markRead,
    toggleStar,
    switchAccount,
    refreshInbox,
    fetchAccounts,
  };
}
