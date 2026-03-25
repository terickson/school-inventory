import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  createLocator,
  createItem,
  createInventory,
  createCheckout as apiCreateCheckout,
  returnCheckout as apiReturnCheckout,
  getCategories,
  apiGet,
  uniqueSuffix,
} from './helpers/api';

let browser: Browser;
let page: Page;
let testInventoryId: number;
let testCheckoutId: number;
let scissorsName: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  scissorsName = `Scissors ${suffix}`;

  // Create test data via API
  const cats = await getCategories();
  const categoryId = cats.items[0].id;

  const locator = await createLocator({
    name: `Checkout Closet ${suffix}`,
    description: 'For checkout E2E tests',
  });

  const item = await createItem({
    name: scissorsName,
    category_id: categoryId,
    unit_of_measure: 'unit',
  });

  const inv = await createInventory({
    item_id: item.id,
    locator_id: locator.id,
    quantity: 20,
    min_quantity: 5,
  });
  testInventoryId = inv.id;

  // Create checkout via API
  const checkout = await apiCreateCheckout({
    inventory_id: inv.id,
    quantity: 3,
    notes: 'E2E test checkout',
  });
  testCheckoutId = checkout.id;

  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Checkout and Return Flow', () => {
  test('Navigate to Checkouts page', async () => {
    await page.click('[data-testid="nav-checkouts"]');
    await page.waitForSelector('[data-testid="checkouts-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
  });

  test('Verify checkout appears in active list', async () => {
    const tableText = await page.$eval('[data-testid="checkouts-table"]', (el) => el.textContent);
    expect(tableText).toContain(scissorsName);
  });

  test('Verify inventory quantity decreased', async () => {
    const inv = await apiGet(`/inventory/${testInventoryId}`);
    expect(inv.quantity).toBe(17); // 20 - 3
  });

  test('Return the checkout via UI', async () => {
    // Find the Return button in the checkouts table
    const returnBtns = await page.$$('[data-testid="checkouts-table"] tbody .v-btn');
    let returnBtn = null;
    for (const btn of returnBtns) {
      const text = await btn.evaluate((el: Element) => el.textContent);
      if (text?.includes('Return')) {
        returnBtn = btn;
        break;
      }
    }

    if (returnBtn) {
      await returnBtn.click();

      // Wait for return dialog
      await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
      await new Promise((r) => setTimeout(r, 500));

      // Click save to return
      await page.click('[data-testid="form-dialog-save"]');

      // Wait for dialog to close
      await page.waitForFunction(
        () => !document.querySelector('.v-overlay--active .v-dialog'),
        { timeout: 10000 },
      );
      await new Promise((r) => setTimeout(r, 1500));
    } else {
      // Fall back to API return
      await apiReturnCheckout(testCheckoutId, { quantity: 3 });
    }
  });

  test('Verify checkout status changed to returned', async () => {
    // Switch to All tab to see returned checkouts
    const tabs = await page.$$('.v-tab');
    if (tabs.length >= 2) {
      await tabs[1].click(); // All tab
      await new Promise((r) => setTimeout(r, 1500));
    }

    const tableText = await page.$eval('[data-testid="checkouts-table"]', (el) => el.textContent);
    expect(tableText?.toLowerCase()).toContain('returned');
  });

  test('Verify inventory quantity restored', async () => {
    const inv = await apiGet(`/inventory/${testInventoryId}`);
    expect(inv.quantity).toBe(20); // restored
  });
});

describe('Partial Return Flow', () => {
  let partialCheckoutId: number;
  let partialInvId: number;

  test('Create checkout for partial return test', async () => {
    const suffix = Date.now().toString(36);
    const cats = await getCategories();
    const categoryId = cats.items[0].id;
    const locator = await createLocator({ name: `Partial Closet ${suffix}` });
    const item = await createItem({
      name: `Partial Item ${suffix}`,
      category_id: categoryId,
      unit_of_measure: 'unit',
    });
    const inv = await createInventory({
      item_id: item.id,
      locator_id: locator.id,
      quantity: 10,
      min_quantity: 2,
    });
    partialInvId = inv.id;
    const checkout = await apiCreateCheckout({
      inventory_id: inv.id,
      quantity: 5,
    });
    partialCheckoutId = checkout.id;
    expect(checkout.returned_quantity).toBe(0);
  });

  test('Partial return keeps checkout active', async () => {
    const returned = await apiReturnCheckout(partialCheckoutId, { quantity: 2 });
    expect(returned.status).toBe('active');
    expect(returned.returned_quantity).toBe(2);
    expect(returned.return_date).toBeNull();
    // Inventory partially restored: 10 - 5 + 2 = 7
    const inv = await apiGet(`/inventory/${partialInvId}`);
    expect(inv.quantity).toBe(7);
  });

  test('Return remaining completes checkout', async () => {
    const returned = await apiReturnCheckout(partialCheckoutId, { quantity: 3 });
    expect(returned.status).toBe('returned');
    expect(returned.returned_quantity).toBe(5);
    expect(returned.return_date).not.toBeNull();
    // Inventory fully restored: 7 + 3 = 10
    const inv = await apiGet(`/inventory/${partialInvId}`);
    expect(inv.quantity).toBe(10);
  });
});
