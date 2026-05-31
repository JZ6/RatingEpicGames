import { test, expect } from './fixtures/app.fixture';

test('toggling column hides and shows it', async ({ page }) => {
  const initialCols = await page.locator('table thead th').count();

  await page.locator('.btn-columns').click();
  const metacriticCheckbox = page.locator('.col-option').filter({ hasText: 'Metacritic' }).locator('input');
  await metacriticCheckbox.click();

  await expect(page.locator('table thead th')).toHaveCount(initialCols - 1);
  await expect(page.locator('th').filter({ hasText: 'Metacritic' })).toHaveCount(0);

  await metacriticCheckbox.click();
  await expect(page.locator('table thead th')).toHaveCount(initialCols);
});

test('Game column checkbox is disabled', async ({ page }) => {
  await page.locator('.btn-columns').click();
  const gameCheckbox = page.locator('.col-option').filter({ hasText: 'Game' }).locator('input');
  await expect(gameCheckbox).toBeDisabled();
});
