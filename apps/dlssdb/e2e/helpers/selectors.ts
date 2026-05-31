import type { Page } from '@playwright/test';

export const sel = {
  searchInput: (p: Page) => p.locator('.th-filter-input'),
  gameNames: (p: Page) => p.locator('.game-name'),
  rows: (p: Page) => p.locator('table tbody tr'),
  noResults: (p: Page) => p.locator('.no-results'),
  clearBtn: (p: Page) => p.locator('button:has-text("Clear Filters")'),
  importBtn: (p: Page) => p.locator('.btn-import-lib'),
  columnsBtn: (p: Page) => p.locator('.btn-columns'),
  colDropdown: (p: Page) => p.locator('.col-dropdown'),
  modalOverlay: (p: Page) => p.locator('.modal-overlay'),
  modalDialog: (p: Page) => p.locator('.modal-dialog'),
  statsNumbers: (p: Page) => p.locator('.stats-bar .hl'),
  gameThumbs: (p: Page) => p.locator('.game-thumb'),

  columnHeader: (p: Page, label: string) =>
    p.locator('th').filter({ hasText: label }).locator('.th-label'),

  columnFilter: (p: Page, label: string) =>
    p.locator('th').filter({ hasText: label }).locator('.th-filter-select'),

  hideFilter: (p: Page) =>
    p.locator('.th-filter-select').filter({ has: p.locator('option:has-text("Hidden Only")') }),
};
