import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login, goToLoginClean } from './helpers/auth';
import {
  waitForBackend,
  waitForFrontend,
  createUser,
  uniqueSuffix,
} from './helpers/api';

let browser: Browser;
let page: Page;
let teacherUsername: string;
const teacherPassword = 'TeacherPass123!';

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();

  teacherUsername = `teacher_role_${uniqueSuffix()}`;

  // Create teacher user via API
  await createUser({
    username: teacherUsername,
    full_name: 'Role Test Teacher',
    email: `${teacherUsername}@school.edu`,
    role: 'teacher',
    password: teacherPassword,
  });

  browser = await launchBrowser();
  page = await createPage(browser);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Teacher Role Restrictions', () => {
  test('Teacher can login', async () => {
    await login(page, teacherUsername, teacherPassword);
    // Should land on dashboard
    const dashboard = await page.$('[data-testid="dashboard"]');
    expect(dashboard).not.toBeNull();
  });

  test('Users nav item is not visible for teachers', async () => {
    const usersNav = await page.$('[data-testid="nav-users"]');
    expect(usersNav).toBeNull();
  });

  test('Categories nav item is not visible for teachers', async () => {
    const categoriesNav = await page.$('[data-testid="nav-categories"]');
    expect(categoriesNav).toBeNull();
  });

  test('Teacher can access Catalog page', async () => {
    await page.click('[data-testid="nav-catalog"]');
    await page.waitForSelector('[data-testid="items-table"]', { timeout: 15000 });
    const table = await page.$('[data-testid="items-table"]');
    expect(table).not.toBeNull();
  });

  test('Add Item button is not visible for teachers', async () => {
    const addBtn = await page.$('[data-testid="add-item-btn"]');
    expect(addBtn).toBeNull();
  });

  test('Teacher can access Inventory page', async () => {
    await page.click('[data-testid="nav-inventory"]');
    await page.waitForSelector('[data-testid="inventory-table"]', { timeout: 15000 });
    const table = await page.$('[data-testid="inventory-table"]');
    expect(table).not.toBeNull();
  });

  test('Add Stock button is not visible for teachers', async () => {
    const addBtn = await page.$('[data-testid="add-inventory-btn"]');
    expect(addBtn).toBeNull();
  });

  test('Teacher can access Checkouts page', async () => {
    await page.click('[data-testid="nav-checkouts"]');
    await page.waitForSelector('[data-testid="checkouts-table"]', { timeout: 15000 });
    const table = await page.$('[data-testid="checkouts-table"]');
    expect(table).not.toBeNull();
  });

  test('Teacher is blocked from /users via URL', async () => {
    await page.goto(`${BASE_URL}/users`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 2000));
    // Should be redirected to dashboard
    expect(page.url()).not.toContain('/users');
  });

  test('Teacher is blocked from /categories via URL', async () => {
    await page.goto(`${BASE_URL}/categories`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 2000));
    expect(page.url()).not.toContain('/categories');
  });
});
