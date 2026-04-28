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

  const suggestFields = useCallback(
    (description: string) =>
      callEBot('chat', {
        message: `Suggest form fields for this form: "${description}". Return each field on a new line with format: "Type: Label (required/optional)". Types can be: text, email, number, textarea, select, radio, checkbox, date.`,
      }),
    [callEBot],
  );

  const improveQuestion = useCallback(
    (question: string) =>
      callEBot('chat', {
        message: `Improve this form field label/question for clarity and better responses: "${question}". Return the improved version and a brief explanation.`,
      }),
    [callEBot],
  );

  return { connected, loading, suggestFields, improveQuestion, callEBot };
}
