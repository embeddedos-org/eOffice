import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../shared/config';

export function useEBot() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient('/api/ebot/status')
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  const callEBot = useCallback(async (endpoint: string, body?: object): Promise<string> => {
    setLoading(true);
    try {
      const data = await apiClient<any>(`/api/ebot/${endpoint}`, {
        method: body ? 'POST' : 'GET',
        body: body ? JSON.stringify(body) : undefined,
      });
      setConnected(true);
      return data.text || data.response || JSON.stringify(data);
    } catch (err) {
      setConnected(false);
      throw err instanceof Error ? err : new Error('eBot unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  const summarize = useCallback(
    (text: string) => callEBot('summarize', { text }),
    [callEBot],
  );

  const rewrite = useCallback(
    (text: string, tone: string) =>
      callEBot('chat', { message: `Rewrite the following text in a ${tone} tone. Return only the rewritten text, no commentary.\n\n${text}` }),
    [callEBot],
  );

  const grammarCheck = useCallback(
    (text: string) =>
      callEBot('chat', { message: `Check grammar and spelling in the following text. List issues found and provide the corrected version:\n\n${text}` }),
    [callEBot],
  );

  const translate = useCallback(
    (text: string, lang: string) =>
      callEBot('chat', { message: `Translate the following text to ${lang}. Return only the translation, no commentary.\n\n${text}` }),
    [callEBot],
  );

  return { connected, loading, summarize, rewrite, grammarCheck, translate, callEBot };
}
