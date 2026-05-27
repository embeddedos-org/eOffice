import { test, expect } from '@playwright/test';
import { generateTestUser, registerViaUI, loginViaUI } from '../helpers/auth';

test.describe('Authentication Flow', () => {
  test('should show login screen on first visit', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Sign in to continue')).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    const user = generateTestUser();
    await page.goto('/');
    await registerViaUI(page, user);
    // Should be logged in now — login screen should be gone
    await expect(page.locator('text=Sign in to continue')).not.toBeVisible({ timeout: 5000 });
  });

  test('should login with existing user', async ({ page }) => {
    const user = generateTestUser();
    // Register via API first
    const API_URL = process.env.API_URL || 'http://localhost:3001';
    await page.request.post(`${API_URL}/api/auth/register`, {
      data: { username: user.username, email: user.email, password: user.password },
    });

    await page.goto('/');
    await loginViaUI(page, user.username, user.password);
    await expect(page.locator('text=Sign in to continue')).not.toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await loginViaUI(page, 'nonexistent_user', 'wrongpassword');
    await expect(page.locator('[style*="ffcdd2"], [style*="fff0f0"]')).toBeVisible({ timeout: 5000 });
  });

  test('should enforce password requirements on register', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Don\'t have an account');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'short'); // Too short
    await page.click('button[type="submit"]');
    // Should stay on registration page
    await expect(page.locator('text=Create Account')).toBeVisible();
  });
});
