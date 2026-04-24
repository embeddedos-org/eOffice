import { useState } from 'react';

interface AccountSetupProps {
  onClose: () => void;
  onAccountAdded: () => void;
  serverUrl: string;
}

const PROVIDERS = [
  { id: 'gmail', name: 'Gmail', icon: '📧', desc: 'Google Mail (imap.gmail.com)' },
  { id: 'outlook', name: 'Outlook', icon: '📬', desc: 'Microsoft 365 (outlook.office365.com)' },
  { id: 'yahoo', name: 'Yahoo', icon: '📨', desc: 'Yahoo Mail (imap.mail.yahoo.com)' },
  { id: 'custom', name: 'Custom', icon: '⚙️', desc: 'Manual IMAP/SMTP configuration' },
];

export default function AccountSetup({ onClose, onAccountAdded, serverUrl }: AccountSetupProps) {
  const [provider, setProvider] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [useTLS, setUseTLS] = useState(true);
  const [status, setStatus] = useState<'idle' | 'testing' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isCustom = provider === 'custom';

  const handleTest = async () => {
    if (!email || !password) {
      setErrorMsg('Email and password are required');
      setStatus('error');
      return;
    }

    setStatus('saving');
    setErrorMsg('');

    try {
      // First add the account
      const addRes = await fetch(`${serverUrl}/api/email/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email,
          password,
          ...(isCustom ? { imapHost, imapPort, smtpHost, smtpPort, useTLS } : {}),
        }),
      });

      if (!addRes.ok) {
        const err = await addRes.json();
        throw new Error(err.error || 'Failed to add account');
      }

      const { id } = await addRes.json();

      // Test the connection
      setStatus('testing');
      const testRes = await fetch(`${serverUrl}/api/email/accounts/${id}/test`, {
        method: 'POST',
      });
      const testResult = await testRes.json();

      if (testResult.imap && testResult.smtp) {
        setStatus('success');
        setTimeout(() => {
          onAccountAdded();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(testResult.error || 'Connection failed');
        setStatus('error');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus('error');
    }
  };

  return (
    <div className="composer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="composer" style={{ width: 480, maxHeight: '85vh' }}>
        <div className="composer-header">
          <h3>📧 Add Email Account</h3>
          <button className="composer-close" onClick={onClose}>✕</button>
        </div>

        {!provider ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Select your email provider:
            </p>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                }}
              >
                <span style={{ fontSize: 24 }}>{p.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{p.desc}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <button
                onClick={() => setProvider('')}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}
              >
                ← Back
              </button>
              <span style={{ fontWeight: 600 }}>
                {PROVIDERS.find((p) => p.id === provider)?.icon}{' '}
                {PROVIDERS.find((p) => p.id === provider)?.name}
              </span>
            </div>

            <label>
              Email Address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password / App Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={provider === 'gmail' ? 'Use an App Password from Google Account' : 'Your email password'}
              />
            </label>

            {provider === 'gmail' && (
              <div
                style={{
                  fontSize: 11,
                  padding: '8px 10px',
                  background: 'var(--accent-light)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                💡 <strong>Gmail requires an App Password.</strong> Go to{' '}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">
                  Google App Passwords
                </a>{' '}
                to generate one. 2FA must be enabled.
              </div>
            )}

            {isCustom && (
              <>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    IMAP Settings (Incoming)
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>
                      Host
                      <input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.example.com" />
                    </label>
                    <label style={{ width: 80 }}>
                      Port
                      <input type="number" value={imapPort} onChange={(e) => setImapPort(parseInt(e.target.value))} />
                    </label>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    SMTP Settings (Outgoing)
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>
                      Host
                      <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
                    </label>
                    <label style={{ width: 80 }}>
                      Port
                      <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(parseInt(e.target.value))} />
                    </label>
                  </div>
                </div>

                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={useTLS}
                    onChange={(e) => setUseTLS(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  Use TLS/SSL
                </label>
              </>
            )}

            {status === 'error' && (
              <div
                style={{
                  fontSize: 12,
                  padding: '8px 10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-sm)',
                  color: '#991b1b',
                }}
              >
                ❌ {errorMsg}
              </div>
            )}

            {status === 'success' && (
              <div
                style={{
                  fontSize: 12,
                  padding: '8px 10px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#166534',
                }}
              >
                ✅ Connected successfully! Redirecting...
              </div>
            )}

            <div className="composer-actions">
              <button className="composer-btn" onClick={onClose}>Cancel</button>
              <button
                className="composer-btn primary"
                onClick={handleTest}
                disabled={status === 'testing' || status === 'saving' || status === 'success'}
              >
                {status === 'saving' ? '💾 Saving...' : status === 'testing' ? '🔌 Testing...' : '🔗 Connect & Test'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
