import { test, expect } from './fixtures/app.fixture';
import { sel } from './helpers/selectors';

test('Clear Filters resets search and dropdowns', async ({ page }) => {
  const initialCount = await sel.rows(page).count();

  await sel.searchInput(page).fill('cyberpunk');
  await sel.columnFilter(page, 'Frame Gen').selectOption('6x');
  await expect(sel.rows(page)).not.toHaveCount(initialCount);

  await sel.clearBtn(page).click();

  await expect(sel.searchInput(page)).toHaveValue('');
  await expect(sel.columnFilter(page, 'Frame Gen')).toHaveValue('');
  await expect(sel.rows(page)).toHaveCount(initialCount);
});
