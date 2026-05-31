import { test, expect } from './fixtures/app.fixture';
import { sel } from './helpers/selectors';

test('hiding a game removes it from view', async ({ page }) => {
  const before = await sel.rows(page).count();
  const firstName = await sel.gameNames(page).first().textContent();

  await sel.hideFilter(page).selectOption('all');
  await page.locator('.hide-btn').first().click();
  await expect(sel.rows(page).first()).toHaveClass(/row-hidden/);

  await sel.hideFilter(page).selectOption('');
  await expect(sel.rows(page)).toHaveCount(before - 1);

  await sel.hideFilter(page).selectOption('hidden');
  await expect(sel.rows(page)).toHaveCount(1);
  await expect(sel.gameNames(page).first()).toHaveText(firstName!);
});
