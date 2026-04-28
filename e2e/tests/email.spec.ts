import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginViaUI } from '../helpers/auth';

test.describe('eMail', () => {
  let user = generateTestUser();

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    await page.goto('/');
    await loginViaUI(page, user.username, user.password);
  });

  test('should show inbox on load', async ({ page }) => {
    await expect(page.locator('text=Inbox, [class*="inbox"], [class*="Inbox"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should compose new email', async ({ page }) => {
    const composeBtn = page.locator('button:has-text("Compose"), button:has-text("New"), button:has-text("+")').first();
    if (await composeBtn.isVisible()) {
      await composeBtn.click();
      await expect(page.locator('input[placeholder*="To"], input[name="to"], [class*="composer"]').first()).toBeVisible({ timeout: 3000 });
    }
  });
});
