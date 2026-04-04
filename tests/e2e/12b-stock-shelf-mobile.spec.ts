import { Browser, Page } from 'puppeteer';
import { launchBrowser, createMobilePage } from './helpers/browser';
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

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  locatorName = `MobileCloset ${suffix}`;
  shelfName = `MobileShelf ${suffix}`;
  existingItemName = `E2E Mobile Item ${suffix}`;

  const cats = await getCategories();
  const categoryId = cats.items[0].id;

  const locator = await createLocator({
    name: locatorName,
    description: 'For mobile stock-shelf E2E tests',
  });

  await createSublocator(locator.id, { name: shelfName });

  await createItem({
    name: existingItemName,
    category_id: categoryId,
    unit_of_measure: 'unit',
  });

  browser = await launchBrowser();
  page = await createMobilePage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Stock a Shelf (Mobile)', () => {
  test('Stock a Shelf is accessible from mobile bottom nav', async () => {
    const stockBtn = await page.$('[data-testid="bottom-nav-stock-shelf"]');
    expect(stockBtn).not.toBeNull();
  });

  test('Navigate to Stock a Shelf via bottom nav', async () => {
    await page.click('[data-testid="bottom-nav-stock-shelf"]');
    await page.waitForSelector('[data-testid="location-selector"]', { timeout: 15000 });
  });

  test('Quick add form is visible on mobile', async () => {
    const form = await page.$('[data-testid="quick-add-form"]');
    expect(form).not.toBeNull();
  });

  test('Can select location and add an item on mobile', async () => {
    // Select location
    await page.click('[data-testid="stock-locator-select"]');
    await new Promise((r) => setTimeout(r, 500));
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

    // Select shelf
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

    // Search for item
    const itemInput = await page.$('[data-testid="stock-item-input"] input');
    await itemInput!.click();
    await itemInput!.type(existingItemName.substring(0, 12), { delay: 50 });
    await new Promise((r) => setTimeout(r, 1000));

    // Select item
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

    // Click Add
    await page.click('[data-testid="stock-add-btn"]');
    await new Promise((r) => setTimeout(r, 1500));

    // Verify session list
    await page.waitForSelector('[data-testid="session-list"]', { timeout: 5000 });
    const sessionText = await page.$eval('[data-testid="session-list"]', (el) => el.textContent);
    expect(sessionText).toContain(existingItemName);
  });
});
