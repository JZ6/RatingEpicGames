import { test, expect } from './fixtures/app.fixture';
import { sel } from './helpers/selectors';

test('Steam VP+ filter reduces results', async ({ page }) => {
  const before = await sel.rows(page).count();
  await sel.columnFilter(page, 'Steam Rating').selectOption('vp+');
  const after = await sel.rows(page).count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThan(before);
});

test('Metacritic 90+ filter shows top games', async ({ page }) => {
  await sel.columnFilter(page, 'Meta Score').selectOption('90+');
  const count = await sel.rows(page).count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(100);
});

test('multiple filters stack', async ({ page }) => {
  await sel.columnFilter(page, 'Steam Rating').selectOption('vp+');
  const withSteam = await sel.rows(page).count();
  await sel.columnFilter(page, 'Meta Score').selectOption('75+');
  const withBoth = await sel.rows(page).count();
  expect(withBoth).toBeLessThanOrEqual(withSteam);
  expect(withBoth).toBeGreaterThan(0);
});
