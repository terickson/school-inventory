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

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  checkoutItemName = `CoUI Item ${suffix}`;

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

  // Pre-create a checkout
  await apiCreateCheckout({
    inventory_id: inv1.id,
    quantity: 2,
  });

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
    expect(tableText).toContain(checkoutItemName);
  });

  test('Switch to All tab shows checkouts', async () => {
    const tabs = await page.$$('.v-tab');
    await tabs[1].click(); // All tab
    await new Promise((r) => setTimeout(r, 1500));

    const table = await page.$('[data-testid="checkouts-table"]');
    expect(table).not.toBeNull();
  });

  test('Switch back to Active tab', async () => {
    const tabs = await page.$$('.v-tab');
    await tabs[0].click(); // Active tab
    await new Promise((r) => setTimeout(r, 1500));

    const tableText = await page.$eval('[data-testid="checkouts-table"]', (el) => el.textContent);
    expect(tableText).toContain(checkoutItemName);
  });
});
