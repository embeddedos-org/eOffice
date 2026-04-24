import { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import FolderTree from './components/FolderTree';
import InboxList from './components/InboxList';
import EmailViewer from './components/EmailViewer';
import EmailComposer from './components/EmailComposer';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import AccountSetup from './components/AccountSetup';
import ContactsPanel from './components/ContactsPanel';
import type { Contact } from './components/ContactsPanel';
import SearchBar from './components/SearchBar';
import type { SearchFilters } from './components/SearchBar';
import SignatureEditor, {
  loadSignatures,
  saveSignatures,
  getDefaultSignature,
} from './components/SignatureEditor';
import type { EmailSignature } from './components/SignatureEditor';
import RulesEditor, { loadRules, saveRules } from './components/RulesEditor';
import type { EmailRule } from './components/RulesEditor';
import { useMailbox } from './hooks/useMailbox';
import { useEBot } from './hooks/useEBot';
import { API_URL } from '../../shared/config';

const SERVER_URL = API_URL;

type SidePanel = 'none' | 'contacts' | 'search';

export default function App() {
  const [ebotOpen, setEbotOpen] = useState(false);
  const [ebotResponse, setEbotResponse] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDefaults, setComposerDefaults] = useState({ to: '', subject: '', body: '' });
  const [accountSetupOpen, setAccountSetupOpen] = useState(false);
  const [signatureEditorOpen, setSignatureEditorOpen] = useState(false);
  const [rulesEditorOpen, setRulesEditorOpen] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');

  const [signatures, setSignatures] = useState<EmailSignature[]>(loadSignatures());
  const [rules, setRules] = useState<EmailRule[]>(loadRules());
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const stored = localStorage.getItem('eoffice-email-contacts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [searchResults, setSearchResults] = useState<null | number>(null);
  const [isSearching, setIsSearching] = useState(false);

  const mailbox = useMailbox();
  const ebot = useEBot();

  const handleCompose = useCallback(() => {
    setComposerDefaults({ to: '', subject: '', body: '' });
    setComposerOpen(true);
  }, []);

  const handleComposeToContact = useCallback((email: string) => {
    setComposerDefaults({ to: email, subject: '', body: '' });
    setComposerOpen(true);
  }, []);

  const handleReply = useCallback(() => {
    if (!mailbox.selectedEmail) return;
    const email = mailbox.selectedEmail;
    setComposerDefaults({
      to: email.from,
      subject: `Re: ${email.subject}`,
      body: `\n\n--- Original Message ---\nFrom: ${email.from}\n${email.body}`,
    });
    setComposerOpen(true);
  }, [mailbox.selectedEmail]);

  const handleForward = useCallback(() => {
    if (!mailbox.selectedEmail) return;
    const email = mailbox.selectedEmail;
    setComposerDefaults({
      to: '',
      subject: `Fwd: ${email.subject}`,
      body: `\n\n--- Forwarded Message ---\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`,
    });
    setComposerOpen(true);
  }, [mailbox.selectedEmail]);

  const handleSend = useCallback(
    (to: string, subject: string, body: string, cc?: string, bcc?: string, files?: File[]) => {
      mailbox.addMessage({
        from: mailbox.account?.email || 'me@eoffice.com',
        to,
        subject,
        body,
        date: new Date().toISOString().split('T')[0],
        read: true,
        starred: false,
        folder: 'sent',
        hasAttachments: (files?.length || 0) > 0,
      });

      // Auto-add contact
      if (to && !contacts.find((c) => c.email === to)) {
        const newContact: Contact = {
          id: `contact-${Date.now()}`,
          name: to.split('@')[0],
          email: to,
          lastContacted: new Date().toISOString(),
        };
        const updated = [...contacts, newContact];
        setContacts(updated);
        localStorage.setItem('eoffice-email-contacts', JSON.stringify(updated));
      }
    },
    [mailbox, contacts],
  );

  const handleSaveDraft = useCallback(
    (to: string, subject: string, body: string) => {
      mailbox.addMessage({
        from: mailbox.account?.email || 'me@eoffice.com',
        to,
        subject,
        body,
        date: new Date().toISOString().split('T')[0],
        read: true,
        starred: false,
        folder: 'drafts',
        hasAttachments: false,
      });
    },
    [mailbox],
  );

  // Signature handlers
  const handleSaveSignature = useCallback((sig: EmailSignature) => {
    setSignatures((prev) => {
      const updated = prev.find((s) => s.id === sig.id)
        ? prev.map((s) => (s.id === sig.id ? sig : s))
        : [...prev, sig];
      saveSignatures(updated);
      return updated;
    });
  }, []);

  const handleDeleteSignature = useCallback((id: string) => {
    setSignatures((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSignatures(updated);
      return updated;
    });
  }, []);

  const handleSetDefaultSignature = useCallback((id: string) => {
    setSignatures((prev) => {
      const updated = prev.map((s) => ({ ...s, isDefault: s.id === id }));
      saveSignatures(updated);
      return updated;
    });
  }, []);

  // Rules handlers
  const handleSaveRule = useCallback((rule: EmailRule) => {
    setRules((prev) => {
      const updated = prev.find((r) => r.id === rule.id)
        ? prev.map((r) => (r.id === rule.id ? rule : r))
        : [...prev, rule];
      saveRules(updated);
      return updated;
    });
  }, []);

  const handleDeleteRule = useCallback((id: string) => {
    setRules((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveRules(updated);
      return updated;
    });
  }, []);

  const handleToggleRule = useCallback((id: string) => {
    setRules((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      );
      saveRules(updated);
      return updated;
    });
  }, []);

  // Contact handlers
  const handleAddContact = useCallback((contact: Omit<Contact, 'id'>) => {
    const newContact: Contact = { ...contact, id: `contact-${Date.now()}` };
    setContacts((prev) => {
      const updated = [...prev, newContact];
      localStorage.setItem('eoffice-email-contacts', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDeleteContact = useCallback((id: string) => {
    setContacts((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem('eoffice-email-contacts', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Search handler
  const handleSearch = useCallback(async (filters: SearchFilters) => {
    setIsSearching(true);
    // Client-side search for now
    const q = filters.query.toLowerCase();
    const results = mailbox.messages.filter((m) => {
      if (q && !m.from.toLowerCase().includes(q) && !m.subject.toLowerCase().includes(q) && !m.body.toLowerCase().includes(q)) return false;
      if (filters.sender && !m.from.toLowerCase().includes(filters.sender.toLowerCase())) return false;
      if (filters.dateFrom && m.date < filters.dateFrom) return false;
      if (filters.dateTo && m.date > filters.dateTo) return false;
      if (filters.folder && m.folder !== filters.folder) return false;
      if (filters.hasAttachment && !m.hasAttachments) return false;
      return true;
    });
    setSearchResults(results.length);
    setIsSearching(false);
  }, [mailbox.messages]);

  // Folder management
  const handleCreateFolder = useCallback((name: string) => {
    mailbox.createFolder?.(name);
  }, [mailbox]);

  const handleRenameFolder = useCallback((_path: string, _newName: string) => {
    // TODO: IMAP folder rename
  }, []);

  const handleDeleteFolder = useCallback((_path: string) => {
    // TODO: IMAP folder delete
  }, []);

  // Bulk actions
  const handleBulkDelete = useCallback((ids: string[]) => {
    ids.forEach((id) => mailbox.deleteMessage(id));
  }, [mailbox]);

  const handleBulkMarkRead = useCallback((_ids: string[], _read: boolean) => {
    _ids.forEach((id) => mailbox.markRead(id));
  }, [mailbox]);

  const handleEBotAction = useCallback(
    async (action: string) => {
      if (!ebot.connected) return;
      setEbotResponse('');
      try {
        let response = '';
        switch (action) {
          case 'draft-reply': {
            if (!mailbox.selectedEmail) {
              response = '⚠️ Select an email first to draft a reply.';
            } else {
              const { from, subject, body } = mailbox.selectedEmail;
              response = await ebot.draftReply(`From: ${from}\nSubject: ${subject}\n\n${body}`);
              response = `↩️ **Draft Reply**\n\n${response}`;
            }
            break;
          }
          case 'summarize': {
            if (!mailbox.selectedEmail) {
              response = '⚠️ Select an email first to summarize.';
            } else {
              response = await ebot.summarizeThread(mailbox.selectedEmail.body);
              response = `📋 **Summary**\n\n${response}`;
            }
            break;
          }
          case 'smart-compose': {
            response = await ebot.smartCompose('a follow-up on the latest project status');
            response = `✨ **Smart Compose**\n\n${response}`;
            break;
          }
          case 'extract-tasks': {
            if (!mailbox.selectedEmail) {
              response = '⚠️ Select an email first to extract tasks.';
            } else {
              response = await ebot.extractTasks(mailbox.selectedEmail.body);
              response = `✅ **Extracted Tasks**\n\n${response}`;
            }
            break;
          }
          case 'spell-check': {
            if (!mailbox.selectedEmail) {
              response = '⚠️ Select an email first.';
            } else {
              const result = await ebot.spellCheck(mailbox.selectedEmail.body);
              if (result.suggestions.length === 0) {
                response = '📝 **Spell Check**\n\n✅ No issues found!';
              } else {
                response = `📝 **Spell Check** — ${result.suggestions.length} issue(s):\n\n${result.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Corrected:**\n${result.corrected}`;
              }
            }
            break;
          }
          case 'improve': {
            if (!mailbox.selectedEmail) {
              response = '⚠️ Select an email first.';
            } else {
              response = await ebot.improveWriting(mailbox.selectedEmail.body);
              response = `💡 **Improved Version**\n\n${response}`;
            }
            break;
          }
          case 'rewrite-formal': {
            if (!mailbox.selectedEmail) {
              response = '⚠️ Select an email first.';
            } else {
              response = await ebot.rewriteText(mailbox.selectedEmail.body, 'formal');
              response = `👔 **Formal Rewrite**\n\n${response}`;
            }
            break;
          }
          case 'rewrite-concise': {
            if (!mailbox.selectedEmail) {
              response = '⚠️ Select an email first.';
            } else {
              response = await ebot.rewriteText(mailbox.selectedEmail.body, 'concise');
              response = `✂️ **Concise Rewrite**\n\n${response}`;
            }
            break;
          }
          default:
            response = `eBot processed "${action}".`;
        }
        setEbotResponse(response);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setEbotResponse(`❌ **eBot Error**\n\n${msg}`);
      }
    },
    [ebot, mailbox.selectedEmail],
  );

  const folderList = ['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive'];

  return (
    <div className="email-app">
      <TopBar
        currentFolder={mailbox.currentFolder}
        onFolderChange={mailbox.setCurrentFolder}
        onCompose={handleCompose}
        ebotSidebarOpen={ebotOpen}
        onToggleEBot={() => setEbotOpen((p) => !p)}
        connected={ebot.connected}
        unreadCount={mailbox.unreadCount}
        account={mailbox.account}
        serverOnline={mailbox.serverOnline}
        onOpenAccountSetup={() => setAccountSetupOpen(true)}
        onRefresh={mailbox.refreshInbox}
        loading={mailbox.loading}
        onOpenSignatures={() => setSignatureEditorOpen(true)}
        onOpenRules={() => setRulesEditorOpen(true)}
        onToggleContacts={() => setSidePanel(sidePanel === 'contacts' ? 'none' : 'contacts')}
        onToggleSearch={() => setSidePanel(sidePanel === 'search' ? 'none' : 'search')}
      />

      <div className="email-body">
        <FolderTree
          folders={mailbox.imapFolders || []}
          currentFolder={mailbox.currentFolder}
          onFolderSelect={mailbox.setCurrentFolder}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
        />

        <div className="email-center">
          {sidePanel === 'search' && (
            <SearchBar
              onSearch={handleSearch}
              onClear={() => setSearchResults(null)}
              folders={folderList}
              isSearching={isSearching}
              resultCount={searchResults}
            />
          )}
          <InboxList
            emails={mailbox.folderMessages}
            selectedId={mailbox.selectedId}
            onSelect={mailbox.selectEmail}
            onToggleStar={mailbox.toggleStar}
            folderLabel={mailbox.currentFolder.charAt(0).toUpperCase() + mailbox.currentFolder.slice(1)}
            onBulkDelete={handleBulkDelete}
            onBulkMarkRead={handleBulkMarkRead}
          />
        </div>

        <EmailViewer
          email={mailbox.selectedEmail}
          onReply={handleReply}
          onForward={handleForward}
          onDelete={mailbox.deleteMessage}
        />

        {sidePanel === 'contacts' && (
          <ContactsPanel
            contacts={contacts}
            onComposeToContact={handleComposeToContact}
            onAddContact={handleAddContact}
            onDeleteContact={handleDeleteContact}
          />
        )}

        <EBotSidebar
          open={ebotOpen}
          connected={ebot.connected}
          response={ebotResponse}
          isLoading={ebot.loading}
          onAction={handleEBotAction}
          onClose={() => setEbotOpen(false)}
        />
      </div>

      {composerOpen && (
        <EmailComposer
          initialTo={composerDefaults.to}
          initialSubject={composerDefaults.subject}
          initialBody={composerDefaults.body}
          onSend={handleSend}
          onSaveDraft={handleSaveDraft}
          onClose={() => setComposerOpen(false)}
          onSpellCheck={ebot.connected ? ebot.spellCheck : undefined}
          onRewrite={ebot.connected ? ebot.rewriteText : undefined}
          onImprove={ebot.connected ? ebot.improveWriting : undefined}
          ebotConnected={ebot.connected}
          ebotLoading={ebot.loading}
          signatures={signatures}
          defaultSignature={getDefaultSignature()}
        />
      )}

      {accountSetupOpen && (
        <AccountSetup
          serverUrl={SERVER_URL}
          onClose={() => setAccountSetupOpen(false)}
          onAccountAdded={() => {
            mailbox.fetchAccounts();
          }}
        />
      )}

      {signatureEditorOpen && (
        <SignatureEditor
          signatures={signatures}
          onSave={handleSaveSignature}
          onDelete={handleDeleteSignature}
          onSetDefault={handleSetDefaultSignature}
          onClose={() => setSignatureEditorOpen(false)}
        />
      )}

      {rulesEditorOpen && (
        <RulesEditor
          rules={rules}
          onSave={handleSaveRule}
          onDelete={handleDeleteRule}
          onToggle={handleToggleRule}
          onClose={() => setRulesEditorOpen(false)}
          folders={folderList}
        />
      )}

      <StatusBar
        messageCount={mailbox.folderMessages.length}
        unreadCount={mailbox.unreadCount}
        connected={ebot.connected}
        currentFolder={mailbox.currentFolder}
        serverOnline={mailbox.serverOnline}
        accountEmail={mailbox.account?.email}
      />
    </div>
  );
}
