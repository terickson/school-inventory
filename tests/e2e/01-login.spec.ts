import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { goToLoginClean } from './helpers/auth';
import { waitForBackend, waitForFrontend } from './helpers/api';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();
  browser = await launchBrowser();
  page = await createPage(browser);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Login', () => {
  beforeEach(async () => {
    await goToLoginClean(page);
  });

  test('Valid login with admin credentials redirects to dashboard', async () => {
    const usernameInput = await page.waitForSelector('[data-testid="username-input"] input');
    await usernameInput!.type('admin');

    const passwordInput = await page.waitForSelector('[data-testid="password-input"] input');
    await passwordInput!.type('AdminPass123!');

    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 20000 });

    const url = page.url();
    expect(url).toBe(`${BASE_URL}/`);
  });

  test('Invalid password shows error message', async () => {
    const usernameInput = await page.waitForSelector('[data-testid="username-input"] input');
    await usernameInput!.type('admin');

    const passwordInput = await page.waitForSelector('[data-testid="password-input"] input');
    await passwordInput!.type('wrongpassword');

    await page.click('[data-testid="login-button"]');

    // Wait for error alert to appear
    await page.waitForSelector('.v-alert', { timeout: 10000 });
    const alertText = await page.$eval('.v-alert', (el) => el.textContent);
    expect(alertText).toBeTruthy();
  });

  test('Empty fields show validation errors', async () => {
    await page.click('[data-testid="login-button"]');

    // Wait for validation messages
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('.v-messages__message');
      return messages.length > 0;
    }, { timeout: 5000 });

    const messages = await page.$$eval('.v-messages__message', (els) =>
      els.map((el) => el.textContent?.trim()),
    );
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some((m) => m?.toLowerCase().includes('required'))).toBe(true);
  });
});
