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

  const generateQuery = useCallback(
    (description: string) =>
      callEBot(`Generate a SQL query for the following requirement. Return ONLY the SQL query.\n\nRequirement: ${description}`),
    [callEBot],
  );

  const explainQuery = useCallback(
    (query: string) =>
      callEBot(`Explain this SQL query step by step in plain language:\n\n${query}`),
    [callEBot],
  );

  return { connected, loading, generateQuery, explainQuery };
}
