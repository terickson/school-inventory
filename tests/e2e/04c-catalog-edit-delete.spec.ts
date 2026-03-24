import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  createItem,
  getCategories,
  uniqueSuffix,
} from './helpers/api';

let browser: Browser;
let page: Page;
let editItemName: string;
let deleteItemName: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  const suffix = uniqueSuffix();
  editItemName = `EditItem ${suffix}`;
  deleteItemName = `DelItem ${suffix}`;

  const cats = await getCategories();
  const categoryId = cats.items[0].id;

  await createItem({
    name: editItemName,
    category_id: categoryId,
    unit_of_measure: 'unit',
  });
  await createItem({
    name: deleteItemName,
    category_id: categoryId,
    unit_of_measure: 'pack',
  });

  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Catalog Edit and Delete', () => {
  test('Navigate to Catalog and search for edit item', async () => {
    await page.click('[data-testid="nav-catalog"]');
    await page.waitForSelector('[data-testid="items-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Search for the item
    const searchInput = await page.waitForSelector(
      '[data-testid="items-table"] .v-toolbar .v-text-field input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(editItemName);
    await new Promise((r) => setTimeout(r, 1500));
  });

  test('Edit item via UI', async () => {
    // Find the edit button for our item
    const rows = await page.$$('[data-testid="items-table"] tbody tr');
    let editBtn = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes(editItemName)) {
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
    const nameInput = await page.$('.v-dialog .v-form .v-text-field:first-of-type input');
    expect(nameInput).not.toBeNull();
    await nameInput!.click({ clickCount: 3 });
    await nameInput!.type(`${editItemName} Updated`);

    // Save
    await page.click('[data-testid="form-dialog-save"]');
    await page.waitForFunction(
      () => !document.querySelector('.v-overlay--active .v-dialog'),
      { timeout: 10000 },
    );
    await new Promise((r) => setTimeout(r, 1500));

    // Search for updated name
    const searchInput = await page.waitForSelector(
      '[data-testid="items-table"] .v-toolbar .v-text-field input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(`${editItemName} Updated`);
    await new Promise((r) => setTimeout(r, 1500));

    const tableText = await page.$eval('[data-testid="items-table"]', (el) => el.textContent);
    expect(tableText).toContain(`${editItemName} Updated`);
  });

  test('Delete item via UI', async () => {
    // Search for the delete item
    const searchInput = await page.waitForSelector(
      '[data-testid="items-table"] .v-toolbar .v-text-field input',
    );
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(deleteItemName);
    await new Promise((r) => setTimeout(r, 1500));

    // Find delete button
    const rows = await page.$$('[data-testid="items-table"] tbody tr');
    let deleteBtn = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes(deleteItemName)) {
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

    // Search again and verify gone
    await searchInput!.click({ clickCount: 3 });
    await searchInput!.type(deleteItemName);
    await new Promise((r) => setTimeout(r, 1500));

    const tableText = await page.$eval('[data-testid="items-table"]', (el) => el.textContent);
    expect(tableText).not.toContain(deleteItemName);
  });
});
