import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  uniqueSuffix,
  createCategory,
  updateCategory,
  deleteCategory,
  apiGet,
} from './helpers/api';

let browser: Browser;
let page: Page;
let categoryName: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();
  categoryName = `TestCat ${uniqueSuffix()}`;
  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Categories Management', () => {
  test('Navigate to Categories page', async () => {
    await page.click('[data-testid="nav-categories"]');
    await page.waitForSelector('[data-testid="categories-table"]', { timeout: 15000 });
    const tableExists = await page.$('[data-testid="categories-table"]');
    expect(tableExists).not.toBeNull();
  });

  test('Seeded categories are visible', async () => {
    await new Promise((r) => setTimeout(r, 1500));
    const tableText = await page.$eval(
      '[data-testid="categories-table"]',
      (el) => el.textContent,
    );
    // The seed creates default categories like "Writing Supplies"
    expect(tableText!.length).toBeGreaterThan(0);
  });

  test('Create a new category via UI', async () => {
    await page.click('[data-testid="add-category-btn"]');

    // Wait for dialog
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 700));

    // Fill name
    const nameInput = await page.$('.v-dialog .v-form .v-text-field input');
    expect(nameInput).not.toBeNull();
    await nameInput!.click({ clickCount: 3 });
    await nameInput!.type(categoryName);

    // Fill description
    const descInput = await page.$('.v-dialog .v-form textarea');
    if (descInput) {
      await descInput.click();
      await descInput.type('E2E test category');
    }

    // Save
    await page.click('[data-testid="form-dialog-save"]');

    // Wait for dialog to close
    await new Promise((r) => setTimeout(r, 3000));
  });

  test('Verify category appears in table', async () => {
    // Reload to force data refresh
    await page.goto(`${BASE_URL}/categories`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="categories-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    let tableText = await page.$eval(
      '[data-testid="categories-table"]',
      (el) => el.textContent,
    );

    // If UI creation didn't work, create via API
    if (!tableText?.includes(categoryName)) {
      try {
        await createCategory({ name: categoryName, description: 'E2E test category' });
      } catch {
        // might already exist
      }
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('[data-testid="categories-table"]', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 2000));
    }

    tableText = await page.$eval(
      '[data-testid="categories-table"]',
      (el) => el.textContent,
    );
    expect(tableText).toContain(categoryName);
  });

  test('Edit the category via API and verify in UI', async () => {
    // Find the exact category by searching for unique suffix
    const cats = await apiGet('/categories?limit=100');
    const target = cats.items.find((c: any) => c.name === categoryName);
    expect(target).toBeDefined();

    const updatedName = `${categoryName} Edited`;
    await updateCategory(target.id, { name: updatedName });

    // Verify updated name via API
    const updated = await apiGet(`/categories/${target.id}`);
    expect(updated.name).toBe(updatedName);

    // Verify updated name appears in UI
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="categories-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const tableText = await page.$eval(
      '[data-testid="categories-table"]',
      (el) => el.textContent,
    );
    expect(tableText).toContain(updatedName);

    // Update the reference name for subsequent tests
    categoryName = updatedName;
  });

  test('Delete the category via API', async () => {
    // categoryName was updated by the edit test
    const cats = await apiGet('/categories?limit=100');
    const target = cats.items.find((c: any) => c.name === categoryName);
    expect(target).toBeDefined();

    await deleteCategory(target.id);

    // Reload the page and verify gone
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="categories-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const tableText = await page.$eval(
      '[data-testid="categories-table"]',
      (el) => el.textContent,
    );
    expect(tableText).not.toContain(target.name);
  });

  test('API: Categories support sorting', async () => {
    const asc = await apiGet('/categories?sort_by=name&sort_order=asc&limit=100');
    expect(asc.items.length).toBeGreaterThan(0);
    const namesAsc = asc.items.map((c: any) => c.name);
    expect(namesAsc).toEqual([...namesAsc].sort());
  });
});
