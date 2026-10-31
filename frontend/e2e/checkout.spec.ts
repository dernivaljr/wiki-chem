import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { customer, price, seed, signed } from './commerce.fixture'
test.use({ storageState: '.test-fixtures/admin.json' })
async function add(page: Page, id: string) {
  await page.goto('/metodologias/' + id)
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByRole('status')).toContainText('Produto no carrinho')
}
async function review(page: Page) {
  await page.goto('/carrinho')
  await page.getByRole('button', { name: 'Prosseguir para revisão do pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
}
async function confirm(page: Page) {
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
}
test('FX01–FX05: revisão, confirmação explícita, aviso discreto sem cobrança, histórico e isolamento persistidos em MySQL', async ({ context, browser }) => {
  test.setTimeout(60000)
  const data = await seed(context, 5), user = await customer(browser), other = await customer(browser), { page } = user
  try {
    for (const item of data.items) await add(page, item.methodologyId)
    await review(page)
    await expect(page.getByText(/Transação isenta de cobrança:/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
    await expect(page.getByRole('article')).toHaveCount(5)
    const id = page.url().split('/').pop()!
    expect((await (await user.context.request.get('/api/v1/orders/' + id)).json()).data.status).toBe('PENDING_CONFIRMATION')
    expect((await (await user.context.request.get('/api/v1/cart')).json()).data.items).toHaveLength(5)
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    }
    await page.getByRole('checkbox').focus()
    await expect(page.getByRole('checkbox')).toBeFocused()
    await confirm(page)
    await expect(page.getByRole('heading', { name: 'Pedido concluído' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Pedido concluído' })).toBeVisible()
    expect((await (await user.context.request.get('/api/v1/cart')).json()).data.items).toHaveLength(0)
    expect((await other.context.request.get('/api/v1/orders/' + id)).status()).toBe(404)
    expect((await (await other.context.request.get('/api/v1/orders')).json()).data).toHaveLength(0)
    await page.goto('/pedidos')
    await page.getByRole('link', { name: 'Pedido ' + id, exact: true }).click()
    await expect(page.getByText('R$ 120,00', { exact: true })).toBeVisible()
    expect(await page.locator('body').textContent()).not.toContain(data.items[0]!.marker)
    await page.goto('/metodologias/' + data.items[0]!.methodologyId)
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toHaveCount(0)
    await expect(page.getByText(/Disponível no seu acervo digital/)).toBeVisible()
  } finally { await user.context.close(); await other.context.close() }
})
test('respostas perdidas são recuperadas com a mesma intenção e consulta, sem duplicar pedidos', async ({ context, browser }) => {
  const data = await seed(context), user = await customer(browser), { page } = user
  try {
    await add(page, data.items[0]!.methodologyId)
    let id = '', key = ''
    await page.route('**/api/v1/checkout/simulations', async route => {
      key = route.request().headers()['idempotency-key']!
      const response = await route.fetch(); expect(response.status()).toBe(201); id = (await response.json()).data.id
      await route.abort('failed')
    })
    await page.goto('/carrinho'); await page.getByRole('button', { name: 'Prosseguir para revisão do pedido' }).click()
    await expect(page.getByRole('alert')).toContainText('repita a mesma tentativa')
    await page.unroute('**/api/v1/checkout/simulations')
    await page.reload()
    const replay = page.waitForRequest('**/api/v1/checkout/simulations')
    await page.getByRole('button', { name: 'Recuperar revisão do pedido' }).click()
    expect((await replay).headers()['idempotency-key']).toBe(key)
    await expect(page).toHaveURL(new RegExp('/checkout/' + id + '$'))
    await expect(page.getByRole('checkbox')).toBeVisible()
    await page.route('**/api/v1/orders/*/confirm-simulation', async route => { expect((await route.fetch()).status()).toBe(200); await route.abort('failed') })
    await confirm(page)
    await expect(page.getByRole('alert')).toContainText('Resultado ainda não confirmado')
    await page.unroute('**/api/v1/orders/*/confirm-simulation')
    await page.getByRole('button', { name: 'Consultar estado do pedido' }).click()
    await expect(page.getByRole('heading', { name: 'Pedido concluído' })).toBeVisible()
    expect((await (await user.context.request.get('/api/v1/orders')).json()).total).toBe(1)
  } finally { await user.context.close() }
})
test('mudança de preço exige outra revisão, preserva snapshot e permite cancelamento', async ({ context, browser }) => {
  const data = await seed(context), item = data.items[0]!, user = await customer(browser), { page } = user
  try {
    await add(page, item.methodologyId); await review(page)
    const id = page.url().split('/').pop()!
    await price(context, item.product!.id, '1250')
    await confirm(page)
    await expect(page.getByRole('alert')).toContainText('Preço, versão ou oferta mudou')
    await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
    expect((await (await user.context.request.get('/api/v1/orders/' + id)).json()).data.totalCentavos).toBe('1000')
    await page.getByRole('button', { name: 'Cancelar revisão' }).click()
    await expect(page.getByRole('heading', { name: 'Revisão cancelada' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar ao carrinho para nova revisão' }).click()
    await page.getByRole('button', { name: 'Prosseguir para revisão do pedido' }).click()
    await expect(page.getByText('R$ 12,50', { exact: true })).toHaveCount(2)
    await confirm(page)
    await expect(page.getByRole('heading', { name: 'Pedido concluído' })).toBeVisible()
    expect((await (await user.context.request.get('/api/v1/orders/' + id)).json()).data.status).toBe('CANCELLED')
  } finally { await user.context.close() }
})
test('duas abas confirmam o mesmo pedido uma vez e sessão expirada retorna sem POST automático', async ({ context, browser }) => {
  const data = await seed(context), user = await customer(browser), { page } = user
  try {
    await add(page, data.items[0]!.methodologyId); await review(page)
    const url = page.url(), second = await user.context.newPage()
    await second.goto(url); await expect(second.getByRole('checkbox')).toBeVisible()
    await Promise.all([confirm(page), confirm(second)])
    for (const tab of [page, second]) await expect(tab.getByRole('heading', { name: 'Pedido concluído' })).toBeVisible()
    expect((await (await user.context.request.get('/api/v1/orders')).json()).total).toBe(1)
    expect((await user.context.request.post('/api/v1/auth/logout', { headers: await signed(user.context), data: {} })).status()).toBe(204)
    await page.getByRole('button', { name: 'Consultar estado do pedido' }).click()
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('returnTo')).toBe(new URL(url).pathname)
    let posts = 0
    page.on('request', req => { if (req.url().includes('/confirm-simulation')) posts++ })
    await page.getByLabel('E-mail', { exact: true }).fill(user.email)
    await page.getByPlaceholder('••••••••').fill(user.password)
    await page.getByRole('button', { name: 'Entrar no Wiki-Chem' }).click()
    await expect(page.getByRole('heading', { name: 'Pedido concluído' })).toBeVisible()
    expect(posts).toBe(0)
  } finally { await user.context.close() }
})
