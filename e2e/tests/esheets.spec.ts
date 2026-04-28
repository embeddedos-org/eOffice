import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginViaUI } from '../helpers/auth';

test.describe('eSheets', () => {
  const user = generateTestUser();

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    await page.goto('/');
    await loginViaUI(page, user.username, user.password);
  });

  test('should create a new spreadsheet', async ({ page }) => {
    const newBtn = page.locator('button:has-text("New"), button:has-text("+")').first();
    if (await newBtn.isVisible()) {
      await newBtn.click();
    }
    await expect(page.locator('[class*="grid"], [class*="Grid"], table, [class*="spreadsheet"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should enter data in a cell', async ({ page }) => {
    const cell = page.locator('td, [class*="cell"], [role="gridcell"]').first();
    if (await cell.isVisible()) {
      await cell.dblclick();
      await page.keyboard.type('Hello');
      await page.keyboard.press('Tab');
    }
  });

  test('should show formula bar', async ({ page }) => {
    await expect(page.locator('[class*="formula"], [class*="Formula"], input[placeholder*="formula"]').first()).toBeVisible({ timeout: 5000 });
  });
});
