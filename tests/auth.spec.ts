import { existsSync, mkdirSync } from 'node:fs'
import { test } from '@playwright/test'

const storageState = '.auth/user.json'

test('save authenticated dashboard session', async ({ browser, baseURL }) => {
  const loginTimeout = 60 * 1000
  test.setTimeout(loginTimeout + 15 * 1000)

  const context = await browser.newContext({
    storageState: existsSync(storageState) ? storageState : undefined,
  })
  const page = await context.newPage()

  await page.goto(baseURL ?? 'http://localhost:3000', {
    waitUntil: 'domcontentloaded',
    timeout: 15 * 1000,
  })

  if (new URL(page.url()).pathname === '/login') {
    const username = process.env.E2E_USERNAME
    const password = process.env.E2E_PASSWORD

    if (username && password) {
      await page.locator('#username').fill(username)
      await page.locator('#password').fill(password)
      await page.locator('form').filter({ has: page.locator('#username') }).getByRole('button', { name: /로그인|sign in/i }).click()
    } else {
      console.log('Complete the login in the opened Chromium window within one minute, or set E2E_USERNAME and E2E_PASSWORD.')
    }

    const loginError = page.locator('p.text-destructive')
    await Promise.race([
      page.locator('#dashboard').waitFor({ state: 'visible', timeout: loginTimeout }),
      loginError.waitFor({ state: 'visible', timeout: loginTimeout }).then(async () => {
        throw new Error(`Login failed: ${(await loginError.textContent()) ?? 'Unknown error'}`)
      }),
    ])
  }

  mkdirSync('.auth', { recursive: true })
  await context.storageState({ path: storageState })
  await context.close()
})