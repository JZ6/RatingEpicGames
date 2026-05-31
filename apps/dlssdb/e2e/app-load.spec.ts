import { test, expect } from './fixtures/app.fixture';

test('displays title and subtitle', async ({ page }) => {
  await expect(page.locator('header h1')).toHaveText('DLSSdb');
  await expect(page.locator('.subtitle')).toContainText('Every DLSS game');
});

test('renders table with 700+ games', async ({ page }) => {
  const nums = page.locator('.stats-bar .hl');
  const showing = await nums.first().textContent();
  expect(Number(showing)).toBeGreaterThan(700);
});

test('shows action buttons', async ({ page }) => {
  await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  await expect(page.locator('.btn-columns')).toBeVisible();
  await expect(page.locator('.btn-import-lib')).toBeVisible();
});
