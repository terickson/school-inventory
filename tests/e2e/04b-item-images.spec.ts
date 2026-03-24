import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  uniqueSuffix,
  createItem,
  getCategories,
  uploadItemImage,
  deleteItemImage,
  apiGet,
} from './helpers/api';

let browser: Browser;
let page: Page;
let testItemId: number;
let testItemName: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();
  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);

  // Create test item via API
  testItemName = `ImgTest ${uniqueSuffix()}`;
  const cats = await getCategories();
  const catId = cats.items[0]?.id;
  const item = await createItem({
    name: testItemName,
    category_id: catId,
    unit_of_measure: 'unit',
  });
  testItemId = item.id;
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Item Images', () => {
  test('Item initially has no image_url', async () => {
    const item = await apiGet(`/items/${testItemId}`);
    expect(item.image_url).toBeNull();
  });

  test('Upload image via API', async () => {
    // Minimal JPEG bytes
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(100).fill(0)]);
    const result = await uploadItemImage(testItemId, jpegBytes);
    expect(result.image_url).not.toBeNull();
    expect(result.image_url).toContain('/api/v1/uploads/item_');
  });

  test('Image thumbnail appears in catalog table', async () => {
    await page.goto(`${BASE_URL}/catalog`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="items-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Search for the test item
    const searchInput = await page.waitForSelector(
      '[data-testid="items-table"] .v-toolbar .v-text-field input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(testItemName);
    await new Promise((r) => setTimeout(r, 1500));

    // Check that an img element exists in the table (the v-img for our item)
    const hasImage = await page.evaluate((name: string) => {
      const table = document.querySelector('[data-testid="items-table"]');
      if (!table) return false;
      const rows = table.querySelectorAll('tbody tr');
      for (const row of Array.from(rows)) {
        if (row.textContent?.includes(name)) {
          const img = row.querySelector('img');
          return img !== null;
        }
      }
      return false;
    }, testItemName);
    expect(hasImage).toBe(true);
  });

  test('Delete image via API', async () => {
    await deleteItemImage(testItemId);
    const item = await apiGet(`/items/${testItemId}`);
    expect(item.image_url).toBeNull();
  });

  test('Placeholder icon shows when no image', async () => {
    // Reload the catalog page
    await page.goto(`${BASE_URL}/catalog`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="items-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Search for the test item
    const searchInput = await page.waitForSelector(
      '[data-testid="items-table"] .v-toolbar .v-text-field input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(testItemName);
    await new Promise((r) => setTimeout(r, 1500));

    // Check that a .mdi-package-variant-closed icon exists (placeholder)
    const hasPlaceholder = await page.evaluate((name: string) => {
      const table = document.querySelector('[data-testid="items-table"]');
      if (!table) return false;
      const rows = table.querySelectorAll('tbody tr');
      for (const row of Array.from(rows)) {
        if (row.textContent?.includes(name)) {
          const icon = row.querySelector('.mdi-package-variant-closed');
          return icon !== null;
        }
      }
      return false;
    }, testItemName);
    expect(hasPlaceholder).toBe(true);
  });
});
