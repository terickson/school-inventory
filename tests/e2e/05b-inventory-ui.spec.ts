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
  apiGet,
  uniqueSuffix,
} from './helpers/api';

let browser: Browser;
let page: Page;
let itemName: string;
let inventoryId: number;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  itemName = `InvUI Item ${suffix}`;

  const cats = await getCategories();
  const categoryId = cats.items[0].id;

  const locator = await createLocator({ name: `InvUI Closet ${suffix}` });

  const item = await createItem({
    name: itemName,
    category_id: categoryId,
    unit_of_measure: 'unit',
  });

  const inv = await createInventory({
    item_id: item.id,
    locator_id: locator.id,
    quantity: 25,
    min_quantity: 5,
  });
  inventoryId = inv.id;

  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Inventory UI Operations', () => {
  test('Navigate to Inventory page', async () => {
    await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="inventory-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
  });

  test('Add Stock dialog opens with item autocomplete', async () => {
    await page.click('[data-testid="add-inventory-btn"]');
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 700));

    // Verify the autocomplete input exists
    const itemInput = await page.$('.v-dialog .v-autocomplete input');
    expect(itemInput).not.toBeNull();

    // Type to search and verify results load
    await itemInput!.click();
    await itemInput!.type(itemName);
    await new Promise((r) => setTimeout(r, 1500));

    // Verify a matching option appears
    const options = await page.$$('.v-list-item');
    expect(options.length).toBeGreaterThan(0);

    // Cancel the dialog
    const cancelBtn = await page.$('[data-testid="form-dialog-cancel"]');
    if (cancelBtn) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await new Promise((r) => setTimeout(r, 500));
  });

  test('Adjust stock via UI', async () => {
    // Search for our test item in the inventory table
    const searchInput = await page.waitForSelector(
      '[data-testid="inventory-table"] [data-testid="search-input"] input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(itemName);
    await new Promise((r) => setTimeout(r, 1500));

    // Find the adjust button (mdi-tune icon)
    const rows = await page.$$('[data-testid="inventory-table"] tbody tr');
    let adjustBtn = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes(itemName)) {
        const btns = await row.$$('button');
        for (const btn of btns) {
          const hasIcon = await btn.evaluate((el: Element) =>
            el.querySelector('.mdi-tune') !== null,
          );
          if (hasIcon) {
            adjustBtn = btn;
            break;
          }
        }
        break;
      }
    }
    expect(adjustBtn).not.toBeNull();
    await adjustBtn!.click();

    // Wait for adjust dialog
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500));

    // Fill quantity change
    const qtyInput = await page.$('.v-dialog input[type="number"]');
    expect(qtyInput).not.toBeNull();
    await qtyInput!.click({ clickCount: 3 });
    await qtyInput!.press('Backspace');
    await qtyInput!.type('10');
    await new Promise((r) => setTimeout(r, 300));

    // Fill reason
    const reasonInput = await page.$('.v-dialog textarea');
    expect(reasonInput).not.toBeNull();
    await reasonInput!.click();
    await reasonInput!.type('E2E test restock');
    await new Promise((r) => setTimeout(r, 300));

    // Save
    await page.click('[data-testid="form-dialog-save"]');
    await new Promise((r) => setTimeout(r, 2000));

    // Verify quantity changed via API
    const inv = await apiGet(`/inventory/${inventoryId}`);
    expect(inv.quantity).toBe(35); // 25 + 10
  });

  test('Filter by low stock only', async () => {
    // Clear search first
    const searchInput = await page.waitForSelector(
      '[data-testid="inventory-table"] [data-testid="search-input"] input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type('');
    await new Promise((r) => setTimeout(r, 1000));

    // Click the low stock checkbox
    const checkbox = await page.$('.v-checkbox');
    if (checkbox) {
      await checkbox.click();
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Our item has quantity 35 with min 5, so it should NOT be in the low stock list
    const tableText = await page.$eval('[data-testid="inventory-table"]', (el) => el.textContent);
    expect(tableText).not.toContain(itemName);

    // Uncheck
    if (checkbox) {
      await checkbox.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
  });
});
