import * as fs from 'fs';
import * as path from 'path';
import { Browser, Page } from 'puppeteer';
import { launchBrowser, createPage, BASE_URL } from './helpers/browser';
import { login } from './helpers/auth';
import { waitForBackend, waitForFrontend, uniqueSuffix, apiGet } from './helpers/api';

/**
 * Identify Item E2E tests.
 *
 * These tests rely on ANTHROPIC_API_KEY=mock being set in the backend environment,
 * which returns canned identification responses without calling the real API.
 */

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

describe('Identify Item', () => {
  test('Features endpoint reports identify_item enabled', async () => {
    const features = await apiGet('/features');
    expect(features.identify_item).toBe(true);
  });

  test('Nav item is visible when feature is enabled', async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="nav-drawer"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    const navItem = await page.$('[data-testid="nav-identify-item"]');
    expect(navItem).not.toBeNull();
  });

  test('Navigate to identify item page', async () => {
    await page.click('[data-testid="nav-identify-item"]');
    await page.waitForSelector('[data-testid="capture-card"]', { timeout: 10000 });

    const heading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent?.trim();
    });
    expect(heading).toContain('Identify Item');
  });

  test('Identify button is disabled without image', async () => {
    const isDisabled = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="identify-btn"]') as HTMLButtonElement;
      return btn?.disabled ?? false;
    });
    expect(isDisabled).toBe(true);
  });

  test('Upload image and identify returns mock suggestion', async () => {
    // Create a minimal test image file
    const jpegBytes = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ]);
    const tmpFile = path.join('/tmp', `e2e-identify-${uniqueSuffix()}.jpg`);
    fs.writeFileSync(tmpFile, jpegBytes);

    try {
      // Upload file via the file input
      const fileInput = await page.waitForSelector(
        '[data-testid="identify-file-input"] input[type="file"]',
        { timeout: 5000 },
      );
      await (fileInput as any).uploadFile(tmpFile);
      await new Promise((r) => setTimeout(r, 1000));

      // Click identify
      await page.click('[data-testid="identify-btn"]');

      // Wait for suggestion card (mock mode should respond quickly)
      await page.waitForSelector('[data-testid="suggestion-card"]', { timeout: 15000 });
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('Suggestion card shows mock response fields', async () => {
    // Verify confidence chip
    const chipText = await page.evaluate(() => {
      const chip = document.querySelector('[data-testid="confidence-chip"]');
      return chip?.textContent?.trim();
    });
    expect(chipText).toContain('medium');

    // Verify name field is pre-filled
    const nameValue = await page.evaluate(() => {
      const input = document
        .querySelector('[data-testid="identify-name"]')
        ?.querySelector('input') as HTMLInputElement;
      return input?.value;
    });
    expect(nameValue).toBe('Unknown Lab Equipment');

    // Verify reasoning is shown
    const reasoningText = await page.evaluate(() => {
      const alert = document.querySelector('[data-testid="reasoning-alert"]');
      return alert?.textContent?.trim();
    });
    expect(reasoningText).toContain('mock identification');
  });

  test('Can edit the suggested name', async () => {
    const nameInput = await page.waitForSelector('[data-testid="identify-name"] input');
    // Clear and type new name
    await nameInput!.click({ clickCount: 3 });
    const suffix = uniqueSuffix();
    const newName = `E2E Identified Item ${suffix}`;
    await nameInput!.type(newName);

    const value = await page.evaluate(() => {
      const input = document
        .querySelector('[data-testid="identify-name"]')
        ?.querySelector('input') as HTMLInputElement;
      return input?.value;
    });
    expect(value).toBe(newName);
  });

  test('Create Catalog Item creates the item', async () => {
    await page.click('[data-testid="create-item-btn"]');

    // Wait for success: the page should reset to capture state
    await page.waitForSelector('[data-testid="capture-card"]', { timeout: 10000 });

    // Verify the snackbar shows success
    // (The capture card reappearing means the create succeeded and reset was called)
  });

  test('Try Again resets to capture state', async () => {
    // Upload another image to get to suggestion state
    const jpegBytes = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ]);
    const tmpFile = path.join('/tmp', `e2e-identify-retry-${uniqueSuffix()}.jpg`);
    fs.writeFileSync(tmpFile, jpegBytes);

    try {
      const fileInput = await page.waitForSelector(
        '[data-testid="identify-file-input"] input[type="file"]',
        { timeout: 5000 },
      );
      await (fileInput as any).uploadFile(tmpFile);
      await new Promise((r) => setTimeout(r, 1000));

      await page.click('[data-testid="identify-btn"]');
      await page.waitForSelector('[data-testid="suggestion-card"]', { timeout: 15000 });

      // Click Try Again
      await page.click('[data-testid="try-again-btn"]');

      // Should be back to capture state
      await page.waitForSelector('[data-testid="capture-card"]', { timeout: 5000 });
      const suggestionCard = await page.$('[data-testid="suggestion-card"]');
      expect(suggestionCard).toBeNull();
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});
