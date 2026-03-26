import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login, goToLoginClean } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
} from './helpers/api';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();
  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Profile and Logout', () => {
  test('Navigate to Profile via app bar', async () => {
    // The profile button is the account-circle icon in the app bar
    const profileBtn = await page.$('.v-app-bar .mdi-account-circle');
    expect(profileBtn).not.toBeNull();

    // Click the button's parent (v-btn wraps the icon)
    await page.evaluate(() => {
      const icon = document.querySelector('.v-app-bar .mdi-account-circle');
      const btn = icon?.closest('button');
      if (btn) btn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    expect(page.url()).toContain('/profile');
  });

  test('Profile shows account information', async () => {
    await page.waitForSelector('.v-card', { timeout: 10000 });
    const pageText = await page.evaluate(() => document.body.textContent);
    expect(pageText).toContain('Username');
    expect(pageText).toContain('admin');
    expect(pageText).toContain('Full Name');
    expect(pageText).toContain('Role');
  });

  test('Profile shows Change Password form', async () => {
    const pageText = await page.evaluate(() => document.body.textContent);
    expect(pageText).toContain('Change Password');
    expect(pageText).toContain('Current Password');
    expect(pageText).toContain('New Password');
    expect(pageText).toContain('Confirm New Password');
  });

  test('Logout redirects to login page', async () => {
    // Navigate back to dashboard first
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Click the logout icon button in app bar
    await page.evaluate(() => {
      const icon = document.querySelector('.v-app-bar .mdi-logout');
      const btn = icon?.closest('button');
      if (btn) btn.click();
    });

    // Should redirect to login
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('Cannot access protected pages after logout', async () => {
    await page.goto(`${BASE_URL}/catalog`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 2000));

    // Should be redirected to login
    expect(page.url()).toContain('/login');
  });
});
