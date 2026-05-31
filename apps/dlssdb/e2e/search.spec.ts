import { test, expect } from './fixtures/app.fixture';
import { sel } from './helpers/selectors';

test('filters games by search term', async ({ page }) => {
  await sel.searchInput(page).fill('Cyberpunk');
  await expect(sel.rows(page)).not.toHaveCount(0);
  const names = await sel.gameNames(page).allTextContents();
  for (const name of names) {
    expect(name.toLowerCase()).toContain('cyberpunk');
  }
});

test('shows no results for nonsense query', async ({ page }) => {
  await sel.searchInput(page).fill('xyzzznotgame123');
  await expect(sel.noResults(page)).toBeVisible();
  await expect(sel.rows(page)).toHaveCount(0);
});

test('clearing search restores all games', async ({ page }) => {
  const initialCount = await sel.rows(page).count();
  await sel.searchInput(page).fill('Cyberpunk');
  await expect(sel.rows(page)).not.toHaveCount(initialCount);
  await sel.searchInput(page).clear();
  await expect(sel.rows(page)).toHaveCount(initialCount);
});
