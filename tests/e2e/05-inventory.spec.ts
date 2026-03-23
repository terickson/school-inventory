import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  createLocator,
  createSublocator,
  createItem,
  createInventory,
  getCategories,
  uniqueSuffix,
} from './helpers/api';

let browser: Browser;
let page: Page;
let itemName: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  itemName = `E2E Markers ${suffix}`;

  // Create test data via API
  const cats = await getCategories();
  const categoryId = cats.items[0].id;

  const locator = await createLocator({
    name: `Inv Closet ${suffix}`,
    description: 'For inventory E2E tests',
  });

  const sub = await createSublocator(locator.id, { name: `Shelf ${suffix}` });

  const item = await createItem({
    name: itemName,
    category_id: categoryId,
    unit_of_measure: 'pack',
  });

  // Also create the inventory record via API to verify it shows up
  await createInventory({
    item_id: item.id,
    locator_id: locator.id,
    sublocator_id: sub.id,
    quantity: 50,
    min_quantity: 5,
  });

  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Inventory Management', () => {
  test('Navigate to Inventory page', async () => {
    await page.click('[data-testid="nav-inventory"]');
    await page.waitForSelector('[data-testid="inventory-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
  });

  test('Add inventory button is present for admin', async () => {
    const addBtn = await page.$('[data-testid="add-inventory-btn"]');
    expect(addBtn).not.toBeNull();
  });

  test('Verify inventory appears in table with correct quantity', async () => {
    // Wait for table data to load
    await new Promise((r) => setTimeout(r, 1000));

    const tableText = await page.$eval('[data-testid="inventory-table"]', (el) => el.textContent);
    expect(tableText).toContain(itemName);
    expect(tableText).toContain('50');
  });
});
