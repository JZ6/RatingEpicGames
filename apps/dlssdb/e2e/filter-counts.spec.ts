import { test, expect } from './fixtures/app.fixture';

test('Frame Gen dropdown shows counts', async ({ page }) => {
  const options = page.locator('th').filter({ hasText: 'Frame Gen' }).locator('.th-filter-select option');
  await expect(options.filter({ hasText: /^All$/ })).toHaveCount(1);
  await expect(options.filter({ hasText: /^6X \(\d+\)$/ })).toHaveCount(1);
  await expect(options.filter({ hasText: /^4X \(\d+\)$/ })).toHaveCount(1);
  await expect(options.filter({ hasText: /^Any \(\d+\)$/ })).toHaveCount(1);
});

test('Steam Rating dropdown shows counts', async ({ page }) => {
  const options = page.locator('th').filter({ hasText: 'Steam Rating' }).locator('.th-filter-select option');
  await expect(options.filter({ hasText: /Very Positive.*\(\d+\)/ })).toHaveCount(1);
  await expect(options.filter({ hasText: /Mostly Positive.*\(\d+\)/ })).toHaveCount(1);
});
