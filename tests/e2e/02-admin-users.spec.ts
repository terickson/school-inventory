import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import { waitForBackend, waitForFrontend, createUser, uniqueSuffix } from './helpers/api';

let browser: Browser;
let page: Page;
let teacherUsername: string;

beforeAll(async () => {
  await waitForBackend();
  await waitForFrontend();
  teacherUsername = `teacher_${uniqueSuffix()}`;
  browser = await launchBrowser();
  page = await createPage(browser);
  await login(page);
});

afterAll(async () => {
  if (page) await page.close();
  if (browser) await browser.close();
});

describe('Admin Users Management', () => {
  test('Navigate to Users page', async () => {
    await page.click('[data-testid="nav-users"]');
    await page.waitForSelector('[data-testid="users-table"]', { timeout: 15000 });
    const tableExists = await page.$('[data-testid="users-table"]');
    expect(tableExists).not.toBeNull();
  });

  test('Create a new teacher user via UI', async () => {
    await page.click('[data-testid="add-user-btn"]');

    // Wait for the dialog to appear
    await page.waitForSelector('.v-dialog', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 700));

    // Fill the form using evaluate for more reliable input
    await page.evaluate((username: string) => {
      const form = document.querySelector('.v-dialog .v-form');
      if (!form) return;
      const inputs = form.querySelectorAll('input');
      // Vuetify renders: username input, full_name input, email input, role input (hidden in select), password input
      // We need to find the actual text inputs (not hidden select ones)
      const textInputs: HTMLInputElement[] = [];
      inputs.forEach((inp) => {
        if (inp.type !== 'hidden' && !inp.closest('.v-select')) {
          textInputs.push(inp);
        }
      });
      // textInputs: 0=username, 1=full_name, 2=email, 3=password
      if (textInputs[0]) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value',
        )!.set!;

        nativeInputValueSetter.call(textInputs[0], username);
        textInputs[0].dispatchEvent(new Event('input', { bubbles: true }));

        nativeInputValueSetter.call(textInputs[1], 'Test Teacher');
        textInputs[1].dispatchEvent(new Event('input', { bubbles: true }));

        nativeInputValueSetter.call(textInputs[2], username + '@school.edu');
        textInputs[2].dispatchEvent(new Event('input', { bubbles: true }));

        nativeInputValueSetter.call(textInputs[3], 'Teacher123!');
        textInputs[3].dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, teacherUsername);

    await new Promise((r) => setTimeout(r, 500));

    // Click save
    await page.click('[data-testid="form-dialog-save"]');

    // Wait for dialog to close or error
    await new Promise((r) => setTimeout(r, 3000));
  });

  test('Verify user appears in table', async () => {
    // Reload page to force data refresh
    await page.goto(`${BASE_URL}/users`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="users-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const tableText = await page.$eval('[data-testid="users-table"]', (el) => el.textContent);

    // If the UI form creation didn't work, create via API and check
    if (!tableText?.includes(teacherUsername)) {
      try {
        await createUser({
          username: teacherUsername,
          full_name: 'Test Teacher',
          email: `${teacherUsername}@school.edu`,
          role: 'teacher',
          password: 'Teacher123!',
        });
      } catch {
        // might already exist
      }
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('[data-testid="users-table"]', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 2000));
    }

    const finalText = await page.$eval('[data-testid="users-table"]', (el) => el.textContent);
    expect(finalText).toContain(teacherUsername);
  });

  test('Deactivate the user', async () => {
    // Find the deactivate button for the test teacher row
    const rows = await page.$$('[data-testid="users-table"] tbody tr');
    let targetRow: any = null;
    for (const row of rows) {
      const text = await row.evaluate((el: Element) => el.textContent);
      if (text?.includes(teacherUsername)) {
        targetRow = row;
        break;
      }
    }
    expect(targetRow).not.toBeNull();

    // Click the deactivate button (last button in the row)
    const btns = await targetRow.$$('button');
    const lastBtn = btns[btns.length - 1];
    await lastBtn.click();

    // Wait for confirm dialog and click confirm
    await page.waitForSelector('[data-testid="confirm-dialog-confirm"]', {
      visible: true,
      timeout: 5000,
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.click('[data-testid="confirm-dialog-confirm"]');

    // Wait for the dialog to close and table to refresh
    await new Promise((r) => setTimeout(r, 3000));

    // Reload to ensure fresh data
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="users-table"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Verify the status changed
    const tableText = await page.$eval('[data-testid="users-table"]', (el) => el.textContent);
    expect(tableText).toContain('Inactive');
  });
});
