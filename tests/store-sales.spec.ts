import { expect, test } from '@playwright/test'

test('St. Clair 지점의 매출 요약 금액이 $0로 표시된다', async ({ page }) => {
  test.setTimeout(30 * 1000)

  await page.goto('/', {
    waitUntil: 'domcontentloaded',
    timeout: 15 * 1000,
  })

  await expect(page.locator('#dashboard')).toBeVisible({ timeout: 10 * 1000 })

  const storeTrigger = page.getByRole('button', { name: '전체 보기', exact: true })
  await storeTrigger.click()

  const storeMenu = page.locator('[data-slot="dropdown-menu-content"]')
  await expect(storeMenu).toBeVisible({ timeout: 5 * 1000 })
  await storeMenu.getByRole('menuitem', { name: /St\. Clair/ }).click()

  const zeroValues = page.locator('#sales').locator('span').filter({ hasText: /^\$0$/ })
  await expect(zeroValues.first()).toHaveText('$0')
})
