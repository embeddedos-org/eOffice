import { Page, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3001';
let testUserCounter = 0;

export interface TestUser {
  username: string;
  email: string;
  password: string;
  token?: string;
}

export function generateTestUser(): TestUser {
  testUserCounter++;
  const id = `${Date.now()}_${testUserCounter}`;
  return {
    username: `testuser_${id}`,
    email: `test_${id}@eoffice.test`,
    password: `TestPass${id}!1`,
  };
}

export async function registerUser(page: Page, user: TestUser): Promise<void> {
  const response = await page.request.post(`${API_URL}/api/auth/register`, {
    data: {
      username: user.username,
      email: user.email,
      password: user.password,
    },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  user.token = data.token;
}

export async function loginUser(page: Page, user: TestUser): Promise<string> {
  const response = await page.request.post(`${API_URL}/api/auth/login`, {
    data: {
      username: user.username,
      password: user.password,
    },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  user.token = data.token;
  return data.token;
}

export async function loginViaUI(page: Page, username: string, password: string): Promise<void> {
  await page.fill('input[type="text"]', username);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('button[type="submit"]', { state: 'hidden', timeout: 10000 });
}

export async function registerViaUI(page: Page, user: TestUser): Promise<void> {
  // Switch to register mode
  await page.click('text=Don\'t have an account');
  await page.fill('input[type="text"]', user.username);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('button[type="submit"]', { state: 'hidden', timeout: 10000 });
}
