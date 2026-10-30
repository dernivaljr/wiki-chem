import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { customer, origin, publish, seed, signed } from './commerce.fixture'
test.use({ storageState: '.test-fixtures/admin.json' })
async function purchase(page: Page, methodologyId: string) {
  await page.goto('/metodologias/' + methodologyId)
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Ver carrinho', exact: true }).click()
  await page.getByRole('button', { name: 'Avançar para checkout demonstrativo' }).click()
  await expect(page.getByRole('checkbox')).toBeVisible()
  const orderId = page.url().split('/').pop()!
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Confirmar aquisição de demonstração' }).click()
  await expect(page.getByRole('heading', { name: 'Aquisição simulada concluída' })).toBeVisible()
  return orderId
}
async function readState(context: BrowserContext, id: string, state: string) {
  const headers = await signed(context), current = (await (await context.request.get('/api/v1/admin/versions/' + id)).json()).data
  const response = await context.request.patch('/api/v1/admin/versions/' + id + '/access', { headers, data: { expectedRevision: current.revision, accessState: state, reason: 'Verificação editorial original DEMO de navegador.' } })
  expect(response.status()).toBe(200)
}
test('login → pesquisa → carrinho → revisão → pedido → biblioteca → procedimento autorizado', async ({ context, browser }) => {
  const data = await seed(context), item = data.items[0]!, user = await customer(browser), other = await customer(browser), { page } = user
  try {
    await user.context.request.post('/api/v1/auth/logout', { headers: await signed(user.context), data: {} })
    await page.goto('/consultas?q=' + data.token)
    await page.getByLabel('E-mail', { exact: true }).fill(user.email); await page.getByPlaceholder('••••••••').fill(user.password)
    await page.getByRole('button', { name: 'Entrar no Wiki-Chem' }).click()
    await expect(page.getByRole('status')).toContainText('1 metodologia encontrada')
    await page.getByRole('link', { name: item.title, exact: true }).click()
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await page.getByRole('link', { name: 'Ver carrinho', exact: true }).click()
    await page.getByRole('button', { name: 'Avançar para checkout demonstrativo' }).click()
    await expect(page.getByRole('checkbox')).toBeVisible()
    const id = page.url().split('/').pop()!
    expect((await user.context.request.get('/api/v1/library/' + item.methodologyId + '/content')).status()).toBe(403)
    await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Confirmar aquisição de demonstração' }).click()
    await page.getByRole('link', { name: 'Ver pedido persistido', exact: true }).click()
    await page.getByRole('link', { name: 'Ler ' + item.title + ' na minha biblioteca', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker)
    await expect(page.getByText('DEMONSTRAÇÃO — SEM COBRANÇA')).toBeVisible()
    expect((await other.context.request.get('/api/v1/library/' + item.methodologyId + '/content')).status()).toBe(403)
    expect((await context.request.get('/api/v1/library/' + item.methodologyId + '/content')).status()).toBe(403)
    const response = await user.context.request.get('/api/v1/library/' + item.methodologyId + '/content')
    expect(response.headers()['cache-control']).toContain('private, no-store')
    await page.getByRole('link', { name: 'Minha biblioteca', exact: true }).click()
    await expect(page.getByText('Versão adquirida: v1 · Atual: v1')).toBeVisible()
    expect(await page.locator('body').textContent()).not.toContain(item.marker)
    for (const width of [320, 375, 768, 1280]) { await page.setViewportSize({ width, height: 800 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true) }
    await page.goto('/consultas?q=' + data.token)
    await page.getByRole('link', { name: 'Na minha biblioteca', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker)
    const history = (await (await user.context.request.get('/api/v1/orders/' + id)).json()).data
    expect(history.items[0].versionLabelSnapshot).toBe('v1')
    expect(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).not.toContain(item.marker)
  } finally { await user.context.close(); await other.context.close() }
})
test('v1 e v2 sem recompra, suspensão editorial pela interface e escolha explícita de histórico', async ({ context, page: adminPage, browser }) => {
  const data = await seed(context), item = data.items[0]!, user = await customer(browser), { page } = user
  try {
    const orderId = await purchase(page, item.methodologyId)
    const original = (await (await user.context.request.get('/api/v1/orders/' + orderId)).json()).data.items[0]
    const headers = await signed(context), next = (await (await context.request.post('/api/v1/admin/methodologies/' + item.methodologyId + '/versions', { headers, data: { versionLabel: 'v2' } })).json()).data
    await publish(context, next, item.title + ' atualizada', item.marker + '_V2')
    await page.goto('/biblioteca/' + item.methodologyId)
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker + '_V2')
    await page.getByLabel('Selecionar versão histórica').selectOption(original.methodologyVersionId)
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).not.toContainText('_V2')
    await adminPage.goto('/admin')
    await adminPage.getByRole('button', { name: item.slug + ' — PUBLISHED', exact: true }).click()
    await adminPage.getByRole('button', { name: 'v2 — PUBLISHED — ' + item.title + ' atualizada', exact: true }).click()
    await adminPage.getByLabel('Justificativa da alteração de acesso').fill('Suspensão original DEMO para testar indisponibilidade.')
    await adminPage.getByRole('button', { name: 'Suspender acesso à versão' }).click()
    await expect(adminPage.getByRole('button', { name: 'Restaurar acesso à versão' })).toBeVisible()
    await page.getByRole('button', { name: 'Consultar versão atual', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Leitura autorizada' }).getByRole('alert')).toContainText('suspensa')
    expect(await page.getByRole('region', { name: 'Leitura autorizada' }).textContent()).not.toContain(item.marker)
    await page.getByLabel('Selecionar versão histórica').selectOption(original.methodologyVersionId)
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker)
    for (const width of [320, 375, 768, 1280]) { await page.setViewportSize({ width, height: 800 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true) }
    const selector = page.getByLabel('Selecionar versão histórica'); await selector.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(selector).toBeFocused()
    await adminPage.getByLabel('Justificativa da alteração de acesso').fill('Restauração após verificação original DEMO.')
    await adminPage.getByRole('button', { name: 'Restaurar acesso à versão' }).click()
    await expect(adminPage.getByRole('button', { name: 'Suspender acesso à versão' })).toBeVisible()
    await page.getByRole('button', { name: 'Consultar versão atual', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker + '_V2')
    expect((await (await user.context.request.get('/api/v1/orders')).json()).total).toBe(1)
    expect((await (await user.context.request.get('/api/v1/orders/' + orderId)).json()).data.items[0]).toEqual(original)
  } finally { await user.context.close() }
})
test('rede, sessão expirada, retirada de venda e versão alheia nunca reapresentam procedimento indevido', async ({ context, browser }) => {
  const data = await seed(context, 2), item = data.items[0]!, user = await customer(browser), { page } = user
  try {
    await purchase(page, item.methodologyId)
    const product = (await (await context.request.get('/api/v1/admin/products/' + item.product!.id)).json()).data
    expect((await context.request.patch('/api/v1/admin/products/' + product.id, { headers: await signed(context), data: { active: false, expectedRevision: product.revision } })).status()).toBe(200)
    await page.goto('/biblioteca/' + item.methodologyId)
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker)
    await page.route('**/api/v1/library/*/content*', route => route.abort('failed'))
    await page.getByRole('button', { name: 'Verificar acesso novamente' }).click()
    await expect(page.getByRole('region', { name: 'Leitura autorizada' }).getByRole('alert')).toContainText('Não foi possível acessar')
    expect(await page.locator('body').textContent()).not.toContain(item.marker)
    await page.unroute('**/api/v1/library/*/content*'); await page.getByRole('button', { name: 'Verificar acesso novamente' }).click()
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker)
    const foreign = (await (await user.context.request.get('/api/v1/methodologies/' + data.items[1]!.methodologyId)).json()).data
    await page.goto('/biblioteca/' + item.methodologyId + '?versionId=' + foreign.versionId)
    await expect(page.getByRole('region', { name: 'Leitura autorizada' }).getByRole('alert')).toContainText('Versão publicada não encontrada')
    expect(await page.locator('body').textContent()).not.toContain(item.marker)
    await page.goto('/biblioteca/' + item.methodologyId)
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker)
    await user.context.request.post('/api/v1/auth/logout', { headers: await signed(user.context), data: {} })
    await page.getByRole('button', { name: 'Verificar acesso novamente' }).click()
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/biblioteca/' + item.methodologyId)
    expect(new URL(page.url()).origin).toBe(origin)
    expect(await page.locator('body').textContent()).not.toContain(item.marker)
  } finally { await user.context.close() }
})
test('biblioteca vazia, rascunho e erro não vazam conteúdo em respostas gratuitas nem ativos', async ({ context, browser }) => {
  const data = await seed(context), item = data.items[0]!, user = await customer(browser), { page } = user
  try {
    await page.goto('/biblioteca'); await expect(page.getByText(/Sua biblioteca está vazia/)).toBeVisible()
    await purchase(page, item.methodologyId)
    const draft = (await (await context.request.post('/api/v1/admin/methodologies/' + item.methodologyId + '/versions', { headers: await signed(context), data: { versionLabel: 'draft' } })).json()).data
    expect((await user.context.request.get('/api/v1/library/' + item.methodologyId + '/content?versionId=' + draft.id)).status()).toBe(404)
    const preview = (await (await user.context.request.get('/api/v1/methodologies/' + item.methodologyId)).json()).data
    await readState(context, preview.versionId, 'SUSPENDED')
    expect((await user.context.request.get('/api/v1/library/' + item.methodologyId + '/content')).status()).toBe(403)
    await readState(context, preview.versionId, 'ALLOWED')
    for (const path of ['/api/v1/library', '/api/v1/library/' + item.methodologyId, '/api/v1/library/' + item.methodologyId + '/versions', '/api/v1/methodologies', '/api/v1/methodologies/' + item.methodologyId, '/api/v1/orders']) expect(await (await user.context.request.get(path)).text()).not.toContain(item.marker)
    await page.goto('/biblioteca/' + item.methodologyId)
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText(item.marker)
    const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => (node as HTMLScriptElement).src))
    for (const url of scripts) expect(await (await user.context.request.get(url)).text()).not.toContain(item.marker)
  } finally { await user.context.close() }
})
