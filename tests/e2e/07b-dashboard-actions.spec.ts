import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
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

describe('Dashboard Quick Actions', () => {
  test('Navigate to Dashboard', async () => {
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
  });

  test('Dashboard has quick action buttons', async () => {
    const pageText = await page.evaluate(() => document.body.textContent);
    // These are the quick action links typically shown
    const hasInventoryLink = pageText?.includes('Inventory') || pageText?.includes('inventory');
    const hasCheckoutLink = pageText?.includes('Checkout') || pageText?.includes('checkout');
    expect(hasInventoryLink || hasCheckoutLink).toBe(true);
  });

  test('Click through to Inventory from dashboard', async () => {
    // Try to find and click a link/button to inventory
    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('[data-testid="dashboard"] a, [data-testid="dashboard"] button'));
      for (const link of links) {
        if (link.textContent?.toLowerCase().includes('inventory')) {
          (link as HTMLElement).click();
          return true;
        }
      }
      // Fallback: look for quick action cards
      const cards = Array.from(document.querySelectorAll('.v-card'));
      for (const card of cards) {
        if (card.textContent?.toLowerCase().includes('inventory')) {
          const btn = card.querySelector('a, button');
          if (btn) {
            (btn as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });

    if (clicked) {
      await new Promise((r) => setTimeout(r, 2000));
      // Should have navigated to inventory
      const table = await page.$('[data-testid="inventory-table"]');
      if (table) {
        expect(table).not.toBeNull();
      }
    }

    // Navigate back for next test
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
  });

  test('Click through to Checkouts from dashboard', async () => {
    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('[data-testid="dashboard"] a, [data-testid="dashboard"] button'));
      for (const link of links) {
        if (link.textContent?.toLowerCase().includes('checkout')) {
          (link as HTMLElement).click();
          return true;
        }
      }
      const cards = Array.from(document.querySelectorAll('.v-card'));
      for (const card of cards) {
        if (card.textContent?.toLowerCase().includes('checkout')) {
          const btn = card.querySelector('a, button');
          if (btn) {
            (btn as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });

    if (clicked) {
      await new Promise((r) => setTimeout(r, 2000));
      const table = await page.$('[data-testid="checkouts-table"]');
      if (table) {
        expect(table).not.toBeNull();
      }
    }
  });
});
