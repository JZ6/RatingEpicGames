import { test, expect } from './fixtures/app.fixture';

test('slash key focuses search input', async ({ page }) => {
  await page.keyboard.press('/');
  await expect(page.locator('.th-filter-input')).toBeFocused();
});

test('Escape blurs search input', async ({ page }) => {
  await page.keyboard.press('/');
  await expect(page.locator('.th-filter-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.th-filter-input')).not.toBeFocused();
});
