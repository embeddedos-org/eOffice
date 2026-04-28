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

  const callEBot = useCallback(async (message: string): Promise<string> => {
    setLoading(true);
    try {
      const data = await apiClient<any>('/api/ebot/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
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

  const searchFiles = useCallback(
    (query: string) => callEBot(`Search for files matching this description: ${query}`),
    [callEBot],
  );

  const summarizeFile = useCallback(
    (content: string) => callEBot(`Summarize this file content:\n\n${content}`),
    [callEBot],
  );

  return { connected, loading, searchFiles, summarizeFile };
}
