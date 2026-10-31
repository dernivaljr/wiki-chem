import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { RowDataPacket } from 'mysql2/promise'
import { loadConfig } from '../../backend/src/config/env'
import { createDatabasePool } from '../../backend/src/database/pool'
import { migrateTestDatabase, resetTestDatabase } from '../../backend/tests/test-database'
import { seedAcademic, demoOperator } from '../../backend/tests/demo/seed'
import { academicEditor } from '../../backend/tests/demo/examples'
import { technicalSheets, technicalTaxonomies } from '../../backend/tests/demo/technical-catalog'
import { hashPassword } from '../../backend/src/modules/identity/security'
import { facets, labels } from '../src/catalog/types'
import { origin, signed } from './commerce.fixture'

test.use({ storageState: { cookies: [], origins: [] } })

test('ACADEMICO: evidências reais do percurso completo, catálogo técnico e administração separada', async ({ browser }) => {
  test.setTimeout(180000)
  const config = loadConfig({ ...process.env, APP_ORIGIN: origin }), pool = createDatabasePool(config)
  const output = resolve('../.artifacts/evidence'); await mkdir(output, { recursive: true })
  await resetTestDatabase(pool, config); await migrateTestDatabase(config)
  const data = await seedAcademic(config, pool, { ...process.env, DEMO_ALLOW: 'true' })
  const [admins] = await pool.execute<RowDataPacket[]>('SELECT id,email_normalized FROM users WHERE provisioned_by = ?', [demoOperator])
  const adminPassword = randomBytes(24).toString('base64url')
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(adminPassword), admins[0]!.id])
  const customer = await browser.newContext({ baseURL: origin, storageState: { cookies: [], origins: [] } }), admin = await browser.newContext({ baseURL: origin, storageState: { cookies: [], origins: [] } })
  const page = await customer.newPage(), adminPage = await admin.newPage(), captured: { file: string; description: string }[] = []
  async function capture(target: Page, file: string, description: string) {
    await target.screenshot({ path: resolve(output, file), fullPage: true, animations: 'disabled', maskColor: '#16395c', mask: [target.locator('input[type="password"],input[type="email"],input[name="password"]'), target.getByLabel(/Evidência privada/)] })
    captured.push({ file, description })
  }
  try {
    await page.goto('/'); await expect(page.getByRole('heading', { level: 1, name: 'Wiki-Chem' })).toBeVisible(); await capture(page, '01-home.png', 'Página inicial, identidade visual preservada.')
    await page.goto('/login'); await page.getByRole('tab', { name: 'Criar conta', exact: true }).click()
    await expect(page.getByLabel('Nome completo', { exact: true })).toBeVisible(); await capture(page, '02-cadastro.png', 'Cadastro real, sem dados pessoais ou credenciais na captura.')
    const email = 'academic-' + randomUUID() + '@example.invalid', password = randomBytes(24).toString('base64url')
    await page.getByLabel('Nome completo', { exact: true }).fill('Conta sintética acadêmica')
    await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByPlaceholder('••••••••').fill(password)
    await page.getByRole('button', { name: 'Criar minha conta' }).click()
    await expect(page.getByRole('status')).toContainText('Conta criada')
    await capture(page, '03-login.png', 'Cadastro concluído e acesso por autenticação real.')
    await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByPlaceholder('••••••••').fill(password)
    await page.getByRole('button', { name: 'Entrar no Wiki-Chem' }).click()
    await expect(page.getByRole('status')).toContainText('20 metodologias encontradas')
    await capture(page, '04-pesquisa.png', 'Catálogo demonstrativo com 15 fichas técnicas analíticas verificadas e 5 fixtures comerciais sintéticas.')
    await page.getByRole('searchbox', { name: 'Termo de consulta' }).fill('ferro')
    for (const facet of facets) {
      const targetCode = technicalSheets[0]!.classifications[facet][0]!
      const targetLabel = technicalTaxonomies[facet].find(term => term.code === targetCode)!.label
      await page.getByRole('group', { name: labels[facet], exact: true }).getByRole('checkbox', { name: targetLabel, exact: true }).check()
    }
    await page.getByRole('button', { name: 'Pesquisar', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('1 metodologia encontrada')
    await expect(page.getByRole('link', { name: /1,10-fenantrolina/ })).toBeVisible()
    await expect(page.getByText('Ficha técnica informativa de referência pública — sem oferta comercial de conteúdo de terceiros.')).toBeVisible()
    await capture(page, '05-sete-filtros.png', 'Pesquisa por ferro combinada com espectrofotometria/UV-Vis e os sete filtros analíticos reais.')
    await page.getByRole('button', { name: 'Limpar pesquisa e filtros' }).click()
    await expect(page.getByRole('status')).toContainText('20 metodologias encontradas')
    await page.getByRole('link', { name: data.methods[0]!.title, exact: true }).click()
    await expect(page).toHaveURL(url => url.pathname === '/metodologias/' + data.methods[0]!.id)
    await expect(page.getByRole('heading', { level: 1, name: data.methods[0]!.title, exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeVisible()
    await capture(page, '06-previa.png', 'Prévia gratuita e oferta de demonstração sintética separada das fichas informativas.')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click(); await page.getByRole('link', { name: 'Ver carrinho', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Meu carrinho' })).toBeVisible(); await expect(page.getByRole('article')).toHaveCount(1); await capture(page, '07-carrinho.png', 'Carrinho persistente com valores de fixture explicitamente demonstrativos.')
    await page.getByRole('button', { name: 'Avançar para checkout demonstrativo' }).click()
    await expect(page.getByRole('checkbox')).toBeVisible(); await capture(page, '08-revisao-pedido.png', 'Pedido pendente e confirmação explícita obrigatória; sem cobrança.')
    expect((await customer.request.get('/api/v1/library/' + data.methods[0]!.id + '/content')).status()).toBe(403)
    await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Confirmar aquisição de demonstração' }).click()
    await expect(page.getByRole('heading', { name: 'Aquisição simulada concluída' })).toBeVisible(); await capture(page, '09-confirmacao.png', 'Confirmação demonstrativa concluída e direito persistido.')
    await page.getByRole('link', { name: 'Ver pedido persistido', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes do pedido' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Aquisição simulada concluída' })).toBeVisible(); await capture(page, '10-pedido.png', 'Pedido persistido com título, versão e preço originais.')
    await page.getByRole('link', { name: 'Minha biblioteca', exact: true }).click(); await expect(page.getByRole('heading', { level: 1, name: 'Minha biblioteca' })).toBeVisible()
    await expect(page.getByText('Versão adquirida: v1 · Atual: v1')).toBeVisible(); await capture(page, '11-biblioteca.png', 'Biblioteca do titular, sem procedimento na listagem.')
    await page.getByRole('link', { name: data.methods[0]!.title, exact: true }).click()
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText('Percurso de software v1'); await capture(page, '12-leitura-v1.png', 'Texto integral original sintético liberado somente ao titular.')
    const login = await admin.request.post('/api/v1/auth/login', { headers: { Origin: origin }, data: { email: admins[0]!.email_normalized, password: adminPassword } }); expect(login.status()).toBe(200)
    await adminPage.goto('/admin'); await adminPage.getByRole('button', { name: data.methods[0]!.slug + ' — PUBLISHED', exact: true }).click()
    await adminPage.getByLabel('Identificador da nova versão').fill('v2'); await adminPage.getByRole('button', { name: 'Criar rascunho', exact: true }).click()
    await expect(adminPage.getByRole('heading', { name: 'Versão v2 — DRAFT', exact: true })).toBeVisible()
    const versions = (await (await admin.request.get('/api/v1/admin/methodologies/' + data.methods[0]!.id + '/versions')).json()).data, draft = versions.find((v: { versionLabel: string }) => v.versionLabel === 'v2')
    const saved = await admin.request.patch('/api/v1/admin/versions/' + draft.id, { headers: await signed(admin), data: { ...academicEditor(0, undefined, 'v2'), expectedRevision: draft.revision } }); expect(saved.status()).toBe(200)
    await adminPage.getByRole('button', { name: 'Descartar edição local e recarregar versão' }).click()
    await expect(adminPage.getByLabel('Título', { exact: true })).toHaveValue(data.methods[0]!.title)
    await capture(adminPage, '13-admin-rascunho.png', 'Administração separada: rascunho v2 de fixture sintética; evidências privadas mascaradas.')
    await adminPage.getByLabel('Nota da revisão', { exact: true }).fill('Conferência automatizada de fixture original; não representa revisão humana científica ou autorização de terceiros.')
    await adminPage.getByRole('checkbox', { name: 'Revisei o conteúdo salvo, autoria, classificações e condições de uso.' }).check()
    await capture(adminPage, '14-revisao-automatizada.png', 'Estado editorial de teste: conferência automatizada explicitamente identificada, sem revisão humana presumida.')
    await adminPage.getByRole('button', { name: 'Publicar versão revisada' }).click()
    await expect(adminPage.getByRole('heading', { name: 'Versão v2 — PUBLISHED', exact: true })).toBeVisible()
    await page.reload(); await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText('Percurso de software v2')
    await page.getByLabel('Selecionar versão histórica').selectOption(data.methods[0]!.versionId)
    await expect(page.getByRole('region', { name: 'Leitura autorizada' })).toContainText('Percurso de software v1'); await capture(page, '15-historico.png', 'Atualização v2 disponível e escolha explícita da v1 adquirida, sem recompra.')
    for (const width of [320, 375, 768, 1280]) { await page.setViewportSize({ width, height: 800 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true) }
    await page.setViewportSize({ width: 320, height: 800 }); await capture(page, '16-leitura-320.png', 'Leitura responsiva em viewport de 320 px.')
    await page.goto('/consultas'); await expect(page.getByRole('status')).toContainText('20 metodologias encontradas'); await capture(page, '17-pesquisa-320.png', 'Pesquisa, navegação e sete categorias compactas em 320 px.')
    await adminPage.getByRole('button', { name: 'Classificações', exact: true }).click(); await expect(adminPage.getByLabel('Código do termo')).toBeVisible(); await capture(adminPage, '18-classificacoes.png', 'Gestão de taxonomias reais de química analítica, com identificação normativa explícita.')
    await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), notice: data.notice, capture: 'Chromium automatizado com API e MySQL reais; senhas, e-mails e evidências privadas mascarados.', files: captured }, null, 2))
  } finally { await customer.close(); await admin.close(); await pool.end() }
})
