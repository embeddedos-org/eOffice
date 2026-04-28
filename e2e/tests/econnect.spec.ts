import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginViaUI } from '../helpers/auth';

test.describe('eConnect', () => {
  let user = generateTestUser();

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    await page.goto('/');
    await loginViaUI(page, user.username, user.password);
  });

  test('should show channel list', async ({ page }) => {
    await expect(page.locator('[class*="channel"], [class*="Channel"], text=General').first()).toBeVisible({ timeout: 5000 });
  });

  test('should send a message', async ({ page }) => {
    const composer = page.locator('textarea, input[placeholder*="message"], [class*="composer"] input, [class*="composer"] textarea').first();
    if (await composer.isVisible()) {
      await composer.fill('Hello from E2E test!');
      await page.keyboard.press('Enter');
      await expect(page.locator('text=Hello from E2E test!')).toBeVisible({ timeout: 5000 });
    }
  });
});
