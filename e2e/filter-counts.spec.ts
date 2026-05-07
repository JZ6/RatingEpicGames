import { test, expect } from './fixtures/app.fixture';

test('Steam Rating dropdown shows counts', async ({ page }) => {
  const options = page.locator('th').filter({ hasText: 'Steam Rating' }).locator('.th-filter-select option');
  await expect(options.filter({ hasText: /Very Positive.*\(\d+\)/ })).toHaveCount(1);
  await expect(options.filter({ hasText: /Mostly Positive.*\(\d+\)/ })).toHaveCount(1);
});

test('Meta Score dropdown shows counts', async ({ page }) => {
  const options = page.locator('th').filter({ hasText: 'Meta Score' }).locator('.th-filter-select option');
  await expect(options.filter({ hasText: /90\+.*\(\d+\)/ })).toHaveCount(1);
  await expect(options.filter({ hasText: /75\+.*\(\d+\)/ })).toHaveCount(1);
});
