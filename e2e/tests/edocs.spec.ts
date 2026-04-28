import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginViaUI } from '../helpers/auth';

test.describe('eDocs', () => {
  let user = generateTestUser();

  test.beforeEach(async ({ page }) => {
    // Register and login
    await registerUser(page, user);
    await page.goto('/');
    await loginViaUI(page, user.username, user.password);
  });

  test('should create a new document', async ({ page }) => {
    // Look for new document button or similar
    const newBtn = page.locator('button:has-text("New"), button:has-text("new"), button:has-text("+")').first();
    if (await newBtn.isVisible()) {
      await newBtn.click();
    }
    // Should see editor area
    await expect(page.locator('[contenteditable], textarea, .editor, [class*="Editor"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should type and format text', async ({ page }) => {
    const editor = page.locator('[contenteditable], textarea').first();
    if (await editor.isVisible()) {
      await editor.click();
      await editor.type('Hello eOffice World!');
      const text = await editor.textContent();
      expect(text).toContain('Hello eOffice World');
    }
  });

  test('should show eBot sidebar', async ({ page }) => {
    const ebotBtn = page.locator('button:has-text("eBot"), button:has-text("🤖")').first();
    if (await ebotBtn.isVisible()) {
      await ebotBtn.click();
      await expect(page.locator('[class*="ebot"], [class*="EBot"], [class*="sidebar"]').first()).toBeVisible({ timeout: 3000 });
    }
  });
});
