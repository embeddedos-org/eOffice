import { test, expect } from '@playwright/test';

test.describe('Cross-App Integration', () => {
  test('health endpoint returns ok', async ({ page }) => {
    const API_URL = process.env.API_URL || 'http://localhost:3001';
    const response = await page.request.get(`${API_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBeDefined();
  });

  test('eBot status endpoint works', async ({ page }) => {
    const API_URL = process.env.API_URL || 'http://localhost:3001';
    // Register and get token
    const regResp = await page.request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: `int_test_${Date.now()}`,
        email: `int_${Date.now()}@test.com`,
        password: 'TestPass123!',
      },
    });
    const { token } = await regResp.json();

    const statusResp = await page.request.get(`${API_URL}/api/ebot/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statusResp.ok()).toBeTruthy();
    const status = await statusResp.json();
    expect(status.status).toBe('ok');
    expect(status.providers).toBeDefined();
    expect(status.features).toContain('chat');
  });

  test('unauthenticated API requests return 401', async ({ page }) => {
    const API_URL = process.env.API_URL || 'http://localhost:3001';
    const response = await page.request.get(`${API_URL}/api/documents`);
    expect(response.status()).toBe(401);
  });
});
