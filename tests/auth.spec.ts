import { existsSync, mkdirSync } from 'node:fs'
import { test } from '@playwright/test'

const storageState = '.auth/user.json'

test('save authenticated dashboard session', async ({ browser, baseURL }) => {
  test.setTimeout(2 * 60 * 1000)

  const context = await browser.newContext({
    storageState: existsSync(storageState) ? storageState : undefined,
  })
  const page = await context.newPage()

  await page.goto(baseURL ?? 'http://localhost:3000')

  if (new URL(page.url()).pathname === '/login') {
    console.log('Complete the login in the opened Chromium window within two minutes.')
    const loginError = page.locator('p.text-destructive')
    const result = await Promise.race([
      page.waitForURL((url) => url.pathname !== '/login', { timeout: 2 * 60 * 1000 }).then(() => ({ type: 'success' as const })),
      page.locator('#sales').waitFor({ state: 'visible', timeout: 2 * 60 * 1000 }).then(() => ({ type: 'success' as const })),
      loginError.waitFor({ state: 'visible', timeout: 2 * 60 * 1000 }).then(async () => ({
        type: 'error' as const,
        message: await loginError.textContent(),
      })),
    ])

    if (result.type === 'error') {
      throw new Error(`Login failed: ${result.message ?? 'Unknown error'}`)
    }
  }

  mkdirSync('.auth', { recursive: true })
  await context.storageState({ path: storageState })
  await context.close()
})