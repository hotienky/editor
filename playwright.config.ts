import { defineConfig } from '@playwright/test'

const externalBaseUrl = process.env.KINDY_E2E_BASE_URL
const configuredBaseUrl = externalBaseUrl || 'http://127.0.0.1:4173/kindy-editor/'
const baseURL = configuredBaseUrl.endsWith('/') ? configuredBaseUrl : `${configuredBaseUrl}/`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'line',
  use: {
    baseURL,
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: externalBaseUrl ? undefined : {
    command: 'npm run build:demo && npm run preview:demo -- --host 127.0.0.1 --port 4173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
