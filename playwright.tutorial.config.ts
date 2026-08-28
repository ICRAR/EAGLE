import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e_tutorialVideos',
  fullyParallel: false,
  retries: 0,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    viewport: { width: 2560, height: 1440 },
    deviceScaleFactor: 1,
    headless: false,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
