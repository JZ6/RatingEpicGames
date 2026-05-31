import { test, expect } from './fixtures/app.fixture';
import { sel } from './helpers/selectors';

test('clicking column header sorts ascending then descending', async ({ page }) => {
  await sel.columnHeader(page, 'Game').click();
  await expect(page.locator('th').filter({ hasText: 'Game' }).locator('.si-up.si-on')).toBeVisible();

  const firstAsc = await sel.gameNames(page).first().textContent();

  await sel.columnHeader(page, 'Game').click();
  await expect(page.locator('th').filter({ hasText: 'Game' }).locator('.si-down.si-on')).toBeVisible();

  const firstDesc = await sel.gameNames(page).first().textContent();
  expect(firstAsc).not.toBe(firstDesc);
});

test('clicking different column resets sort', async ({ page }) => {
  await sel.columnHeader(page, 'Game').click();
  await sel.columnHeader(page, 'Metacritic').click();
  await expect(page.locator('th').filter({ hasText: 'Metacritic' }).locator('.si-up.si-on')).toBeVisible();
  await expect(page.locator('th').filter({ hasText: 'Game' }).locator('.si-on')).toHaveCount(0);
});
