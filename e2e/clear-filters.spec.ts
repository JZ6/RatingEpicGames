import { test, expect } from './fixtures/app.fixture';
import { sel } from './helpers/selectors';

test('Clear Filters resets search and dropdowns', async ({ page }) => {
  const initialCount = await sel.rows(page).count();

  await sel.searchInput(page).fill('subnautica');
  await sel.columnFilter(page, 'Steam Rating').selectOption('vp+');
  await expect(sel.rows(page)).not.toHaveCount(initialCount);

  await sel.clearBtn(page).click();

  await expect(sel.searchInput(page)).toHaveValue('');
  await expect(sel.columnFilter(page, 'Steam Rating')).toHaveValue('');
  await expect(sel.rows(page)).toHaveCount(initialCount);
});
