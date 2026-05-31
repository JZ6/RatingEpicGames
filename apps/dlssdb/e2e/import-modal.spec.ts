import { test, expect } from './fixtures/app.fixture';

test('import modal opens and closes', async ({ page }) => {
  await page.locator('.btn-import-lib').click();
  await expect(page.locator('.modal-dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.modal-dialog')).not.toBeVisible();
});

test('import button is disabled when textarea is empty', async ({ page }) => {
  await page.locator('.btn-import-lib').click();
  const importBtn = page.locator('.modal-dialog button:has-text("Import")');
  await expect(importBtn).toBeDisabled();
});

test('importing game names shows match results', async ({ page }) => {
  await page.locator('.btn-import-lib').click();
  await page.locator('.modal-dialog textarea').fill('Cyberpunk 2077\nElden Ring');
  await page.locator('.modal-dialog button:has-text("Import")').click();
  await expect(page.locator('.modal-dialog')).toContainText(/Matched/);
  await expect(page.locator('.modal-dialog button:has-text("Done")')).toBeVisible();
});
