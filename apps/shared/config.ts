export const API_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:3001';
export const WS_URL = API_URL.replace(/^http/, 'ws');
