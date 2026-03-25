import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import { waitForBackend, waitForFrontend } from './helpers/api';

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

describe('Dashboard', () => {
  test('Dashboard shows stat cards', async () => {
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });

    // Check all stat cards exist
    const totalItems = await page.waitForSelector('[data-testid="stat-total-items"]', {
      timeout: 5000,
    });
    expect(totalItems).not.toBeNull();

    const activeCheckouts = await page.waitForSelector('[data-testid="stat-active-checkouts"]', {
      timeout: 5000,
    });
    expect(activeCheckouts).not.toBeNull();

    const lowStock = await page.waitForSelector('[data-testid="stat-low-stock"]', {
      timeout: 5000,
    });
    expect(lowStock).not.toBeNull();
  });

  test('Stat cards display numeric values', async () => {
    const totalText = await page.$eval('[data-testid="stat-total-items"] .text-h5', (el) =>
      el.textContent?.trim(),
    );
    expect(totalText).toMatch(/^\d+$/);

    const activeText = await page.$eval('[data-testid="stat-active-checkouts"] .text-h5', (el) =>
      el.textContent?.trim(),
    );
    expect(activeText).toMatch(/^\d+$/);
  });

  test('Dashboard contains low stock section', async () => {
    const dashboard = await page.$eval('[data-testid="dashboard"]', (el) => el.textContent);
    expect(dashboard).toContain('Low Stock');
  });
});
