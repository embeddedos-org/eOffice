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

  const suggestFormula = useCallback(
    (description: string, context?: string) =>
      callEBot('chat', {
        message: `Suggest a spreadsheet formula for the following requirement. Return ONLY the formula (starting with =), no explanation.\n\nRequirement: ${description}${context ? `\nContext: ${context}` : ''}`,
      }),
    [callEBot],
  );

  const explainFormula = useCallback(
    (formula: string) =>
      callEBot('chat', {
        message: `Explain this spreadsheet formula step by step in plain language:\n\n${formula}`,
      }),
    [callEBot],
  );

  const analyzeData = useCallback(
    (data: string) =>
      callEBot('chat', {
        message: `Analyze this spreadsheet data and provide key insights, trends, and suggestions:\n\n${data}`,
      }),
    [callEBot],
  );

  return { connected, loading, suggestFormula, explainFormula, analyzeData, callEBot };
}
