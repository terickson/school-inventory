import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  createLocator,
  createSublocator,
  createItem,
  getCategories,
  uniqueSuffix,
} from './helpers/api';

let browser: Browser;
let page: Page;
let locatorName: string;
let shelfName: string;
let existingItemName: string;
let locatorId: number;
let subId: number;
let categoryId: number;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  locatorName = `Stock Closet ${suffix}`;
  shelfName = `Shelf ${suffix}`;
  existingItemName = `E2E Spring Set ${suffix}`;

  // Create test data via API
  const cats = await getCategories();
  categoryId = cats.items[0].id;

  const locator = await createLocator({
    name: locatorName,
    description: 'For stock-shelf E2E tests',
  });
  locatorId = locator.id;

  const sub = await createSublocator(locator.id, { name: shelfName });
  subId = sub.id;

  await createItem({
    name: existingItemName,
    category_id: categoryId,
    unit_of_measure: 'set',
  });

  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Stock a Shelf', () => {
  test('Navigate to Stock a Shelf via nav drawer', async () => {
    await page.click('[data-testid="nav-stock-shelf"]');
    await page.waitForSelector('[data-testid="location-selector"]', { timeout: 15000 });
  });

  test('Location and Shelf selectors are present', async () => {
    const locatorSelect = await page.$('[data-testid="stock-locator-select"]');
    expect(locatorSelect).not.toBeNull();
    const sublocatorSelect = await page.$('[data-testid="stock-sublocator-select"]');
    expect(sublocatorSelect).not.toBeNull();
  });

  test('Select location and shelf', async () => {
    // Click the locator select
    await page.click('[data-testid="stock-locator-select"]');
    await new Promise((r) => setTimeout(r, 500));

    // Find and click the option matching our locator name
    await page.evaluate((name) => {
      const items = Array.from(document.querySelectorAll('.v-list-item'));
      for (const item of items) {
        if (item.textContent?.includes(name)) {
          (item as HTMLElement).click();
          return;
        }
      }
    }, locatorName);
    await new Promise((r) => setTimeout(r, 500));

    // Click the sublocator select
    await page.click('[data-testid="stock-sublocator-select"]');
    await new Promise((r) => setTimeout(r, 500));

    await page.evaluate((name) => {
      const items = Array.from(document.querySelectorAll('.v-list-item'));
      for (const item of items) {
        if (item.textContent?.includes(name)) {
          (item as HTMLElement).click();
          return;
        }
      }
    }, shelfName);
    await new Promise((r) => setTimeout(r, 500));
  });

  test('Add an existing catalog item', async () => {
    // Type in the item search
    const itemInput = await page.$('[data-testid="stock-item-input"] input');
    expect(itemInput).not.toBeNull();
    await itemInput!.click();
    await itemInput!.type(existingItemName.substring(0, 10), { delay: 50 });
    await new Promise((r) => setTimeout(r, 1000));

    // Select the matching item from autocomplete
    await page.evaluate((name) => {
      const items = Array.from(document.querySelectorAll('.v-list-item'));
      for (const item of items) {
        if (item.textContent?.includes(name)) {
          (item as HTMLElement).click();
          return;
        }
      }
    }, existingItemName);
    await new Promise((r) => setTimeout(r, 500));

    // Set quantity
    const qtyInput = await page.$('[data-testid="stock-quantity-input"] input');
    await qtyInput!.click({ clickCount: 3 });
    await qtyInput!.type('3');

    // Click Add
    await page.click('[data-testid="stock-add-btn"]');
    await new Promise((r) => setTimeout(r, 1500));

    // Verify item appears in session list
    await page.waitForSelector('[data-testid="session-list"]', { timeout: 5000 });
    const sessionText = await page.$eval('[data-testid="session-list"]', (el) => el.textContent);
    expect(sessionText).toContain(existingItemName);
    expect(sessionText).toContain('x3');
  });

  test('Location and shelf persist after adding', async () => {
    // Verify the locator select still has the value
    const locatorValue = await page.$eval(
      '[data-testid="stock-locator-select"]',
      (el) => el.textContent,
    );
    expect(locatorValue).toContain(locatorName);

    const sublocatorValue = await page.$eval(
      '[data-testid="stock-sublocator-select"]',
      (el) => el.textContent,
    );
    expect(sublocatorValue).toContain(shelfName);
  });

  test('Session list shows count', async () => {
    const title = await page.$eval('[data-testid="session-list"]', (el) => {
      const header = el.querySelector('.v-card-title');
      return header?.textContent || '';
    });
    expect(title).toContain('1');
  });

  test('Add same item again increases session count', async () => {
    // The item input should already be focused after the first add.
    // Click the autocomplete wrapper to ensure the menu opens.
    await page.click('[data-testid="stock-item-input"]');
    await new Promise((r) => setTimeout(r, 500));

    // Type search term into the input
    const itemInput = await page.$('[data-testid="stock-item-input"] input');
    await itemInput!.type(existingItemName.substring(0, 10), { delay: 50 });
    await new Promise((r) => setTimeout(r, 1500));

    // Wait for autocomplete menu to appear and click the matching option
    await page.waitForSelector('.v-overlay--active .v-list-item', { timeout: 5000 });
    await page.evaluate((name) => {
      const items = Array.from(document.querySelectorAll('.v-overlay--active .v-list-item'));
      for (const item of items) {
        if (item.textContent?.includes(name)) {
          (item as HTMLElement).click();
          return;
        }
      }
    }, existingItemName);
    await new Promise((r) => setTimeout(r, 1000));

    // Click Add
    await page.click('[data-testid="stock-add-btn"]');
    await new Promise((r) => setTimeout(r, 2000));

    // Session list should now show 2 entries
    const title = await page.$eval('[data-testid="session-list"]', (el) => {
      const header = el.querySelector('.v-card-title');
      return header?.textContent || '';
    });
    expect(title).toContain('2');
  });

  test('Undo removes entry from session list', async () => {
    // Get initial count
    const entries = await page.$$('[data-testid^="session-entry-"]');
    const initialCount = entries.length;

    // Click undo on first entry
    const undoBtn = await page.$('[data-testid="session-entry-0"] [data-testid="undo-btn"]');
    expect(undoBtn).not.toBeNull();
    await undoBtn!.click();
    await new Promise((r) => setTimeout(r, 1500));

    // Verify one entry was removed
    const remaining = await page.$$('[data-testid^="session-entry-"]');
    expect(remaining.length).toBe(initialCount - 1);
  });
});
