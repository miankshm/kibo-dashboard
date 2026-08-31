import { defineConfig, devices } from '@playwright/test'

const storageState = '.auth/user.json'

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'cmd /c pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.spec.ts',
      use: { ...devices['Desktop Chrome'], headless: false },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: '**/auth.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState },
    },
  ],
})