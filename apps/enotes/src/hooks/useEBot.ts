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

  const autoTag = useCallback(
    (text: string) =>
      callEBot('chat', {
        message: `Analyze the following note and suggest 3-5 relevant tags. Respond as a JSON array of short lowercase tag strings (no # prefix).\n\n${text}`,
      }),
    [callEBot],
  );

  const extractTasks = useCallback(
    (text: string) => callEBot('task-extract', { text }),
    [callEBot],
  );

  const findRelated = useCallback(
    (query: string) => callEBot('search', { query }),
    [callEBot],
  );

  return { connected, loading, summarize, autoTag, extractTasks, findRelated, callEBot };
}
