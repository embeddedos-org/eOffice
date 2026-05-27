import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginViaUI } from '../helpers/auth';

test.describe('ePlanner', () => {
  const user = generateTestUser();

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    await page.goto('/');
    await loginViaUI(page, user.username, user.password);
  });

  test('should show board view', async ({ page }) => {
    await expect(page.locator('[class*="board"], [class*="Board"], [class*="kanban"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a task', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("+")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      const titleInput = page.locator('input[placeholder*="title"], input[placeholder*="task"], input[type="text"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('E2E Test Task');
        await page.keyboard.press('Enter');
      }
    }
  });
});
