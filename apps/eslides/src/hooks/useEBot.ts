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

  const suggestContent = useCallback(
    (topic: string, count: number) =>
      callEBot('chat', {
        message: `Generate ${count} presentation slide titles and bullet points for the topic: "${topic}". Format each slide as "Slide N: Title\n- bullet1\n- bullet2\n- bullet3". Return only the slide content.`,
      }),
    [callEBot],
  );

  const generateTalkingPoints = useCallback(
    (content: string) =>
      callEBot('chat', {
        message: `Generate speaker talking points for this presentation slide content:\n\n${content}\n\nProvide 3-5 concise talking points the presenter should cover.`,
      }),
    [callEBot],
  );

  return { connected, loading, suggestContent, generateTalkingPoints, callEBot };
}
