export const API_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:3001';
export const WS_URL = API_URL.replace(/^http/, 'ws');

// --- Auth Token Management ---

const TOKEN_KEY = 'eoffice-auth-token';
const REFRESH_TOKEN_KEY = 'eoffice-refresh-token';
const USER_KEY = 'eoffice-user';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(token: string, refreshToken: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// --- API Client with auto-auth headers ---

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    // Try token refresh
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`,
          },
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem(TOKEN_KEY, data.token);
          headers['Authorization'] = `Bearer ${data.token}`;
          const retryRes = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
          if (!retryRes.ok) {
            throw new Error(`API Error: ${retryRes.status}`);
          }
          return retryRes.json();
        }
      } catch {
        // Refresh failed, clear auth
      }
    }
    clearAuth();
    window.dispatchEvent(new CustomEvent('eoffice-auth-expired'));
    throw new Error('Authentication expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json();
}

// File upload variant (no Content-Type header, let browser set multipart boundary)
export async function apiUpload<T = any>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error.error || `Upload failed: ${res.status}`);
  }

  return res.json();
}
