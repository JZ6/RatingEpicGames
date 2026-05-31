import { test, expect } from '../../../shared/e2e/fixtures/app.fixture';
import { sel } from '../helpers/selectors';

test('full filter + sort + hide pipeline', async ({ page }) => {
  await sel.searchInput(page).fill('Subnautica');
  await sel.columnFilter(page, 'Steam Rating').selectOption('vp+');

  const names = await sel.gameNames(page).allTextContents();
  expect(names.length).toBeGreaterThanOrEqual(1);
  expect(names[0]).toContain('Subnautica');

  await sel.clearBtn(page).click();
  await expect(sel.rows(page)).not.toHaveCount(1, { timeout: 5000 });
  const fullCount = await sel.rows(page).count();
  expect(fullCount).toBeGreaterThan(500);

  await sel.columnHeader(page, 'Meta Score').click();
  await sel.columnHeader(page, 'Meta Score').click();
  const topGame = page.locator('table tbody tr').first();
  await expect(topGame.locator('.mc-good')).toBeVisible();

  await sel.hideFilter(page).selectOption('all');
  const topName = await sel.gameNames(page).first().textContent();
  await page.locator('.hide-btn').first().click();
  await sel.hideFilter(page).selectOption('');
  await expect(sel.rows(page)).toHaveCount(fullCount - 1);

  await sel.hideFilter(page).selectOption('hidden');
  await expect(sel.gameNames(page).first()).toHaveText(topName!);

  await page.locator('.hide-btn').first().click();
  await sel.hideFilter(page).selectOption('');
  await expect(sel.rows(page)).toHaveCount(fullCount);
});
