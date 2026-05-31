import { test, expect } from './fixtures/app.fixture';

test('mobile layout has compact search placeholder', async ({ page }) => {
  await expect(page.locator('.th-filter-input')).toHaveAttribute('placeholder', 'Search...');
});

test('table is horizontally scrollable on mobile', async ({ page }) => {
  const wrap = page.locator('.table-wrap');
  const scrollable = await wrap.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrollable).toBe(true);
});
