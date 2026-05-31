import { test, expect } from './fixtures/app.fixture';

test('no broken images in visible rows', async ({ page }) => {
  await page.waitForTimeout(1000);
  const broken = await page.evaluate(() => {
    const imgs = document.querySelectorAll<HTMLImageElement>('.game-thumb');
    return Array.from(imgs).filter((img) => img.complete && img.naturalWidth === 0).length;
  });
  expect(broken).toBe(0);
});
