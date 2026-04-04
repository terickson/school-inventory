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
  exportInventoryCsv,
  importInventoryCsv,
} from './helpers/api';

let browser: Browser;
let page: Page;
let locatorName: string;
let shelfName: string;
let itemName: string;
let locatorId: number;
let subId: number;
let categoryId: number;
let categoryName: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  locatorName = `CSV Closet ${suffix}`;
  shelfName = `CSV Shelf ${suffix}`;
  itemName = `CSV Thermometer ${suffix}`;

  const cats = await getCategories();
  categoryId = cats.items[0].id;
  categoryName = cats.items[0].name;

  const locator = await createLocator({
    name: locatorName,
    description: 'For CSV E2E tests',
  });
  locatorId = locator.id;

  const sub = await createSublocator(locator.id, { name: shelfName });
  subId = sub.id;

  const item = await createItem({
    name: itemName,
    category_id: categoryId,
    unit_of_measure: 'unit',
  });

  await createInventory({
    item_id: item.id,
    locator_id: locatorId,
    sublocator_id: subId,
    quantity: 20,
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

describe('CSV Export/Import API', () => {
  test('Export returns valid CSV with correct data', async () => {
    const csv = await exportInventoryCsv(locatorId, subId);
    expect(csv).toContain('Item Name');
    expect(csv).toContain('Quantity');
    expect(csv).toContain(itemName);
    expect(csv).toContain('20');
  });

  test('Import creates new items and updates existing', async () => {
    const suffix = uniqueSuffix();
    const csvContent = [
      'Item Name,Category,Shelf,Quantity,Min Quantity,Unit',
      `${itemName},${categoryName},${shelfName},30,5,unit`,
      `CSV New Widget ${suffix},${categoryName},,15,3,pack`,
    ].join('\n');

    const result = await importInventoryCsv(locatorId, csvContent);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify the export now shows updated data
    const csv = await exportInventoryCsv(locatorId);
    expect(csv).toContain('30');  // Updated quantity
    expect(csv).toContain(`CSV New Widget ${suffix}`);  // New item
  });
});

describe('CSV Export/Import UI', () => {
  test('Navigate to inventory page', async () => {
    await page.click('[data-testid="nav-inventory"]');
    await page.waitForSelector('[data-testid="inventory-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
  });

  test('Export button exists and is disabled without location filter', async () => {
    const exportBtn = await page.$('[data-testid="export-csv-btn"]');
    expect(exportBtn).not.toBeNull();

    const disabled = await page.$eval(
      '[data-testid="export-csv-btn"]',
      (el) => (el as HTMLButtonElement).disabled,
    );
    expect(disabled).toBe(true);
  });

  test('Import button exists', async () => {
    const importBtn = await page.$('[data-testid="import-csv-btn"]');
    expect(importBtn).not.toBeNull();
  });

  test('Import dialog opens when clicking Import button', async () => {
    await page.click('[data-testid="import-csv-btn"]');
    await new Promise((r) => setTimeout(r, 500));

    const dialog = await page.$('[data-testid="import-locator-select"]');
    expect(dialog).not.toBeNull();

    const fileInput = await page.$('[data-testid="import-file-input"]');
    expect(fileInput).not.toBeNull();

    // Close the dialog
    await page.click('[data-testid="import-cancel-btn"]');
    await new Promise((r) => setTimeout(r, 500));
  });
});
