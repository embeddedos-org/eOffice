declare const import_meta_env: { VITE_API_URL?: string } | undefined;

function getEnvApiUrl(): string | undefined {
  try {
    // Vite environment
    if (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env) {
      return ((import.meta as Record<string, unknown>).env as Record<string, string | undefined>).VITE_API_URL;
    }
  } catch {}
  return undefined;
}

export const API_URL = getEnvApiUrl() || 'http://localhost:3001';
export const WS_URL = API_URL.replace(/^http/, 'ws');
