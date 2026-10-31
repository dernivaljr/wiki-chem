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
  await expect(page.getByRole('button', { name: 'Recuperar revisão do pedido' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Prosseguir para revisão do pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
}

async function confirm(page: Page, methodLabel: RegExp = /^PIX/) {
  await page.getByRole('radio', { name: methodLabel }).check()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
}

test('três compras consecutivas na mesma sessão (PIX, Cartão de crédito e Boleto bancário), recarregamentos, cancelamento prévio, bloqueio de recompra e histórico persistido', async ({ context, browser }) => {
  test.setTimeout(90000)
  const data = await seed(context, 4)
  const user = await customer(browser)
  const { page } = user

  try {
    // Pré-teste no mesmo usuário: pedido cancelado seguido de nova compra sem bloquear
    await add(page, data.items[0]!.methodologyId)
    await expect(page.getByRole('link', { name: 'Carrinho (1 item)' })).toBeVisible()
    await review(page)
    const cancelledId = page.url().split('/').pop()!
    await page.getByRole('button', { name: 'Cancelar revisão' }).click()
    await expect(page.getByRole('heading', { name: 'Revisão cancelada' })).toBeVisible()

    // Navega ao carrinho após recarregamento sem clicar em botões de recuperação internos
    await page.goto('/carrinho')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Recuperar revisão do pedido' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Carrinho (1 item)' })).toBeVisible()

    const purchases = [
      { item: data.items[0]!, radio: /^PIX/, label: 'PIX', code: 'PIX' },
      { item: data.items[1]!, radio: /^Cartão de crédito/, label: 'Cartão de crédito', code: 'CREDIT_CARD' },
      { item: data.items[2]!, radio: /^Boleto bancário/, label: 'Boleto bancário', code: 'BOLETO' },
    ] as const
    const completedIds: string[] = []

    for (const [idx, step] of purchases.entries()) {
      if (idx > 0) {
        await add(page, step.item.methodologyId)
        await expect(page.getByRole('link', { name: 'Carrinho (1 item)' })).toBeVisible()
      }

      await review(page)
      const orderId = page.url().split('/').pop()!
      expect(orderId).not.toBe(cancelledId)
      expect(completedIds).not.toContain(orderId)
      completedIds.push(orderId)

      await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
      await confirm(page, step.radio)

      await expect(page.getByRole('heading', { name: 'Pedido concluído' })).toBeVisible()
      await expect(page.getByText('Prazo de confirmação')).toHaveCount(0)
      await expect(page.getByText('Concluído em')).toBeVisible()
      await expect(page.getByText(step.label).first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeVisible()

      // Ligação direta para a metodologia adquirida na biblioteca
      await page.getByRole('link', { name: `Ler ${step.item.title} na minha biblioteca`, exact: true }).click()
      await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(step.item.marker)

      // Recarregamento da página entre compras
      await page.reload()
      await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(step.item.marker)
      await expect(page.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeVisible()
    }

    expect(new Set(completedIds).size).toBe(3)

    // Proteção contra compra duplicada de metodologia já adquirida
    await page.goto('/metodologias/' + data.items[0]!.methodologyId)
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toHaveCount(0)
    await expect(page.getByText(/Disponível no seu acervo digital/)).toBeVisible()
    const cartState = (await (await user.context.request.get('/api/v1/cart')).json()).data
    const dupRes = await user.context.request.put('/api/v1/cart/items/' + data.items[0]!.product!.id, {
      headers: await signed(user.context),
      data: {
        expectedRevision: cartState.revision,
        offerRevision: 1,
        priceId: data.items[0]!.product!.currentPriceId,
        versionId: '1',
      },
    })
    expect(dupRes.status()).toBe(409)
    expect((await dupRes.json()).error.code).toBe('ALREADY_OWNED')

    // Persistência e consulta das modalidades no histórico
    await page.goto('/pedidos')
    for (const [idx, step] of purchases.entries()) {
      const id = completedIds[idx]!
      const card = page.getByRole('article').filter({ has: page.getByRole('link', { name: 'Pedido ' + id, exact: true }) })
      await expect(card).toContainText(step.label)
      const persisted = (await (await user.context.request.get('/api/v1/orders/' + id)).json()).data
      expect(persisted.paymentMethod).toBe(step.code)
      expect(persisted.status).toBe('COMPLETED_SIMULATED')
    }
  } finally {
    await user.context.close()
  }
})

test('FX01–FX05: revisão, seleção de modalidade, confirmação explícita, aviso discreto sem cobrança, histórico e isolamento persistidos em MySQL', async ({ context, browser }) => {
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
    await confirm(page, /^Cartão de crédito/)
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
    await expect(page.getByText('Cartão de crédito').first()).toBeVisible()
    expect(await page.locator('body').textContent()).not.toContain(data.items[0]!.marker)
    await page.goto('/metodologias/' + data.items[0]!.methodologyId)
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toHaveCount(0)
    await expect(page.getByText(/Disponível no seu acervo digital/)).toBeVisible()
  } finally { await user.context.close(); await other.context.close() }
})

test('respostas perdidas são recuperadas com a mesma intenção e consulta, sem duplicar pedidos, liberando compra seguinte', async ({ context, browser }) => {
  const data = await seed(context, 2), user = await customer(browser), { page } = user
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
    await confirm(page, /^Boleto bancário/)
    await expect(page.getByRole('alert')).toContainText('Resultado ainda não confirmado')
    await page.unroute('**/api/v1/orders/*/confirm-simulation')
    await page.getByRole('button', { name: 'Consultar estado do pedido' }).click()
    await expect(page.getByRole('heading', { name: 'Pedido concluído' })).toBeVisible()
    expect((await (await user.context.request.get('/api/v1/orders')).json()).total).toBe(1)

    // Após recuperação concluída, nova adição ao carrinho abre revisão limpa sem duplicar nem bloquear
    await add(page, data.items[1]!.methodologyId)
    await review(page)
    expect(page.url().split('/').pop()).not.toBe(id)
  } finally { await user.context.close() }
})

test('mudança de preço exige outra revisão, preserva snapshot e permite cancelamento', async ({ context, browser }) => {
  const data = await seed(context), item = data.items[0]!, user = await customer(browser), { page } = user
  try {
    await add(page, item.methodologyId); await review(page)
    const id = page.url().split('/').pop()!
    await price(context, item.product!.id, '1250')
    await confirm(page, /^PIX/)
    await expect(page.getByRole('alert')).toContainText('Preço, versão ou oferta mudou')
    await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
    expect((await (await user.context.request.get('/api/v1/orders/' + id)).json()).data.totalCentavos).toBe('1000')
    await page.getByRole('button', { name: 'Cancelar revisão' }).click()
    await expect(page.getByRole('heading', { name: 'Revisão cancelada' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar ao carrinho para nova revisão' }).click()
    await page.getByRole('button', { name: 'Prosseguir para revisão do pedido' }).click()
    await expect(page.getByText('R$ 12,50', { exact: true })).toHaveCount(3)
    await confirm(page, /^PIX/)
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
    await Promise.all([confirm(page, /^PIX/), confirm(second, /^PIX/)])
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
