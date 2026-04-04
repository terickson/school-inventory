import { Browser, Page } from 'puppeteer';
import { launchBrowser, createMobilePage } from './helpers/browser';
import { login } from './helpers/auth';
import { waitForBackend, waitForFrontend } from './helpers/api';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();
  browser = await launchBrowser();
  page = await createMobilePage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Mobile layout', () => {
  test('Bottom navigation is visible on mobile', async () => {
    await page.waitForSelector('[data-testid="bottom-nav"]', { timeout: 10000 });
    const bottomNav = await page.$('[data-testid="bottom-nav"]');
    expect(bottomNav).toBeTruthy();
  });

  test('Bottom navigation includes all 6 items', async () => {
    const homeBtn = await page.$('[data-testid="bottom-nav-home"]');
    expect(homeBtn).toBeTruthy();

    const locationsBtn = await page.$('[data-testid="bottom-nav-locations"]');
    expect(locationsBtn).toBeTruthy();

    const inventoryBtn = await page.$('[data-testid="bottom-nav-inventory"]');
    expect(inventoryBtn).toBeTruthy();

    const stockShelfBtn = await page.$('[data-testid="bottom-nav-stock-shelf"]');
    expect(stockShelfBtn).toBeTruthy();

    const checkoutBtn = await page.$('[data-testid="bottom-nav-checkout"]');
    expect(checkoutBtn).toBeTruthy();

    const catalogBtn = await page.$('[data-testid="bottom-nav-catalog"]');
    expect(catalogBtn).toBeTruthy();
  });

  test('Nav drawer is hidden by default on mobile', async () => {
    const drawerVisible = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="nav-drawer"]');
      if (!drawer) return false;
      const rect = drawer.getBoundingClientRect();
      // On mobile the temporary drawer is off-screen (translateX negative)
      return rect.right > 0;
    });
    expect(drawerVisible).toBe(false);
  });

  test('Hamburger menu opens nav drawer', async () => {
    await page.click('.v-app-bar-nav-icon');
    await new Promise((r) => setTimeout(r, 500));

    const drawerVisible = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="nav-drawer"]');
      if (!drawer) return false;
      const rect = drawer.getBoundingClientRect();
      return rect.right > 0;
    });
    expect(drawerVisible).toBe(true);

    // Close drawer by clicking scrim
    const scrim = await page.$('.v-navigation-drawer__scrim');
    if (scrim) {
      await scrim.click();
      await new Promise((r) => setTimeout(r, 500));
    }
  });

  test('Navigate to inventory via bottom nav', async () => {
    await page.click('[data-testid="bottom-nav-inventory"]');
    await page.waitForSelector('[data-testid="inventory-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 500));
    const table = await page.$('[data-testid="inventory-table"]');
    expect(table).toBeTruthy();
  });

  test('Navigate to locations via bottom nav', async () => {
    await page.click('[data-testid="bottom-nav-locations"]');
    await page.waitForSelector('[data-testid="locators-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 500));
    const table = await page.$('[data-testid="locators-table"]');
    expect(table).toBeTruthy();
  });

  test('Navigate back to dashboard via bottom nav', async () => {
    await page.click('[data-testid="bottom-nav-home"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 500));
    const dashboard = await page.$('[data-testid="dashboard"]');
    expect(dashboard).toBeTruthy();
  });
});
