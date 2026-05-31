import { test, expect } from './fixtures/app.fixture';
import { sel } from './helpers/selectors';

test('filters sync to URL hash', async ({ page }) => {
  await sel.searchInput(page).fill('cyberpunk');
  await page.waitForFunction(() => window.location.hash.includes('search='));
  expect(page.url()).toContain('search=cyberpunk');
});

test('URL hash restores filters on reload', async ({ page }) => {
  await sel.searchInput(page).fill('elden');
  await page.waitForFunction(() => window.location.hash.includes('search='));
  await page.reload();
  await page.locator('table tbody tr').first().waitFor({ timeout: 15_000 });
  await expect(sel.searchInput(page)).toHaveValue('elden');
  const names = await sel.gameNames(page).allTextContents();
  for (const name of names) {
    expect(name.toLowerCase()).toContain('elden');
  }
});

test('navigating to hash URL applies filters', async ({ page }) => {
  await page.goto('/#search=portal');
  await page.locator('table tbody tr').first().waitFor({ timeout: 15_000 });
  await expect(sel.searchInput(page)).toHaveValue('portal');
  const names = await sel.gameNames(page).allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) {
    expect(name.toLowerCase()).toContain('portal');
  }
});
