import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  createLocator,
  createSublocator,
  uniqueSuffix,
} from './helpers/api';

let browser: Browser;
let page: Page;
let editLocatorName: string;
let deleteLocatorName: string;
let editLocatorId: number;
let deleteLocatorId: number;
let sublocatorLocatorId: number;
let sublocatorName: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  editLocatorName = `EditLoc ${suffix}`;
  deleteLocatorName = `DelLoc ${suffix}`;

  const editLoc = await createLocator({ name: editLocatorName, description: 'To be edited' });
  editLocatorId = editLoc.id;

  const delLoc = await createLocator({ name: deleteLocatorName, description: 'To be deleted' });
  deleteLocatorId = delLoc.id;

  // Create a locator with sublocators for sub edit/delete tests
  const subLoc = await createLocator({ name: `SubTestLoc ${suffix}` });
  sublocatorLocatorId = subLoc.id;
  sublocatorName = `EditShelf ${suffix}`;
  await createSublocator(subLoc.id, { name: sublocatorName, description: 'To be edited' });
  await createSublocator(subLoc.id, { name: `DelShelf ${suffix}`, description: 'To be deleted' });

  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Locator Edit and Delete', () => {
  test('Navigate to Locations page', async () => {
    await page.goto(`${BASE_URL}/locators`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="locators-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
  });

  test('Edit a locator via UI', async () => {
    // Search to find the locator (pagination may hide it)
    const searchInput = await page.waitForSelector(
      '[data-testid="locators-table"] .v-toolbar .v-text-field input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(editLocatorName);
    await new Promise((r) => setTimeout(r, 1500));

    // Find the edit (pencil) button for our locator
    const rows = await page.$$('[data-testid="locators-table"] tbody tr');
    let editBtn = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes(editLocatorName)) {
        const btns = await row.$$('button');
        for (const btn of btns) {
          const hasIcon = await btn.evaluate((el: Element) =>
            el.querySelector('.mdi-pencil') !== null,
          );
          if (hasIcon) {
            editBtn = btn;
            break;
          }
        }
        break;
      }
    }
    expect(editBtn).not.toBeNull();
    await editBtn!.click();

    // Wait for dialog
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500));

    // Update the name
    const nameInput = await page.$('.v-dialog .v-form .v-text-field input');
    expect(nameInput).not.toBeNull();
    await nameInput!.click({ clickCount: 3 });
    await nameInput!.type(`${editLocatorName} Updated`);

    // Save
    await page.click('[data-testid="form-dialog-save"]');
    await page.waitForFunction(
      () => !document.querySelector('.v-overlay--active .v-dialog'),
      { timeout: 10000 },
    );
    await new Promise((r) => setTimeout(r, 1000));

    // Verify update
    const tableText = await page.$eval('[data-testid="locators-table"]', (el) => el.textContent);
    expect(tableText).toContain(`${editLocatorName} Updated`);
  });

  test('Delete a locator via UI', async () => {
    // Search for the delete target
    const searchInput = await page.waitForSelector(
      '[data-testid="locators-table"] .v-toolbar .v-text-field input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(deleteLocatorName);
    await new Promise((r) => setTimeout(r, 1500));

    const rows = await page.$$('[data-testid="locators-table"] tbody tr');
    let deleteBtn = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes(deleteLocatorName)) {
        const btns = await row.$$('button');
        for (const btn of btns) {
          const hasIcon = await btn.evaluate((el: Element) =>
            el.querySelector('.mdi-delete') !== null,
          );
          if (hasIcon) {
            deleteBtn = btn;
            break;
          }
        }
        break;
      }
    }
    expect(deleteBtn).not.toBeNull();
    await deleteBtn!.click();

    // Confirm dialog
    await page.waitForSelector('[data-testid="confirm-dialog-confirm"]', {
      visible: true,
      timeout: 5000,
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.click('[data-testid="confirm-dialog-confirm"]');
    await new Promise((r) => setTimeout(r, 2000));

    // Verify gone
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="locators-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    const tableText = await page.$eval('[data-testid="locators-table"]', (el) => el.textContent);
    expect(tableText).not.toContain(deleteLocatorName);
  });
});

describe('Sublocator Edit and Delete', () => {
  test('Navigate to locator detail', async () => {
    await page.goto(`${BASE_URL}/locators/${sublocatorLocatorId}`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="sublocators-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
  });

  test('Edit a sublocator via UI', async () => {
    const rows = await page.$$('[data-testid="sublocators-table"] tbody tr');
    let editBtn = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes(sublocatorName)) {
        const btns = await row.$$('button');
        for (const btn of btns) {
          const hasIcon = await btn.evaluate((el: Element) =>
            el.querySelector('.mdi-pencil') !== null,
          );
          if (hasIcon) {
            editBtn = btn;
            break;
          }
        }
        break;
      }
    }
    expect(editBtn).not.toBeNull();
    await editBtn!.click();

    // Wait for dialog
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500));

    // Update name
    const nameInput = await page.$('.v-dialog .v-form input');
    expect(nameInput).not.toBeNull();
    await nameInput!.click({ clickCount: 3 });
    await nameInput!.type(`${sublocatorName} Updated`);

    // Save
    await page.click('[data-testid="form-dialog-save"]');
    await new Promise((r) => setTimeout(r, 2000));

    // Verify
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="sublocators-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    const tableText = await page.$eval('[data-testid="sublocators-table"]', (el) => el.textContent);
    expect(tableText).toContain(`${sublocatorName} Updated`);
  });

  test('Delete a sublocator via UI', async () => {
    const rows = await page.$$('[data-testid="sublocators-table"] tbody tr');
    let deleteBtn = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes('DelShelf')) {
        const btns = await row.$$('button');
        for (const btn of btns) {
          const hasIcon = await btn.evaluate((el: Element) =>
            el.querySelector('.mdi-delete') !== null,
          );
          if (hasIcon) {
            deleteBtn = btn;
            break;
          }
        }
        break;
      }
    }
    expect(deleteBtn).not.toBeNull();
    await deleteBtn!.click();

    // Confirm
    await page.waitForSelector('[data-testid="confirm-dialog-confirm"]', {
      visible: true,
      timeout: 5000,
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.click('[data-testid="confirm-dialog-confirm"]');
    await new Promise((r) => setTimeout(r, 2000));

    // Verify
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="sublocators-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    const tableText = await page.$eval('[data-testid="sublocators-table"]', (el) => el.textContent);
    expect(tableText).not.toContain('DelShelf');
  });
});
