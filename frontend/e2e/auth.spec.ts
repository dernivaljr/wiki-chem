import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Dados exclusivamente de teste no banco descartável exigido pela configuração.
const password = 'Senha de navegador isolado 123!'
async function signup(page: Page) {
  const email = 'browser-' + randomUUID() + '@example.test'
  await page.getByRole('tab', { name: 'Criar conta' }).click()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByLabel('Nome completo').fill('Pessoa de navegador')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page.getByRole('status')).toHaveText('Conta criada. Entre com seu e-mail e senha.')
  return email
}
async function login(page: Page, email: string) {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Entrar no Wiki-Chem' }).click()
}

test('cadastro, retorno protegido, perfil persistente e logout reais', async ({ page, context }) => {
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fperfil/)
  const email = await signup(page)
  await login(page, email)
  await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(email)
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveAttribute('readonly', '')
  await page.getByLabel('Nome de exibição').fill('Nome persistido no MySQL')
  await page.getByRole('button', { name: 'Salvar nome' }).click()
  await expect(page.getByRole('status')).toHaveText('Nome atualizado com sucesso.')
  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Nome persistido no MySQL')
  const another = await context.newPage()
  await another.goto('/perfil')
  await expect(another.getByLabel('Nome de exibição')).toHaveValue('Nome persistido no MySQL')
  await another.close()
  const cookies = await context.cookies()
  expect(cookies.find(cookie => cookie.name === 'wikichem_session')).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' })
  expect(await page.evaluate(() => document.cookie)).not.toContain('wikichem_session')
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
  expect((await context.request.get('/api/v1/me')).status()).toBe(401)
})
test('duplicidade e credencial inválida não geram sucesso fictício', async ({ page }) => {
  await page.goto('/login')
  const email = await signup(page)
  await page.getByRole('tab', { name: 'Criar conta' }).click()
  await page.getByLabel('Nome completo').fill('Outra pessoa')
  await page.getByLabel('E-mail', { exact: true }).fill(email.toUpperCase())
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível criar')
  await page.getByRole('tab', { name: 'Entrar', exact: true }).click()
  await page.getByPlaceholder('••••••••').fill('Credencial incorreta longa')
  await page.getByRole('button', { name: 'Entrar no Wiki-Chem' }).click()
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.')
  await expect(page).toHaveURL(/\/login/)
})
test('retorno externo é rejeitado e abre a pesquisa autenticada funcional', async ({ page }) => {
  await page.goto('/login?returnTo=https%3A%2F%2Fevil.invalid')
  await login(page, await signup(page))
  await expect(page).toHaveURL(/\/consultas$/)
  await expect(page.getByRole('heading', { name: 'Pesquisar metodologias' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pesquisar', exact: true })).toBeEnabled()
  await expect(page.getByRole('group', { name: 'Analitos', exact: true })).toBeVisible()
})
test('protege escritas com origem e CSRF reais', async ({ page, context }) => {
  await page.goto('/login')
  await login(page, await signup(page))
  await expect(page).toHaveURL(/\/consultas$/)
  const origin = 'http://127.0.0.1:4174'
  expect((await context.request.patch('/api/v1/me', { headers: { Origin: origin }, data: { displayName: 'Não permitido' } })).status()).toBe(403)
  const session = (await (await context.request.get('/api/v1/auth/session')).json()).data
  expect((await context.request.patch('/api/v1/me', { headers: { Origin: 'https://evil.invalid', 'X-CSRF-Token': session.csrfToken }, data: { displayName: 'Não permitido' } })).status()).toBe(403)
  expect((await context.request.patch('/api/v1/me', { headers: { Origin: origin, 'X-CSRF-Token': session.csrfToken }, data: { displayName: 'Nome via API' } })).status()).toBe(200)
  await page.goto('/perfil')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Nome via API')
})
test('sessão revogada é removida da interface ao tentar ação protegida', async ({ page, context }) => {
  await page.goto('/login')
  await login(page, await signup(page))
  await page.getByRole('link', { name: 'Perfil', exact: true }).click()
  const session = (await (await context.request.get('/api/v1/auth/session')).json()).data
  expect((await context.request.post('/api/v1/auth/logout', { headers: { Origin: 'http://127.0.0.1:4174', 'X-CSRF-Token': session.csrfToken }, data: {} })).status()).toBe(204)
  await page.getByLabel('Nome de exibição').fill('Ação após revogação')
  await page.getByRole('button', { name: 'Salvar nome' }).click()
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Sua sessão expirou')
})
test('falha de rede no login é recuperável e não libera acesso', async ({ page }) => {
  await page.goto('/login')
  const email = await signup(page)
  await page.route('**/api/v1/auth/login', route => route.abort('failed'))
  await login(page, email)
  await expect(page.getByRole('alert')).toContainText('Não foi possível acessar o serviço')
  await expect(page.getByRole('button', { name: 'Entrar no Wiki-Chem' })).toBeEnabled()
})
test('cabeçalho autenticado e perfil preservam responsividade e teclado', async ({ page }) => {
  await page.goto('/login')
  await login(page, await signup(page))
  await page.getByRole('link', { name: 'Perfil', exact: true }).click()
  for (const width of [320, 375, 600, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await page.evaluate(() => document.fonts.ready)
    const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
    expect(size.content).toBeLessThanOrEqual(size.viewport)
    for (const control of await page.locator('header a, header button').all()) {
      const box = await control.boundingBox()
      expect(box?.x).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width)
    }
  }
  await page.getByLabel('Nome de exibição').focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Nome de exibição')).toBeFocused()
})
