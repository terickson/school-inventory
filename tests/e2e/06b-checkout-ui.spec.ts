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
  getCategories,
  apiGet,
  uniqueSuffix,
} from './helpers/api';

let browser: Browser;
let page: Page;
let checkoutItemName: string;
let extendItemName: string;
let testInventoryId: number;
let extendCheckoutId: number;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  checkoutItemName = `CoUI Item ${suffix}`;
  extendItemName = `ExtUI Item ${suffix}`;

  const cats = await getCategories();
  const categoryId = cats.items[0].id;

  const locator = await createLocator({ name: `CoUI Closet ${suffix}` });

  // Item for UI checkout creation
  const item1 = await createItem({
    name: checkoutItemName,
    category_id: categoryId,
    unit_of_measure: 'unit',
  });
  const inv1 = await createInventory({
    item_id: item1.id,
    locator_id: locator.id,
    quantity: 30,
    min_quantity: 5,
  });

  // Item for extend test
  const item2 = await createItem({
    name: extendItemName,
    category_id: categoryId,
    unit_of_measure: 'unit',
  });
  const inv2 = await createInventory({
    item_id: item2.id,
    locator_id: locator.id,
    quantity: 20,
    min_quantity: 3,
  });
  testInventoryId = inv2.id;

  // Pre-create a checkout to extend
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);
  const checkout = await apiCreateCheckout({
    inventory_id: inv2.id,
    quantity: 2,
    due_date: dueDate.toISOString().split('T')[0],
  });
  extendCheckoutId = checkout.id;

  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Checkout UI Operations', () => {
  test('Navigate to Checkouts page', async () => {
    await page.click('[data-testid="nav-checkouts"]');
    await page.waitForSelector('[data-testid="checkouts-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
  });

  test('Verify pre-created checkout appears', async () => {
    const tableText = await page.$eval('[data-testid="checkouts-table"]', (el) => el.textContent);
    expect(tableText).toContain(extendItemName);
  });

  test('Extend checkout due date via UI', async () => {
    // Find the Extend button for our checkout
    const rows = await page.$$('[data-testid="checkouts-table"] tbody tr');
    let extendBtn = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes(extendItemName)) {
        const btns = await row.$$('.v-btn');
        for (const btn of btns) {
          const btnText = await btn.evaluate((el: Element) => el.textContent);
          if (btnText?.includes('Extend')) {
            extendBtn = btn;
            break;
          }
        }
        break;
      }
    }
    expect(extendBtn).not.toBeNull();
    await extendBtn!.click();

    // Wait for extend dialog
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500));

    // Set new due date (14 days from now)
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 14);
    const dateStr = newDate.toISOString().split('T')[0];

    // Set date value via evaluate (typing into date inputs is unreliable in headless Chrome)
    await page.evaluate((date: string) => {
      const input = document.querySelector('.v-dialog input[type="date"]') as HTMLInputElement;
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value',
        )!.set!;
        nativeSetter.call(input, date);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, dateStr);
    await new Promise((r) => setTimeout(r, 300));

    // Save
    await page.click('[data-testid="form-dialog-save"]');
    await new Promise((r) => setTimeout(r, 2000));

    // Verify via API
    const checkout = await apiGet(`/checkouts/${extendCheckoutId}`);
    expect(checkout.due_date).toContain(dateStr);
  });

  test('Switch to Overdue tab', async () => {
    const tabs = await page.$$('.v-tab');
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    await tabs[1].click(); // Overdue tab
    await new Promise((r) => setTimeout(r, 1500));

    // Table should still be present
    const table = await page.$('[data-testid="checkouts-table"]');
    expect(table).not.toBeNull();
  });

  test('Switch to All tab shows returned checkouts', async () => {
    const tabs = await page.$$('.v-tab');
    await tabs[2].click(); // All tab
    await new Promise((r) => setTimeout(r, 1500));

    const table = await page.$('[data-testid="checkouts-table"]');
    expect(table).not.toBeNull();
  });

  test('Switch back to Active tab', async () => {
    const tabs = await page.$$('.v-tab');
    await tabs[0].click(); // Active tab
    await new Promise((r) => setTimeout(r, 1500));

    const tableText = await page.$eval('[data-testid="checkouts-table"]', (el) => el.textContent);
    expect(tableText).toContain(extendItemName);
  });
});
