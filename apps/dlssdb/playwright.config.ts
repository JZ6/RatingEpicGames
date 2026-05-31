import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'e2e/playwright-report' }]],
  use: {
    baseURL: 'http://localhost:4173/DLSSdb/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: 'responsive.spec.ts',
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: 'responsive.spec.ts',
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173',
    url: 'http://localhost:4173/DLSSdb/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
