import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import { waitForBackend, waitForFrontend, uniqueSuffix } from './helpers/api';

let browser: Browser;
let page: Page;
let locatorName: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();
  locatorName = `Closet ${uniqueSuffix()}`;
  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Locators Management', () => {
  test('Navigate to Locations page', async () => {
    await page.click('[data-testid="nav-locators"]');
    await page.waitForSelector('[data-testid="locators-table"]', { timeout: 15000 });
  });

  test('Create a new locator', async () => {
    await page.click('[data-testid="add-locator-btn"]');

    // Wait for the dialog
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500));

    // Fill name
    const nameInput = await page.waitForSelector('.v-dialog .v-form .v-text-field input');
    await nameInput!.click({ clickCount: 3 });
    await nameInput!.type(locatorName);

    // Fill description
    const descInput = await page.waitForSelector('.v-dialog .v-form textarea');
    await descInput!.click();
    await descInput!.type('Main building supply closet');

    // Save
    await page.click('[data-testid="form-dialog-save"]');

    // Wait for dialog to close
    await page.waitForFunction(
      () => !document.querySelector('.v-overlay--active .v-dialog'),
      { timeout: 10000 },
    );
    await new Promise((r) => setTimeout(r, 1000));

    // Search for the new locator (may be on page 2 due to other test data)
    const searchInput = await page.waitForSelector(
      '[data-testid="locators-table"] .v-toolbar .v-text-field input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(locatorName);
    await new Promise((r) => setTimeout(r, 1500));

    // Verify it appears
    const tableText = await page.$eval('[data-testid="locators-table"]', (el) => el.textContent);
    expect(tableText).toContain(locatorName);
  });

  test('Click into the locator detail', async () => {
    // Click the locator name link - use evaluate to find by text content
    const clicked = await page.evaluate((name: string) => {
      const links = Array.from(document.querySelectorAll('[data-testid="locators-table"] a'));
      for (const link of links) {
        if (link.textContent?.includes(name)) {
          (link as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, locatorName);
    expect(clicked).toBe(true);

    // Wait for the detail view to load
    await page.waitForSelector('[data-testid="add-sublocator-btn"]', { timeout: 15000 });
  });

  test('Create a sublocator', async () => {
    await page.click('[data-testid="add-sublocator-btn"]');

    // Wait for dialog
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 700));

    // Fill name - get input more carefully
    const nameInput = await page.$('.v-dialog .v-form input');
    expect(nameInput).not.toBeNull();
    await nameInput!.click({ clickCount: 3 });
    await nameInput!.type('Shelf 1');
    await new Promise((r) => setTimeout(r, 300));

    // Save
    await page.click('[data-testid="form-dialog-save"]');

    // Wait for dialog to close
    await new Promise((r) => setTimeout(r, 3000));

    // Reload page to verify
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="sublocators-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Verify sublocator appears
    const tableText = await page.$eval('[data-testid="sublocators-table"]', (el) => el.textContent);
    expect(tableText).toContain('Shelf 1');
  });
});
