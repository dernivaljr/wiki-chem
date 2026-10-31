import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { demoEditor } from '../../backend/tests/catalog-fixtures'
import type { Facet } from '../../backend/src/modules/catalog/catalog.contracts'

test.use({ storageState: '.test-fixtures/admin.json' })
const facets: Facet[] = ['techniques', 'technologies', 'equipment', 'matrices', 'analytes', 'standards', 'segments']
const origin = 'http://127.0.0.1:4174'
async function signed(context: BrowserContext) {
  const response = await context.request.get('/api/v1/auth/session')
  expect(response.status()).toBe(200)
  return { Origin: origin, 'X-CSRF-Token': (await response.json()).data.csrfToken as string }
}
async function seedTerms(context: BrowserContext) {
  const key = randomUUID().slice(0, 8), headers = await signed(context)
  const ids = {} as Record<Facet, string[]>, names = {} as Record<Facet, string[]>
  for (const facet of facets) {
    ids[facet] = []; names[facet] = []
    for (const suffix of ['A', 'B']) {
      const label = facet + ' DEMO ' + key + ' ' + suffix
      const response = await context.request.post('/api/v1/admin/taxonomies/' + facet, { headers, data: {
        code: ('demo-' + facet + '-' + key + '-' + suffix).toLowerCase(), label,
        ...(facet === 'standards' ? { issuer: 'Emissor sintético DEMO', identifier: key + suffix, editionLabel: 'DEMO', verifiedStatus: 'VERIFIED' } : {}),
      } })
      expect(response.status()).toBe(201)
      ids[facet].push((await response.json()).data.id); names[facet].push(label)
    }
  }
  return { ids, names }
}
async function createUi(page: Page) {
  const slug = 'demo-ui-' + randomUUID().slice(0, 8)
  await page.goto('/admin')
  await page.getByLabel('Identificador da metodologia', { exact: true }).fill(slug)
  await page.getByRole('button', { name: 'Criar metodologia', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2, name: slug, exact: true })).toBeVisible()
  await page.getByLabel('Identificador da nova versão').fill('v1')
  await page.getByRole('button', { name: 'Criar rascunho', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Versão v1 — DRAFT', exact: true })).toBeVisible()
  return slug
}
async function review(page: Page) {
  await page.getByLabel('Nota da revisão', { exact: true }).fill('Revisão explícita da fixture original DEMO; sem uso laboratorial.')
  await page.getByRole('checkbox', { name: 'Revisei o conteúdo salvo, autoria, classificações e condições de uso.' }).check()
}
test('admin cadastra termo e desativa sem criar dados científicos reais', async ({ page }) => {
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Classificações', exact: true }).click()
  const code = 'demo-term-' + randomUUID().slice(0, 8)
  await page.getByLabel('Código do termo').fill(code)
  await page.getByLabel('Nome do termo').fill('Termo sintético DEMO ' + code)
  await page.getByRole('button', { name: 'Cadastrar termo' }).click()
  await expect(page.getByRole('status')).toHaveText('Classificação salva.')
  await page.getByRole('button', { name: 'Editar Termo sintético DEMO ' + code }).click()
  await page.getByRole('checkbox', { name: 'Termo ativo para novas classificações' }).uncheck()
  await page.getByRole('button', { name: 'Salvar termo', exact: true }).click()
  await expect(page.getByText('Termo sintético DEMO ' + code + ' (' + code + ') — Inativo', { exact: true })).toBeVisible()
})
test('rascunho incompleto não publica e pode ser excluído', async ({ page }) => {
  await createUi(page)
  await page.getByLabel('Título', { exact: true }).fill('DEMO incompleto')
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Rascunho salvo.', { exact: true })).toBeVisible()
  await review(page)
  await page.getByRole('button', { name: 'Publicar versão revisada' }).click()
  await expect(page.getByRole('alert')).toContainText('Publicação bloqueada')
  await page.getByRole('button', { name: 'Excluir rascunho', exact: true }).click()
  await expect(page.getByText('Rascunho removido da listagem.', { exact: true })).toBeVisible()
})
test('formulário real publica, versiona e preserva procedimento anterior', async ({ page, context }) => {
  test.setTimeout(60000)
  const terms = await seedTerms(context)
  const slug = await createUi(page)
  const marker = 'DEMO_RESTRICTED_' + randomUUID()
  const fields = demoEditor(terms.ids, marker)
  await page.getByLabel('Título', { exact: true }).fill(fields.title)
  await page.getByLabel('Resumo gratuito', { exact: true }).fill(fields.freeSummary)
  await page.getByLabel('Descrição pública', { exact: true }).fill(fields.publicDescription)
  await page.getByLabel('Descrição técnica completa', { exact: true }).fill(fields.fullDescription)
  await page.getByLabel('Procedimento completo', { exact: true }).fill(fields.fullProcedure)
  await page.getByLabel('Descrição das alterações', { exact: true }).fill(fields.changelog)
  for (const facet of facets) for (const name of terms.names[facet]) await page.getByRole('checkbox', { name, exact: true }).check()
  await page.getByRole('button', { name: 'Adicionar fonte', exact: true }).click()
  const source = fields.sources[0]!
  await page.getByLabel('Referência 1', { exact: true }).fill(source.referenceText)
  await page.getByLabel('Tipo da fonte 1', { exact: true }).selectOption('ORIGINAL')
  await page.getByLabel('Crédito do titular 1', { exact: true }).fill(source.ownerCredit)
  await page.getByLabel('Localizador 1', { exact: true }).fill(source.locator)
  await page.getByLabel('Condições de uso 1', { exact: true }).fill(source.usageConditions)
  await page.getByLabel('Evidência privada 1', { exact: true }).fill(source.permissionEvidence)
  await page.getByLabel('Situação da condição de uso 1', { exact: true }).selectOption('APPROVED')
  await page.getByRole('checkbox', { name: 'Conferi a condição de uso e a evidência da fonte 1', exact: true }).check()
  for (const [index, contributor] of fields.contributors.entries()) {
    await page.getByRole('button', { name: 'Adicionar contribuição', exact: true }).click()
    await page.getByLabel('Nome da contribuição ' + (index + 1), { exact: true }).fill(contributor.displayName)
    await page.getByLabel('Tipo da contribuição ' + (index + 1), { exact: true }).selectOption(contributor.contributorType)
    await page.getByLabel('Papel da contribuição ' + (index + 1), { exact: true }).selectOption(contributor.role)
  }
  await review(page)
  await expect(page.getByRole('button', { name: 'Publicar versão revisada' })).toBeDisabled()
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Rascunho salvo.', { exact: true })).toBeVisible()
  await review(page)
  await page.getByRole('button', { name: 'Publicar versão revisada' }).click()
  await expect(page.getByRole('heading', { name: 'Versão v1 — PUBLISHED', exact: true })).toBeVisible()
  await expect(page.getByLabel('Procedimento completo', { exact: true })).toBeDisabled()
  await page.getByLabel('Identificador da nova versão').fill('v2')
  await page.getByRole('checkbox', { name: 'Copiar a versão selecionada; condições de uso voltarão a pendentes' }).check()
  await page.getByRole('button', { name: 'Criar rascunho', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Versão v2 — DRAFT', exact: true })).toBeVisible()
  await expect(page.getByLabel('Situação da condição de uso 1', { exact: true })).toHaveValue('PENDING')
  await expect(page.getByLabel('Evidência privada 1', { exact: true })).toHaveValue('')
  await page.getByLabel('Título', { exact: true }).fill('DEMO segunda versão')
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Rascunho salvo.', { exact: true })).toBeVisible()
  await review(page)
  await page.getByRole('button', { name: 'Publicar versão revisada' }).click()
  await expect(page.getByRole('alert')).toContainText('Publicação bloqueada')
  await page.getByRole('button', { name: /^v1 — PUBLISHED/ }).click()
  await expect(page.getByLabel('Procedimento completo', { exact: true })).toHaveValue(fields.fullProcedure)
  const headers = await signed(context)
  const list = await (await context.request.get('/api/v1/admin/methodologies?pageSize=100')).json()
  const method = list.data.find((item: { slug: string }) => item.slug === slug)
  const preview = await context.request.get('/api/v1/methodologies/' + method.id)
  expect(preview.status()).toBe(200)
  expect(await preview.text()).not.toContain(marker)
  expect((await context.request.post('/api/v1/admin/versions/' + method.currentPublishedVersionId + '/publish', { headers, data: { expectedRevision: 1, reviewAcknowledged: true, reviewNote: 'Não pode republicar' } })).status()).toBe(409)
})
test('CUSTOMER recebe bloqueio na UI e no backend sem conteúdo integral', async ({ browser, context }) => {
  const other = await browser.newContext({ storageState: { cookies: [], origins: [] }, baseURL: origin })
  try {
    const email = 'demo-customer-' + randomUUID().slice(0, 8) + '@example.test', password = 'Senha sintética de teste 123!'
    expect((await other.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Cliente DEMO', email, password } })).status()).toBe(201)
    expect((await other.request.post('/api/v1/auth/login', { headers: { Origin: origin }, data: { email, password } })).status()).toBe(200)
    const terms = await seedTerms(context), headers = await signed(context)
    const methodResponse = await context.request.post('/api/v1/admin/methodologies', { headers, data: { slug: 'demo-private-' + randomUUID().slice(0, 8) } })
    const method = (await methodResponse.json()).data
    const created = (await (await context.request.post('/api/v1/admin/methodologies/' + method.id + '/versions', { headers, data: { versionLabel: 'v1' } })).json()).data
    const marker = 'DEMO_SECRET_' + randomUUID()
    const saved = (await (await context.request.patch('/api/v1/admin/versions/' + created.id, { headers, data: { ...demoEditor(terms.ids, marker), expectedRevision: created.revision } })).json()).data
    expect((await context.request.post('/api/v1/admin/versions/' + saved.id + '/publish', { headers, data: { expectedRevision: saved.revision, reviewAcknowledged: true, reviewNote: 'Revisão da fixture original DEMO.' } })).status()).toBe(200)
    const denied = await other.request.get('/api/v1/admin/versions/' + saved.id)
    expect(denied.status()).toBe(403)
    expect(await denied.text()).not.toContain(marker)
    const preview = await other.request.get('/api/v1/methodologies/' + method.id)
    expect(preview.status()).toBe(200); expect(await preview.text()).not.toContain(marker)
    const page = await other.newPage()
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible()
    await expect(page.getByLabel('Procedimento completo', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Perfil', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Administração', exact: true })).toHaveCount(0)
  } finally { await other.close() }
})
test('admin mantém formulário e cabeçalho sem overflow em 320 px e com foco visível', async ({ page }) => {
  await createUi(page)
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await page.evaluate(() => document.fonts.ready)
    const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
    expect(size.content).toBeLessThanOrEqual(size.viewport)
  }
  await page.getByLabel('Título', { exact: true }).focus()
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab')
  await expect(page.getByLabel('Título', { exact: true })).toBeFocused()
  const outline = await page.getByLabel('Título', { exact: true }).evaluate(node => getComputedStyle(node).outlineWidth)
  expect(parseFloat(outline)).toBeGreaterThanOrEqual(2)
})
