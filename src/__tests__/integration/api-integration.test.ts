/**
 * Integration Tests — API Client & Auth Flow
 * Tests the full auth lifecycle and API client behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Replicated auth/api logic for integration testing ────────────────────────
const TOKEN_KEY = 'eoffice-auth-token';
const REFRESH_TOKEN_KEY = 'eoffice-refresh-token';
const USER_KEY = 'eoffice-user';
const API_URL = 'http://localhost:3001';

const store: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => Object.keys(store).forEach(k => delete store[k]),
};

function getToken() { return mockStorage.getItem(TOKEN_KEY); }
function getRefreshToken() { return mockStorage.getItem(REFRESH_TOKEN_KEY); }
function getUser() {
  try { const r = mockStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function setAuth(token: string, refreshToken: string, user: object) {
  mockStorage.setItem(TOKEN_KEY, token);
  mockStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  mockStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearAuth() {
  mockStorage.removeItem(TOKEN_KEY);
  mockStorage.removeItem(REFRESH_TOKEN_KEY);
  mockStorage.removeItem(USER_KEY);
}
function isAuthenticated() { return !!getToken(); }

const mockFetch = vi.fn();
global.fetch = mockFetch;

async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${refreshToken}` },
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          mockStorage.setItem(TOKEN_KEY, data.token);
          headers['Authorization'] = `Bearer ${data.token}`;
          const retryRes = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
          if (!retryRes.ok) throw new Error(`API Error: ${retryRes.status}`);
          return retryRes.json();
        }
      } catch { /* fall through */ }
    }
    clearAuth();
    throw new Error('Authentication expired');
  }
  if (!res.ok) {
    const error = await (res as any).json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (res as any).json();
}

describe('Integration — Auth Lifecycle', () => {
  beforeEach(() => {
    clearAuth();
    mockFetch.mockReset();
  });

  it('login flow: stores token and user on success', async () => {
    const mockUser = { id: 'u1', username: 'alice', email: 'alice@test.com', role: 'user' };
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ token: 'jwt-token', refreshToken: 'refresh-token', user: mockUser }),
    });

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'password' }),
    });
    const data = await res.json();
    setAuth(data.token, data.refreshToken, data.user);

    expect(getToken()).toBe('jwt-token');
    expect(getRefreshToken()).toBe('refresh-token');
    expect(getUser()?.username).toBe('alice');
    expect(isAuthenticated()).toBe(true);
  });

  it('logout flow: clears all auth data', () => {
    setAuth('tok', 'ref', { id: 'u1', username: 'alice', email: 'a@b.com', role: 'user' });
    expect(isAuthenticated()).toBe(true);
    clearAuth();
    expect(isAuthenticated()).toBe(false);
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it('apiClient includes Bearer token in Authorization header', async () => {
    setAuth('my-jwt-token', 'ref', { id: 'u1', username: 'alice', email: 'a@b.com', role: 'user' });
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ documents: [] }),
    });

    await apiClient('/api/documents');
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBe('Bearer my-jwt-token');
  });

  it('apiClient handles 401 with token refresh', async () => {
    setAuth('expired-token', 'valid-refresh', { id: 'u1', username: 'alice', email: 'a@b.com', role: 'user' });

    // First call returns 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    // Refresh call returns new token
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ token: 'new-jwt-token' }),
    });
    // Retry call returns success
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ documents: [] }),
    });

    const result = await apiClient<{ documents: unknown[] }>('/api/documents');
    expect(result.documents).toEqual([]);
    expect(mockStorage.getItem(TOKEN_KEY)).toBe('new-jwt-token');
  });

  it('apiClient clears auth when refresh fails', async () => {
    setAuth('expired-token', 'expired-refresh', { id: 'u1', username: 'alice', email: 'a@b.com', role: 'user' });

    // First call returns 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    // Refresh call also fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });

    await expect(apiClient('/api/documents')).rejects.toThrow('Authentication expired');
    expect(isAuthenticated()).toBe(false);
  });

  it('apiClient throws on 404 error', async () => {
    setAuth('valid-token', 'ref', { id: 'u1', username: 'alice', email: 'a@b.com', role: 'user' });
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 404,
      json: async () => ({ error: 'Document not found' }),
    });

    await expect(apiClient('/api/documents/nonexistent')).rejects.toThrow('Document not found');
  });

  it('apiClient returns undefined for 204 No Content', async () => {
    setAuth('valid-token', 'ref', { id: 'u1', username: 'alice', email: 'a@b.com', role: 'user' });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await apiClient('/api/documents/123');
    expect(result).toBeUndefined();
  });
});

describe('Integration — Document CRUD Flow', () => {
  beforeEach(() => {
    clearAuth();
    mockFetch.mockReset();
    setAuth('valid-token', 'ref', { id: 'u1', username: 'alice', email: 'a@b.com', role: 'user' });
  });

  it('creates a document via POST', async () => {
    const newDoc = { id: 'doc-1', title: 'My Doc', content: '<p>Hello</p>', type: 'writer' };
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 201,
      json: async () => ({ document: newDoc }),
    });

    const result = await apiClient<{ document: typeof newDoc }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title: 'My Doc', content: '<p>Hello</p>' }),
    });
    expect(result.document.id).toBe('doc-1');
    expect(result.document.title).toBe('My Doc');
  });

  it('fetches document list via GET', async () => {
    const docs = [
      { id: 'doc-1', title: 'Doc 1' },
      { id: 'doc-2', title: 'Doc 2' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ documents: docs }),
    });

    const result = await apiClient<{ documents: typeof docs }>('/api/documents');
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].title).toBe('Doc 1');
  });

  it('updates a document via PUT', async () => {
    const updated = { id: 'doc-1', title: 'Updated Doc', content: '<p>New content</p>' };
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ document: updated }),
    });

    const result = await apiClient<{ document: typeof updated }>('/api/documents/doc-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Doc', content: '<p>New content</p>' }),
    });
    expect(result.document.title).toBe('Updated Doc');
  });

  it('deletes a document via DELETE', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await apiClient('/api/documents/doc-1', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });
});

describe('Integration — Error Handling', () => {
  beforeEach(() => {
    clearAuth();
    mockFetch.mockReset();
    setAuth('valid-token', 'ref', { id: 'u1', username: 'alice', email: 'a@b.com', role: 'user' });
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    await expect(apiClient('/api/documents')).rejects.toThrow('Network error');
  });

  it('handles 500 server errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });
    await expect(apiClient('/api/documents')).rejects.toThrow('Internal Server Error');
  });

  it('handles 403 Forbidden errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });
    await expect(apiClient('/api/documents/secret')).rejects.toThrow('Forbidden');
  });

  it('handles malformed JSON error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 400,
      json: async () => { throw new Error('Invalid JSON'); },
    });
    await expect(apiClient('/api/documents')).rejects.toThrow();
  });
});
