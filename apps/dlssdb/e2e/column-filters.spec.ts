import { test, expect } from './fixtures/app.fixture';
import { sel } from './helpers/selectors';

test('Frame Gen 6X filter shows only 6X games', async ({ page }) => {
  await sel.columnFilter(page, 'Frame Gen').selectOption('6x');
  const badges = page.locator('td .badge').filter({ hasText: '6X' });
  const rowCount = await sel.rows(page).count();
  expect(rowCount).toBeGreaterThan(0);
  expect(await badges.count()).toBe(rowCount);
});

test('Steam VP+ filter reduces results', async ({ page }) => {
  const before = await sel.rows(page).count();
  await sel.columnFilter(page, 'Steam Rating').selectOption('vp+');
  const after = await sel.rows(page).count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThan(before);
});

test('multiple filters stack', async ({ page }) => {
  await sel.columnFilter(page, 'Frame Gen').selectOption('any');
  const withFG = await sel.rows(page).count();
  await sel.columnFilter(page, 'Steam Rating').selectOption('vp+');
  const withBoth = await sel.rows(page).count();
  expect(withBoth).toBeLessThanOrEqual(withFG);
  expect(withBoth).toBeGreaterThan(0);
});
