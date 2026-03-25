import puppeteer, { Browser, Page } from 'puppeteer';

export async function launchBrowser(): Promise<Browser> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  return browser;
}

export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  return page;
}

export async function createMobilePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  return page;
}

/**
 * Navigate to a URL and wait for the Vue SPA to render.
 * Uses a polling approach to handle HMR and SPA routing.
 */
export async function navigateTo(page: Page, path: string, waitSelector?: string): Promise<void> {
  const url = `${BASE_URL}${path}`;
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });

  if (waitSelector) {
    // Poll until the selector appears, allowing for SPA routing and HMR
    await page.waitForSelector(waitSelector, { timeout: 20000 });
  } else {
    // Just wait a bit for Vue to mount
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export const BASE_URL = 'http://localhost:5173';
