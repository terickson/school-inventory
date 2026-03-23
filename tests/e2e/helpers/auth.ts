import { Page } from 'puppeteer';
import { BASE_URL } from './browser';

/**
 * Wait for a selector with retry logic to handle context destruction.
 */
async function waitForSelectorRetry(
  page: Page,
  selector: string,
  timeout: number = 20000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      return;
    } catch {
      // retry - context may have been destroyed
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Timeout waiting for selector: ${selector}`);
}

export async function login(
  page: Page,
  username: string = 'admin',
  password: string = 'AdminPass123!',
): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load', timeout: 30000 });
  await waitForSelectorRetry(page, '[data-testid="login-form"]', 20000);

  // Clear and fill username
  const usernameInput = await page.waitForSelector('[data-testid="username-input"] input');
  await usernameInput!.click({ clickCount: 3 });
  await usernameInput!.type(username);

  // Clear and fill password
  const passwordInput = await page.waitForSelector('[data-testid="password-input"] input');
  await passwordInput!.click({ clickCount: 3 });
  await passwordInput!.type(password);

  // Click login
  await page.click('[data-testid="login-button"]');

  // Wait for navigation to dashboard
  await waitForSelectorRetry(page, '[data-testid="dashboard"]', 20000);
  // Wait for nav drawer to be available
  await waitForSelectorRetry(page, '[data-testid="nav-drawer"]', 10000);
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Navigate to login page with clean state (clear localStorage).
 */
export async function goToLoginClean(page: Page): Promise<void> {
  // Navigate to a page first
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load', timeout: 30000 });
  // Wait for page to settle
  await new Promise((r) => setTimeout(r, 3000));

  // Try to clear localStorage with retry
  for (let i = 0; i < 5; i++) {
    try {
      await page.evaluate(() => {
        localStorage.clear();
      });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Reload to get a fresh state
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await waitForSelectorRetry(page, '[data-testid="login-form"]', 20000);
}
