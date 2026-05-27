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

  const generateQuiz = useCallback(
    (topic: string, count: number) =>
      callEBot(`Generate ${count} quiz questions about "${topic}". For each, provide the question and 4 options with the correct answer marked.`),
    [callEBot],
  );

  const suggestPoll = useCallback(
    (topic: string) =>
      callEBot(`Suggest an engaging poll question about "${topic}" with 3-4 response options.`),
    [callEBot],
  );

  return { connected, loading, generateQuiz, suggestPoll };
}
