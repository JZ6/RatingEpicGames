import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await page.locator('table tbody tr').first().waitFor({ timeout: 15_000 });
    await use(page);
  },
});

export { expect };
