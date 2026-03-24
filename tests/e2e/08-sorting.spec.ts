import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  uniqueSuffix,
  apiGet,
  createLocator,
  createItem,
  createInventory,
  getCategories,
} from './helpers/api';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();
  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

/**
 * Helper: get text content of cells in a specific column from a data table.
 * columnIndex is 0-based.
 */
async function getColumnTexts(
  tableTestId: string,
  columnIndex: number,
): Promise<string[]> {
  return page.evaluate(
    (testId: string, colIdx: number) => {
      const table = document.querySelector(`[data-testid="${testId}"]`);
      if (!table) return [];
      const rows = table.querySelectorAll('tbody tr');
      const texts: string[] = [];
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells[colIdx]) {
          const text = cells[colIdx].textContent?.trim() ?? '';
          if (text && text !== 'No data available') texts.push(text);
        }
      });
      return texts;
    },
    tableTestId,
    columnIndex,
  );
}

/**
 * Helper: click a sortable column header by its text.
 */
async function clickColumnHeader(
  tableTestId: string,
  headerText: string,
): Promise<void> {
  await page.evaluate(
    (testId: string, text: string) => {
      const table = document.querySelector(`[data-testid="${testId}"]`);
      if (!table) return;
      const headers = Array.from(table.querySelectorAll('thead th'));
      for (const th of headers) {
        if (th.textContent?.trim().includes(text)) {
          // Vuetify wraps the header in a clickable span/div
          const clickTarget =
            th.querySelector('.v-data-table-header__content') || th;
          (clickTarget as HTMLElement).click();
          return;
        }
      }
    },
    tableTestId,
    headerText,
  );
  // Wait for the table to reload
  await new Promise((r) => setTimeout(r, 2000));
}

describe('Sorting', () => {
  describe('Users table sorting', () => {
    test('Sort users by Username column', async () => {
      await page.click('[data-testid="nav-users"]');
      await page.waitForSelector('[data-testid="users-table"]', {
        timeout: 15000,
      });
      await new Promise((r) => setTimeout(r, 1500));

      // Click Username header to sort ascending
      await clickColumnHeader('users-table', 'Username');
      const namesAsc = await getColumnTexts('users-table', 0);

      if (namesAsc.length > 1) {
        // Verify ascending order
        for (let i = 1; i < namesAsc.length; i++) {
          expect(namesAsc[i].localeCompare(namesAsc[i - 1])).toBeGreaterThanOrEqual(0);
        }
      }

      // Click again to sort descending
      await clickColumnHeader('users-table', 'Username');
      const namesDesc = await getColumnTexts('users-table', 0);

      if (namesDesc.length > 1) {
        for (let i = 1; i < namesDesc.length; i++) {
          expect(namesDesc[i].localeCompare(namesDesc[i - 1])).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('Locations table sorting', () => {
    let locNames: string[];

    beforeAll(async () => {
      // Create test locators via API to ensure we have data to sort
      const suffix = uniqueSuffix();
      locNames = [`Zulu Room ${suffix}`, `Alpha Room ${suffix}`, `Mike Room ${suffix}`];
      for (const name of locNames) {
        try {
          await createLocator({ name, description: 'sort test' });
        } catch {
          // might already exist
        }
      }
    });

    test('Sort locations by Name column', async () => {
      await page.click('[data-testid="nav-locators"]');
      await page.waitForSelector('[data-testid="locators-table"]', {
        timeout: 15000,
      });
      await new Promise((r) => setTimeout(r, 1500));

      // Click Name header to sort ascending
      await clickColumnHeader('locators-table', 'Name');
      const namesAsc = await getColumnTexts('locators-table', 0);

      if (namesAsc.length > 1) {
        for (let i = 1; i < namesAsc.length; i++) {
          expect(namesAsc[i].localeCompare(namesAsc[i - 1])).toBeGreaterThanOrEqual(0);
        }
      }

      // Click again to sort descending
      await clickColumnHeader('locators-table', 'Name');
      const namesDesc = await getColumnTexts('locators-table', 0);

      if (namesDesc.length > 1) {
        for (let i = 1; i < namesDesc.length; i++) {
          expect(namesDesc[i].localeCompare(namesDesc[i - 1])).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('Catalog table sorting', () => {
    beforeAll(async () => {
      const suffix = uniqueSuffix();
      const cats = await getCategories();
      const catId = cats.items[0]?.id;
      if (catId) {
        for (const name of [`Zebra Item ${suffix}`, `Apple Item ${suffix}`, `Mango Item ${suffix}`]) {
          try {
            await createItem({ name, category_id: catId, unit_of_measure: 'box' });
          } catch {
            // might already exist
          }
        }
      }
    });

    test('Sort catalog by Name column', async () => {
      await page.click('[data-testid="nav-catalog"]');
      await page.waitForSelector('[data-testid="items-table"]', {
        timeout: 15000,
      });
      await new Promise((r) => setTimeout(r, 1500));

      // Click Name header to sort ascending
      await clickColumnHeader('items-table', 'Name');
      const namesAsc = await getColumnTexts('items-table', 0);

      if (namesAsc.length > 1) {
        for (let i = 1; i < namesAsc.length; i++) {
          expect(namesAsc[i].localeCompare(namesAsc[i - 1])).toBeGreaterThanOrEqual(0);
        }
      }

      // Click again to sort descending
      await clickColumnHeader('items-table', 'Name');
      const namesDesc = await getColumnTexts('items-table', 0);

      if (namesDesc.length > 1) {
        for (let i = 1; i < namesDesc.length; i++) {
          expect(namesDesc[i].localeCompare(namesDesc[i - 1])).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('API sorting validation', () => {
    test('Users API returns sorted results', async () => {
      const asc = await apiGet('/users?sort_by=username&sort_order=asc');
      expect(asc.items.length).toBeGreaterThan(0);
      const namesAsc = asc.items.map((u: any) => u.username);
      expect(namesAsc).toEqual([...namesAsc].sort());

      const desc = await apiGet('/users?sort_by=username&sort_order=desc');
      const namesDesc = desc.items.map((u: any) => u.username);
      expect(namesDesc).toEqual([...namesDesc].sort().reverse());
    });

    test('Locators API returns sorted results', async () => {
      const asc = await apiGet('/locators?sort_by=name&sort_order=asc');
      expect(asc.items.length).toBeGreaterThan(0);
      const namesAsc = asc.items.map((l: any) => l.name);
      expect(namesAsc).toEqual([...namesAsc].sort());
    });

    test('Items API returns sorted results', async () => {
      const asc = await apiGet('/items?sort_by=name&sort_order=asc');
      expect(asc.items.length).toBeGreaterThan(0);
      const namesAsc = asc.items.map((i: any) => i.name);
      expect(namesAsc).toEqual([...namesAsc].sort());
    });

    test('Invalid sort column is safely ignored', async () => {
      const resp = await apiGet('/users?sort_by=hacked_column&sort_order=asc');
      expect(resp.items).toBeDefined();
    });
  });
});
