import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3001/api/ebot';

export interface GrammarResult {
  suggestions: string[];
  corrected: string;
}

export function useEBot() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/status`)
      .then((r) => (r.ok ? setConnected(true) : setConnected(false)))
      .catch(() => setConnected(false));
  }, []);

  const callEBot = useCallback(async (endpoint: string, body?: object): Promise<string> => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/${endpoint}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => resp.statusText);
        throw new Error(`eBot error (${resp.status}): ${errText}`);
      }
      const data = await resp.json();
      setConnected(true);
      return data.text || data.response || JSON.stringify(data);
    } catch (err) {
      setConnected(false);
      throw err instanceof Error ? err : new Error('eBot unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  const draftReply = useCallback(
    (emailContent: string) =>
      callEBot('chat', {
        message: `Draft a professional reply to this email:\n\n${emailContent}\n\nKeep it concise and professional.`,
      }),
    [callEBot],
  );

  const summarizeThread = useCallback(
    (emails: string) =>
      callEBot('chat', {
        message: `Summarize this email thread in 2-3 bullet points:\n\n${emails}`,
      }),
    [callEBot],
  );

  const smartCompose = useCallback(
    (context: string) =>
      callEBot('chat', {
        message: `Help me compose an email about: ${context}\n\nProvide a subject line and body. Format as:\nSubject: ...\n\nBody:\n...`,
      }),
    [callEBot],
  );

  const spellCheck = useCallback(
    async (text: string): Promise<GrammarResult> => {
      const raw = await callEBot('complete', {
        prompt: `Check the following text for spelling and grammar errors. ` +
          `Respond in JSON with keys "suggestions" (array of strings describing each issue) ` +
          `and "corrected" (the full corrected text).\n\n${text}`,
      });
      try {
        const braceIdx = raw.indexOf('{');
        const lastBrace = raw.lastIndexOf('}');
        if (braceIdx !== -1 && lastBrace > braceIdx) {
          return JSON.parse(raw.slice(braceIdx, lastBrace + 1));
        }
      } catch { /* fall through */ }
      return { suggestions: [], corrected: text };
    },
    [callEBot],
  );

  const rewriteText = useCallback(
    (text: string, tone: 'formal' | 'casual' | 'concise' | 'friendly' = 'formal') =>
      callEBot('complete', {
        prompt: `Rewrite the following email text in a ${tone} tone. ` +
          `Return only the rewritten text, no commentary or explanation.\n\n${text}`,
      }),
    [callEBot],
  );

  const improveWriting = useCallback(
    (text: string) =>
      callEBot('complete', {
        prompt: `Improve the following email text. Fix any grammar/spelling errors, ` +
          `improve clarity and tone, and make it more professional. ` +
          `Return only the improved text.\n\n${text}`,
      }),
    [callEBot],
  );

  const translateEmail = useCallback(
    (text: string, targetLang: string) =>
      callEBot('complete', {
        prompt: `Translate the following email to ${targetLang}. ` +
          `Return only the translation.\n\n${text}`,
      }),
    [callEBot],
  );

  const extractTasks = useCallback(
    (emailContent: string) =>
      callEBot('task-extract', { text: emailContent }),
    [callEBot],
  );

  return {
    connected,
    loading,
    callEBot,
    draftReply,
    summarizeThread,
    smartCompose,
    spellCheck,
    rewriteText,
    improveWriting,
    translateEmail,
    extractTasks,
  };
}
