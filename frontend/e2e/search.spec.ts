import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { Browser, BrowserContext } from '@playwright/test'
import { demoEditor } from '../../backend/tests/catalog-fixtures'
import { facets, labels } from '../src/catalog/types'
import type { Facet } from '../src/catalog/types'

test.use({ storageState: '.test-fixtures/admin.json' })
const origin = 'http://127.0.0.1:4174'
async function setup(context: BrowserContext, browser: Browser) {
  const token = 'demobusca' + randomUUID().replaceAll('-', '')
  const session = (await (await context.request.get('/api/v1/auth/session')).json()).data
  const headers = { Origin: origin, 'X-CSRF-Token': session.csrfToken as string }
  const ids = {} as Record<Facet, string[]>, names = {} as Record<Facet, string[]>
  for (const facet of facets) {
    ids[facet] = []; names[facet] = []
    for (const suffix of ['A', 'B']) {
      const label = labels[facet] + ' DEMO ' + token + suffix
      const response = await context.request.post('/api/v1/admin/taxonomies/' + facet, { headers, data: {
        code: (token + '-' + facet + '-' + suffix).toLowerCase().slice(0, 60), label,
        ...(facet === 'standards' ? { issuer: 'Emissor sintético DEMO', identifier: token + suffix, editionLabel: 'DEMO', verifiedStatus: 'VERIFIED' } : {}),
      } })
      expect(response.status()).toBe(201)
      ids[facet].push((await response.json()).data.id); names[facet].push(label)
    }
  }
  const methods: { id: string; title: string; marker: string }[] = []
  for (const suffix of ['A', 'B']) {
    const created = await context.request.post('/api/v1/admin/methodologies', { headers, data: { slug: token + '-' + suffix.toLowerCase() } })
    expect(created.status()).toBe(201); const method = (await created.json()).data
    const version = (await (await context.request.post('/api/v1/admin/methodologies/' + method.id + '/versions', { headers, data: { versionLabel: 'v1' } })).json()).data
    const selected = Object.fromEntries(facets.map(facet => [facet, suffix === 'A' && ['matrices', 'analytes'].includes(facet) ? ids[facet] : [ids[facet][suffix === 'A' ? 0 : 1]!]])) as Record<Facet, string[]>
    const marker = 'DEMO_PRIVATE_SEARCH_' + randomUUID()
    const editor = demoEditor(selected, marker)
    editor.title = 'DEMO ' + token + (suffix === 'A' ? ' Água' : ' Zinco')
    editor.freeSummary = suffix === 'A' ? 'Resumo gratuito DEMO Fe²⁺ Na+ 10%_! sem procedimento.' : 'Resumo gratuito DEMO de teste.'
    editor.sources[0]!.referenceText = 'Referência original DEMO ' + token + suffix
    editor.sources[0]!.permissionEvidence = marker
    const savedResponse = await context.request.patch('/api/v1/admin/versions/' + version.id, { headers, data: { ...editor, expectedRevision: version.revision } })
    expect(savedResponse.status()).toBe(200); const saved = (await savedResponse.json()).data
    expect((await context.request.post('/api/v1/admin/versions/' + saved.id + '/publish', { headers, data: { expectedRevision: saved.revision, reviewAcknowledged: true, reviewNote: 'Revisão explícita de fixture original DEMO, sem método científico real.' } })).status()).toBe(200)
    methods.push({ id: method.id, title: editor.title, marker })
  }
  const customer = await browser.newContext({ baseURL: origin, storageState: { cookies: [], origins: [] } })
  const email = token + '@example.test', password = 'Senha original de teste DEMO 123!'
  expect((await customer.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { email, password, displayName: 'Pesquisa DEMO' } })).status()).toBe(201)
  expect((await customer.request.post('/api/v1/auth/login', { headers: { Origin: origin }, data: { email, password } })).status()).toBe(200)
  return { token, ids, names, methods, customer, page: await customer.newPage() }
}

test('CUSTOMER pesquisa, pagina, combina sete filtros e retorna do detalhe com URL preservada', async ({ context, browser }) => {
  test.setTimeout(60000)
  const data = await setup(context, browser), { page } = data
  try {
    await page.goto('/consultas?q=' + data.token + '&pageSize=1')
    await expect(page.getByRole('status')).toContainText('2 metodologias encontradas')
    await expect(page.getByRole('link', { name: data.methods[0]!.title, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Próxima', exact: true }).click()
    await expect(page.getByRole('link', { name: data.methods[1]!.title, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Anterior', exact: true }).click()
    for (const facet of facets) {
      const group = page.getByRole('group', { name: labels[facet], exact: true })
      await group.getByRole('checkbox', { name: new RegExp(data.names[facet][0]!) }).check()
      if (facet === 'matrices' || facet === 'analytes') await group.getByRole('checkbox', { name: new RegExp(data.names[facet][1]!) }).check()
    }
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(page.getByRole('status')).toContainText('1 metodologia encontrada')
    expect(new URL(page.url()).searchParams.getAll('analyteIds')).toHaveLength(2)
    expect(new URL(page.url()).searchParams.getAll('matrixIds')).toHaveLength(2)
    await page.reload()
    await expect(page.getByRole('group', { name: 'Analitos', exact: true }).getByRole('checkbox', { name: new RegExp(data.names.analytes[0]!) })).toBeChecked()
    const queryUrl = page.url()
    await page.getByRole('link', { name: data.methods[0]!.title, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: data.methods[0]!.title })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Descrição gratuita' })).toBeVisible()
    await expect(page.getByText('Oferta comercial ainda não disponível.')).toBeVisible()
    const detail = await data.customer.request.get('/api/v1/methodologies/' + data.methods[0]!.id)
    expect(await detail.text()).not.toContain(data.methods[0]!.marker)
    expect(await page.locator('body').textContent()).not.toContain(data.methods[0]!.marker)
    await page.getByRole('link', { name: 'Voltar à pesquisa' }).click()
    await expect(page).toHaveURL(queryUrl)
    await page.getByRole('button', { name: /Remover Técnicas:/ }).click()
    expect(new URL(page.url()).searchParams.has('techniqueIds')).toBe(false)
    await page.getByRole('button', { name: 'Limpar pesquisa e filtros' }).click()
    await expect(page).toHaveURL(origin + '/consultas')
  } finally { await data.customer.close() }
})

test('busca textual real trata acentos e símbolos, vazio, rede e sessão expirada', async ({ context, browser }) => {
  test.setTimeout(60000)
  const data = await setup(context, browser), { page } = data
  try {
    await page.goto('/consultas?q=' + data.token)
    await expect(page.getByRole('status')).toContainText('2 metodologias encontradas')
    for (const word of ['agua', 'Na+', '10%_!']) {
      await page.getByRole('searchbox').fill(data.token + ' ' + word)
      await page.getByRole('button', { name: 'Pesquisar', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('1 metodologia encontrada')
      await expect(page.getByRole('link', { name: data.methods[0]!.title, exact: true })).toBeVisible()
    }
    await page.getByRole('searchbox').fill(data.token + ' inexistente')
    await page.getByRole('button', { name: 'Pesquisar', exact: true }).click()
    await expect(page.getByText(/Nenhuma metodologia encontrada/)).toBeVisible()
    await page.route('**/api/v1/methodologies?*', route => route.abort('failed'))
    await page.getByRole('button', { name: 'Pesquisar', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível acessar o serviço')
    await page.unroute('**/api/v1/methodologies?*')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByText(/Nenhuma metodologia encontrada/)).toBeVisible()
    const session = (await (await data.customer.request.get('/api/v1/auth/session')).json()).data
    expect((await data.customer.request.post('/api/v1/auth/logout', { headers: { Origin: origin, 'X-CSRF-Token': session.csrfToken }, data: {} })).status()).toBe(204)
    await page.getByRole('button', { name: 'Pesquisar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('Sua sessão expirou')
    expect(new URL(page.url()).searchParams.get('returnTo')).toContain('/consultas?q=')
  } finally { await data.customer.close() }
})

test('pesquisa e detalhe preservam largura de 320 px, foco e navegação por teclado', async ({ context, browser }) => {
  test.setTimeout(60000)
  const data = await setup(context, browser), { page } = data
  try {
    await page.goto('/consultas?q=' + data.token)
    await expect(page.getByRole('status')).toContainText('2 metodologias encontradas')
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
      expect(size.content).toBeLessThanOrEqual(size.viewport)
    }
    const input = page.getByRole('searchbox')
    await input.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab')
    await expect(input).toBeFocused()
    expect(await input.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2)
    const checkbox = page.getByRole('group', { name: 'Matrizes', exact: true }).getByRole('checkbox', { name: new RegExp(data.names.matrices[0]!) })
    await checkbox.focus(); await page.keyboard.press('Space'); await expect(checkbox).toBeChecked()
    await page.getByRole('link', { name: data.methods[0]!.title, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: data.methods[0]!.title })).toBeVisible()
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.goto('/metodologias/18446744073709551615?from=https://evil.invalid')
    await expect(page.getByRole('heading', { name: 'Metodologia indisponível' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar à pesquisa' })).toHaveAttribute('href', '/consultas')
  } finally { await data.customer.close() }
})
