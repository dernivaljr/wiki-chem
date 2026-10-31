import { expect, test } from '@playwright/test'
import { customer, origin, price, publish, seed, signed } from './commerce.fixture'

test.use({ storageState: '.test-fixtures/admin.json' })

test('ADMIN cria oferta inativa, cadastra preços, ativa e preserva histórico pela interface', async ({ context, page }) => {
  const data = await seed(context, 1, false), item = data.items[0]!
  await page.goto('/admin')
  await page.getByRole('button', { name: item.slug + ' — PUBLISHED', exact: true }).click()
  await page.getByRole('button', { name: 'Gerenciar oferta e preços' }).click()
  await page.getByRole('button', { name: 'Criar produto inativo' }).click()
  await expect(page.getByRole('button', { name: 'Ativar oferta', exact: true })).toBeDisabled()
  for (const amount of ['1000', '1250']) {
    await page.getByLabel('Novo preço em centavos (BRL)').fill(amount)
    await page.getByRole('button', { name: 'Cadastrar novo preço' }).click()
    await expect(page.getByLabel('Novo preço em centavos (BRL)')).toHaveValue('')
  }
  await expect(page.getByRole('region', { name: 'Histórico de preços' }).getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: 'Ativar oferta', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Desativar oferta', exact: true })).toBeVisible()
  await page.goto('/metodologias/' + item.methodologyId)
  await expect(page.getByText('R$ 12,50', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeEnabled()
})

test('CUSTOMER adiciona FX01–FX05 com contador dinâmico no cabeçalho, conserva carrinho após login e remove sem afetar outro usuário', async ({ context, browser }) => {
  test.setTimeout(60000)
  const data = await seed(context, 5), user = await customer(browser), other = await customer(browser), { page } = user
  try {
    await page.goto('/consultas?q=' + data.token)
    await expect(page.getByRole('status')).toContainText('5 metodologias encontradas')
    await expect(page.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeVisible()
    for (const [idx, item] of data.items.entries()) {
      const card = page.getByRole('article').filter({ has: page.getByRole('link', { name: item.title, exact: true }) })
      await card.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
      await expect(card.getByRole('status')).toContainText('Produto no carrinho')
      const count = idx + 1
      await expect(page.getByRole('link', { name: `Carrinho (${count} ${count === 1 ? 'item' : 'itens'})` })).toBeVisible()
    }
    await page.getByRole('link', { name: 'Carrinho (5 itens)' }).click()
    await expect(page.getByText('R$ 120,00', { exact: true })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(5)
    await page.getByRole('button', { name: 'Perfil', exact: true }).click()
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    await page.getByLabel('E-mail', { exact: true }).fill(user.email)
    await page.getByPlaceholder('••••••••').fill(user.password)
    await page.getByRole('button', { name: 'Entrar no Wiki-Chem' }).click()
    await expect(page.getByRole('heading', { name: 'Meu carrinho' })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(5)
    await expect(page.getByRole('link', { name: 'Carrinho (5 itens)' })).toBeVisible()
    await page.reload(); await expect(page.getByText('R$ 120,00', { exact: true })).toBeVisible()
    await other.page.goto('/carrinho')
    await expect(other.page.getByText(/Seu carrinho está vazio/)).toBeVisible()
    await expect(other.page.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeVisible()
    expect((await other.context.request.get('/api/v1/admin/products')).status()).toBe(403)
    await page.getByRole('button', { name: 'Remover ' + data.items[0]!.title, exact: true }).click()
    await expect(page.getByRole('article')).toHaveCount(4)
    await expect(page.getByRole('link', { name: 'Carrinho (4 itens)' })).toBeVisible()
    await expect(page.getByText('R$ 110,00', { exact: true })).toBeVisible()
    expect((await (await other.context.request.get('/api/v1/cart')).json()).data.items).toHaveLength(0)
    await expect(page.getByRole('button', { name: 'Prosseguir para revisão do pedido' })).toBeEnabled()
  } finally { await user.context.close(); await other.context.close() }
})

test('preço, versão e disponibilidade são revalidados sem remover item nem expor procedimento', async ({ context, browser }) => {
  const data = await seed(context), item = data.items[0]!, user = await customer(browser), { page } = user
  try {
    await page.goto('/metodologias/' + item.methodologyId)
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await page.getByRole('link', { name: 'Ver carrinho', exact: true }).click()
    await expect(page.getByText('Valor na inclusão: R$ 10,00')).toBeVisible()
    await price(context, item.product!.id, '1250')
    await page.getByRole('button', { name: 'Atualizar valores' }).click()
    await expect(page.getByText('Preço atual: R$ 12,50')).toBeVisible()
    await expect(page.getByText('O preço mudou desde a inclusão.')).toBeVisible()
    const headers = await signed(context)
    const version = (await (await context.request.post('/api/v1/admin/methodologies/' + item.methodologyId + '/versions', { headers, data: { versionLabel: 'v2' } })).json()).data
    await publish(context, version, item.title + ' atualizada', item.marker)
    await page.getByRole('button', { name: 'Atualizar valores' }).click()
    await expect(page.getByText('Há uma nova versão publicada.')).toBeVisible()
    const current = (await (await context.request.get('/api/v1/admin/products/' + item.product!.id)).json()).data
    expect((await context.request.patch('/api/v1/admin/products/' + item.product!.id, { headers, data: { active: false, expectedRevision: current.revision } })).status()).toBe(200)
    await page.getByRole('button', { name: 'Atualizar valores' }).click()
    await expect(page.getByText(/mantido no carrinho e excluído do total/)).toBeVisible()
    await expect(page.getByText('R$ 0,00', { exact: true })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(1)
    expect(await page.locator('body').textContent()).not.toContain(item.marker)
    const cart = await user.context.request.get('/api/v1/cart'); expect(await cart.text()).not.toContain(item.marker)
    await page.goto('/consultas?q=' + data.token)
    await expect(page.getByRole('status')).toContainText('1 metodologia encontrada')
    await expect(page.getByText('Oferta comercial ainda não disponível.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toHaveCount(0)
  } finally { await user.context.close() }
})

test('prévia antiga falha com segurança, carrinho trata rede/expiração e cabe em 320 px', async ({ context, browser }) => {
  const data = await seed(context), item = data.items[0]!, user = await customer(browser), { page } = user
  try {
    await page.goto('/metodologias/' + item.methodologyId)
    await expect(page.getByText('R$ 10,00', { exact: true })).toBeVisible()
    await price(context, item.product!.id, '1250')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByRole('alert')).toContainText('Preço, versão ou disponibilidade mudou')
    expect((await (await user.context.request.get('/api/v1/cart')).json()).data.items).toHaveLength(0)
    await page.getByRole('button', { name: 'Atualizar página' }).click()
    await expect(page.getByText('R$ 12,50', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByRole('status')).toContainText('Produto no carrinho')
    await page.route('**/api/v1/cart', route => route.abort('failed'))
    await page.getByRole('link', { name: 'Ver carrinho', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível acessar o serviço')
    await page.unroute('**/api/v1/cart')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { name: 'Meu carrinho' })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(1)
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    }
    const refresh = page.getByRole('button', { name: 'Atualizar valores' })
    await refresh.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab')
    await expect(refresh).toBeFocused()
    expect(await refresh.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2)
    expect((await user.context.request.post('/api/v1/auth/logout', { headers: await signed(user.context), data: {} })).status()).toBe(204)
    await refresh.click()
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('Sua sessão expirou')
    expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/carrinho')
    expect(new URL(page.url()).origin).toBe(origin)
  } finally { await user.context.close() }
})
