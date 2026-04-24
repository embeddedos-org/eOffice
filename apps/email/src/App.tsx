import { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import InboxList from './components/InboxList';
import EmailViewer from './components/EmailViewer';
import EmailComposer from './components/EmailComposer';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import AccountSetup from './components/AccountSetup';
import { useMailbox } from './hooks/useMailbox';
import { useEBot } from './hooks/useEBot';

const SERVER_URL = 'http://localhost:3001';

export default function App() {
  const [ebotOpen, setEbotOpen] = useState(false);
  const [ebotResponse, setEbotResponse] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDefaults, setComposerDefaults] = useState({ to: '', subject: '', body: '' });
  const [accountSetupOpen, setAccountSetupOpen] = useState(false);

  const mailbox = useMailbox();
  const ebot = useEBot();

  const folderLabels = { inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts' };

  const handleCompose = useCallback(() => {
    setComposerDefaults({ to: '', subject: '', body: '' });
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
    (to: string, subject: string, body: string) => {
      mailbox.addMessage({
        from: mailbox.account?.email || 'me@eoffice.com',
        to,
        subject,
        body,
        date: new Date().toISOString().split('T')[0],
        read: true,
        starred: false,
        folder: 'sent',
      });
    },
    [mailbox],
  );

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
      />
      <div className="email-body">
        <InboxList
          emails={mailbox.folderMessages}
          selectedId={mailbox.selectedId}
          onSelect={mailbox.selectEmail}
          onToggleStar={mailbox.toggleStar}
          folderLabel={folderLabels[mailbox.currentFolder as keyof typeof folderLabels] || mailbox.currentFolder}
        />
        <EmailViewer
          email={mailbox.selectedEmail}
          onReply={handleReply}
          onForward={handleForward}
          onDelete={mailbox.deleteMessage}
        />
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
          onClose={() => setComposerOpen(false)}
          onSpellCheck={ebot.connected ? ebot.spellCheck : undefined}
          onRewrite={ebot.connected ? ebot.rewriteText : undefined}
          onImprove={ebot.connected ? ebot.improveWriting : undefined}
          ebotConnected={ebot.connected}
          ebotLoading={ebot.loading}
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
      <StatusBar
        messageCount={mailbox.folderMessages.length}
        unreadCount={mailbox.unreadCount}
        connected={ebot.connected}
      />
    </div>
  );
}
