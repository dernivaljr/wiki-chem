import { expect, test } from '@playwright/test'
test('rota inexistente é recuperável e não transborda em 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/endereco-inexistente')
  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const link = page.getByRole('link', { name: 'Voltar à página inicial' }); await link.focus(); await expect(link).toBeFocused()
  await link.click(); await expect(page.getByRole('heading', { level: 1, name: 'Wiki-Chem' })).toBeVisible()
})
