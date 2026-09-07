import { test, expect } from '@playwright/test'

test('로그인 후 메인 페이지에 매출 요약 섹션이 표시된다', async ({ page }) => {
  test.setTimeout(30 * 1000)
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15 * 1000 })

//   if (process.env.PWDEBUG) {
//   await page.pause()
//   }

  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('#dashboard')).toBeVisible({ timeout: 10 * 1000 })
  await expect(page.locator('#sales').getByRole('heading', { name: '매출 요약', exact: true })).toBeVisible({ timeout: 10 * 1000 })
})
