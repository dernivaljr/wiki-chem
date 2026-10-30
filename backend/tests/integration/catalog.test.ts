import { randomUUID } from 'node:crypto'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import type { RowDataPacket } from 'mysql2/promise'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'

import { provisionInitialAdmin } from '../../src/modules/identity/admin-bootstrap.js'
import { createIdentityRepository } from '../../src/modules/identity/identity.repository.js'
import { createCatalogRepository } from '../../src/modules/catalog/catalog.repository.js'
import { facets, searchQuery } from '../../src/modules/catalog/catalog.contracts.js'
import type { Facet, Methodology, Version } from '../../src/modules/catalog/catalog.contracts.js'
import { demoEditor } from '../catalog-fixtures.js'
import { migrateTestDatabase, resetTestDatabase } from '../test-database.js'

const env = loadConfig(process.env)
if (env.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(env.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') throw new Error('Catálogo exige banco descartável explícito.')
const config = { ...env, LOG_LEVEL: 'silent' as const, AUTH_RATE_LIMIT_MAX: 100 }
const pool = createDatabasePool(config)
let app: FastifyInstance, admin: { cookie: string; csrf: string; id: string }, customer: { cookie: string; csrf: string; id: string }
const prefix = 'demo-' + randomUUID().slice(0, 8)
let serial = 0
const password = 'Senha sintética DEMO de teste 123'
const termIds = {} as Record<Facet, string[]>
const privateMarker = 'DEMO_PRIVATE_PROCEDURE_' + randomUUID()
const evidenceMarker = 'DEMO_PRIVATE_EVIDENCE_' + randomUUID()
const rows = async (sql: string, params: (string | number)[] = []) => (await pool.execute<RowDataPacket[]>(sql, params))[0]
function credentials(response: LightMyRequestResponse) {
  const header = response.headers['set-cookie']
  const cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0]
  if (!cookie) throw new Error('Cookie ausente')
  return { cookie, csrf: response.json().data.csrfToken as string, id: response.json().data.user.id as string }
}
async function call(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown, user: typeof admin | null = admin) {
  return app.inject({ method, url: '/api/v1' + path,
    headers: { ...(user ? { cookie: user.cookie, 'x-csrf-token': user.csrf } : {}), ...(method !== 'GET' ? { origin: config.APP_ORIGIN } : {}) },
    ...(body !== undefined ? { payload: JSON.stringify(body), headers: { ...(user ? { cookie: user.cookie, 'x-csrf-token': user.csrf } : {}), origin: config.APP_ORIGIN, 'content-type': 'application/json' } } : {}),
  })
}
const unwrap = <T>(response: LightMyRequestResponse, status = 200): T => { expect(response.statusCode, response.body).toBe(status); return response.json().data as T }
async function methodAndDraft() {
  const method = unwrap<Methodology>(await call('POST', '/admin/methodologies', { slug: prefix + '-' + (++serial) }), 201)
  const version = unwrap<Version>(await call('POST', '/admin/methodologies/' + method.id + '/versions', { versionLabel: 'v1' }), 201)
  return { method, version }
}
async function complete() {
  const result = await methodAndDraft()
  const editor = demoEditor(termIds, privateMarker)
  editor.sources[0]!.permissionEvidence = evidenceMarker + ': declaração da origem original da própria fixture.'
  const version = unwrap<Version>(await call('PATCH', '/admin/versions/' + result.version.id, { ...editor, expectedRevision: result.version.revision }))
  return { ...result, version }
}
const publish = (version: Version) => call('POST', '/admin/versions/' + version.id + '/publish', { expectedRevision: version.revision, reviewAcknowledged: true, reviewNote: 'Revisão explícita da fixture original DEMO; sem validação de método laboratorial.' })
beforeAll(async () => {
  await resetTestDatabase(pool, config)
  await migrateTestDatabase(config)
  const email = prefix + '-admin@example.test'
  await provisionInitialAdmin(pool, config.DB_NAME, { displayName: 'Admin DEMO de teste', email, password }, 'Operador sintético DEMO de testes')
  app = buildApp(config, { identity: createIdentityRepository(pool), catalog: createCatalogRepository(pool), checkDatabase: async () => {} })
  admin = credentials(await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin: config.APP_ORIGIN }, payload: { email, password } }))
  const customerEmail = prefix + '-customer@example.test'
  await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: { origin: config.APP_ORIGIN }, payload: { displayName: 'Cliente DEMO', email: customerEmail, password } })
  customer = credentials(await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin: config.APP_ORIGIN }, payload: { email: customerEmail, password } }))
  for (const facet of facets) {
    termIds[facet] = []
    for (const suffix of ['a', 'b']) {
      const response = await call('POST', '/admin/taxonomies/' + facet, {
        code: prefix + '-' + facet + '-' + suffix, label: labels(facet) + ' DEMO ' + suffix,
        ...(facet === 'standards' ? { issuer: 'Emissor sintético DEMO', identifier: prefix + '-' + suffix, editionLabel: 'DEMO-1', verifiedStatus: 'VERIFIED' } : {}),
      })
      termIds[facet].push(unwrap<{ id: string }>(response, 201).id)
    }
  }
}, 30000)
function labels(type: Facet) { return type }
afterAll(async () => {
  await app?.close()
  await resetTestDatabase(pool, config)
  await migrateTestDatabase(config)
  await pool.end()
})

describe('catálogo editorial em MySQL real', () => {
  it('taxonomias exigem sessão e retornam sete coleções, sem procedimento', async () => {
    expect((await call('GET', '/taxonomies', undefined, null)).statusCode).toBe(401)
    const response = await call('GET', '/taxonomies', undefined, customer)
    const data = unwrap<Record<Facet, unknown[]>>(response)
    expect(Object.keys(data).sort()).toEqual([...facets].sort())
    for (const facet of facets) expect(data[facet]).toHaveLength(2)
    expect(response.body).not.toContain(privateMarker)
  })
  it.each(['GET', 'POST', 'PATCH', 'DELETE'] as const)('CUSTOMER não executa %s administrativo mesmo com CSRF válido', async verb => {
    const target = verb === 'GET' || verb === 'POST' ? '/admin/methodologies' : '/admin/methodologies/1'
    expect((await call(verb, target, verb === 'GET' ? undefined : {}, customer)).statusCode).toBe(403)
    expect((await call(verb, target, verb === 'GET' ? undefined : {}, null)).statusCode).toBe(401)
  })
  it('cria, consulta, edita e exclui logicamente identidade sem publicação', async () => {
    const { method, version } = await methodAndDraft()
    const updated = unwrap<Methodology>(await call('PATCH', '/admin/methodologies/' + method.id, { expectedRevision: method.revision, slug: method.slug + '-edited' }))
    expect(updated.revision).toBe(method.revision + 1)
    expect(unwrap<Methodology>(await call('GET', '/admin/methodologies/' + method.id)).slug).toBe(updated.slug)
    expect((await call('DELETE', '/admin/methodologies/' + method.id, { expectedRevision: updated.revision })).statusCode).toBe(204)
    expect((await call('GET', '/admin/methodologies/' + method.id)).statusCode).toBe(404)
    expect((await call('GET', '/admin/versions/' + version.id)).statusCode).toBe(404)
    expect((await rows('SELECT deleted_at FROM methodologies WHERE id = ?', [method.id]))[0]?.deleted_at).toBeTruthy()
    expect((await call('POST', '/admin/methodologies', { slug: updated.slug })).statusCode).toBe(409)
  })
  it('lista com paginação estável, sem conteúdo protegido', async () => {
    await complete()
    const response = await call('GET', '/admin/methodologies?page=1&pageSize=1')
    expect(response.statusCode, response.body).toBe(200)
    expect(response.json().data).toHaveLength(1)
    expect(response.json()).toMatchObject({ page: 1, pageSize: 1 })
    expect(response.body).not.toContain(privateMarker)
    expect((await call('GET', '/admin/methodologies?pageSize=101')).statusCode).toBe(400)
  })
  it('salva duas relações em cada faceta por versão e mantém FKs e índices', async () => {
    const { version } = await complete()
    for (const facet of facets) {
      expect(version.classifications[facet]).toEqual(termIds[facet])
      expect(await rows('SELECT version_id FROM version_' + facet + ' WHERE version_id = ?', [version.id])).toHaveLength(2)
    }
    await expect(pool.execute('INSERT INTO version_techniques (version_id, technique_id) VALUES (?, ?)', [version.id, '18446744073709551615'])).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' })
    await expect(pool.execute('INSERT INTO version_techniques (version_id, technique_id) VALUES (?, ?)', [version.id, termIds.techniques[0]! ])).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' })
    const indexes = await rows("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'version_analytes' AND COLUMN_NAME = 'analyte_id' AND SEQ_IN_INDEX = 1")
    expect(indexes.length).toBeGreaterThan(0)
  })
  it('referência inválida reverte edição e não deixa vínculos parciais', async () => {
    const { version } = await complete()
    const data = demoEditor(termIds); data.classifications.segments = ['18446744073709551615']
    const response = await call('PATCH', '/admin/versions/' + version.id, { ...data, expectedRevision: version.revision })
    expect(response.statusCode).toBe(400)
    const unchanged = unwrap<Version>(await call('GET', '/admin/versions/' + version.id))
    expect(unchanged.revision).toBe(version.revision)
    expect(unchanged.fullProcedure).toBe(version.fullProcedure)
    expect(unchanged.classifications).toEqual(version.classifications)
  })
  it('duas edições concorrentes produzem um sucesso e um conflito', async () => {
    const { version } = await complete()
    const responses = await Promise.all(['DEMO A', 'DEMO B'].map(title => call('PATCH', '/admin/versions/' + version.id, { ...demoEditor(termIds), title, expectedRevision: version.revision })))
    expect(responses.map(response => response.statusCode).sort()).toEqual([200, 409])
    expect(unwrap<Version>(await call('GET', '/admin/versions/' + version.id)).revision).toBe(version.revision + 1)
  })
  it('não publica rascunho incompleto nem aceita revisor/estado forjado', async () => {
    const { version } = await methodAndDraft()
    expect((await publish(version)).statusCode).toBe(409)
    expect((await call('POST', '/admin/versions/' + version.id + '/publish', { expectedRevision: 1, reviewAcknowledged: false, reviewNote: 'DEMO' })).statusCode).toBe(400)
    expect((await call('PATCH', '/admin/versions/' + version.id, { ...demoEditor(termIds), expectedRevision: 1, reviewedBy: customer.id })).statusCode).toBe(400)
    expect(await rows('SELECT id FROM version_reviews WHERE version_id = ?', [version.id])).toHaveLength(0)
  })
  it('condição pendente e ausência de autoria/curadoria bloqueiam publicação', async () => {
    const { version } = await complete()
    const pending = demoEditor(termIds); pending.sources[0]!.permissionStatus = 'PENDING'; pending.sources[0]!.permissionAcknowledged = false
    const saved = unwrap<Version>(await call('PATCH', '/admin/versions/' + version.id, { ...pending, expectedRevision: version.revision }))
    expect((await publish(saved)).statusCode).toBe(409)
    const noCurator = demoEditor(termIds); noCurator.contributors = noCurator.contributors.filter(item => item.role !== 'CURATOR')
    const next = unwrap<Version>(await call('PATCH', '/admin/versions/' + version.id, { ...noCurator, expectedRevision: saved.revision }))
    expect((await publish(next)).statusCode).toBe(409)
  })
  it('norma não verificada e termo inativo não podem publicar', async () => {
    const { version } = await complete()
    const terms = unwrap<Record<Facet, { id: string; code: string; label: string; active: boolean; revision: number; issuer: string; identifier: string; editionLabel: string; verifiedStatus: string }[]>>(await call('GET', '/admin/taxonomies'))
    const norm = terms.standards[0]!
    const updated = unwrap<{ revision: number }>(await call('PATCH', '/admin/taxonomies/standards/' + norm.id, { ...norm, id: undefined, expectedRevision: norm.revision, revision: undefined, verifiedStatus: 'PENDING' }))
    expect((await publish(version)).statusCode).toBe(409)
    const pending = unwrap<{ revision: number }>(await call('PATCH', '/admin/taxonomies/standards/' + norm.id, { code: norm.code, label: norm.label, issuer: norm.issuer, identifier: norm.identifier, editionLabel: norm.editionLabel, verifiedStatus: 'VERIFIED', active: false, expectedRevision: updated.revision }))
    expect((await publish(version)).statusCode).toBe(409)
    await call('PATCH', '/admin/taxonomies/standards/' + norm.id, { code: norm.code, label: norm.label, issuer: norm.issuer, identifier: norm.identifier, editionLabel: norm.editionLabel, verifiedStatus: 'VERIFIED', active: true, expectedRevision: pending.revision })
  })
  it('publicação registra revisor real, revisão exata e auditoria segura', async () => {
    const { method, version } = await complete()
    const published = unwrap<Version>(await publish(version))
    expect(published.editorialStatus).toBe('PUBLISHED')
    expect(published.reviewedBy).toBe(admin.id)
    expect(published.reviewedRevision).toBe(version.revision)
    const [record] = await rows('SELECT reviewed_by, reviewed_revision FROM version_reviews WHERE version_id = ?', [version.id])
    expect(String(record?.reviewed_by)).toBe(admin.id)
    expect(Number(record?.reviewed_revision)).toBe(version.revision)
    const events = await rows('SELECT action, request_id, target_id FROM audit_events WHERE target_id = ?', [version.id])
    expect(events.some(event => event.action === 'VERSION_PUBLISHED')).toBe(true)
    expect(JSON.stringify(events)).not.toContain(privateMarker)
    expect((await call('GET', '/methodologies/' + method.id, undefined, customer)).statusCode).toBe(200)
  })
  it('prévia não expõe procedimento, descrição integral, evidência ou nota da revisão', async () => {
    const { method, version } = await complete(); await publish(version)
    const response = await call('GET', '/methodologies/' + method.id, undefined, customer)
    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain(privateMarker)
    expect(response.body).not.toContain(evidenceMarker)
    expect(response.body).not.toMatch(/fullProcedure|fullDescription|permissionEvidence|reviewNote/)
    expect(response.json().data.references).toHaveLength(1)
    expect((await call('GET', '/admin/versions/' + version.id, undefined, customer)).statusCode).toBe(403)
    expect((await call('GET', '/methodologies/' + method.id + '?include=procedure', undefined, customer)).statusCode).toBe(400)
    const list = await call('GET', '/methodologies')
    expect(list.statusCode, list.body).toBe(200)
    expect(list.body).not.toContain(privateMarker)
    expect(list.body).not.toContain(evidenceMarker)
    expect(list.body).not.toMatch(/fullProcedure|fullDescription|permissionEvidence|reviewNote/)
    expect((await call('GET', '/methodologies', undefined, null)).statusCode).toBe(401)
  })
  it('publicada é imutável e nova versão não herda confirmação de direitos de fonte', async () => {
    const { method, version } = await complete(); const published = unwrap<Version>(await publish(version))
    expect((await call('PATCH', '/admin/versions/' + version.id, { ...demoEditor(termIds), expectedRevision: published.revision })).statusCode).toBe(409)
    expect((await call('DELETE', '/admin/versions/' + version.id, { expectedRevision: published.revision })).statusCode).toBe(409)
    const cloned = unwrap<Version>(await call('POST', '/admin/methodologies/' + method.id + '/versions', { versionLabel: 'v2', basedOnVersionId: version.id }), 201)
    expect(cloned.fullProcedure).toBe(published.fullProcedure)
    expect(cloned.sources[0]?.permissionStatus).toBe('PENDING')
    expect(cloned.sources[0]?.permissionEvidence).toBe('')
    expect((await publish(cloned)).statusCode).toBe(409)
    const next = unwrap<Version>(await call('PATCH', '/admin/versions/' + cloned.id, { ...demoEditor(termIds, 'DEMO V2 procedure'), expectedRevision: cloned.revision }))
    await publish(next)
    const original = unwrap<Version>(await call('GET', '/admin/versions/' + version.id))
    expect(original.editorialStatus).toBe('SUPERSEDED')
    expect(original.fullProcedure).toBe(published.fullProcedure)
    expect(original.reviewedRevision).toBe(published.reviewedRevision)
    expect(unwrap<Methodology>(await call('GET', '/admin/methodologies/' + method.id)).currentPublishedVersionId).toBe(next.id)
  })
  it('ponteiro corrente e versão de origem devem pertencer à mesma metodologia', async () => {
    const first = await complete(), second = await methodAndDraft()
    expect((await call('POST', '/admin/methodologies/' + second.method.id + '/versions', { versionLabel: 'bad', basedOnVersionId: first.version.id })).statusCode).toBe(400)
    await expect(pool.execute('UPDATE methodologies SET current_published_version_id = ? WHERE id = ?', [first.version.id, second.method.id])).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' })
  })
  it('arquivamento preserva histórico e impede publicação/prévia; exclusão só para rascunho', async () => {
    const { method, version } = await complete(); await publish(version)
    const current = unwrap<Methodology>(await call('GET', '/admin/methodologies/' + method.id))
    expect((await call('DELETE', '/admin/methodologies/' + method.id, { expectedRevision: current.revision })).statusCode).toBe(409)
    const retired = unwrap<Methodology>(await call('PATCH', '/admin/methodologies/' + method.id, { expectedRevision: current.revision, retired: true }))
    expect((await call('GET', '/methodologies/' + method.id, undefined, customer)).statusCode).toBe(404)
    expect((await call('GET', '/admin/versions/' + version.id)).statusCode).toBe(200)
    await call('PATCH', '/admin/methodologies/' + method.id, { expectedRevision: retired.revision, retired: false })
    expect((await call('GET', '/methodologies/' + method.id, undefined, customer)).statusCode).toBe(200)
    const draft = unwrap<Version>(await call('POST', '/admin/methodologies/' + method.id + '/versions', { versionLabel: 'discarded' }), 201)
    expect((await call('DELETE', '/admin/versions/' + draft.id, { expectedRevision: draft.revision })).statusCode).toBe(204)
    expect((await call('GET', '/admin/versions/' + draft.id)).statusCode).toBe(404)
  })
  it('termo vinculado mantém identidade, mas pode ser desativado sem apagar associações', async () => {
    const { version } = await complete()
    const terms = unwrap<Record<Facet, { id: string; code: string; label: string; revision: number }[]>>(await call('GET', '/admin/taxonomies'))
    const term = terms.techniques[0]!
    expect((await call('PATCH', '/admin/taxonomies/techniques/' + term.id, { code: term.code, label: 'Outro significado', expectedRevision: term.revision })).statusCode).toBe(409)
    const inactive = unwrap<{ revision: number }>(await call('PATCH', '/admin/taxonomies/techniques/' + term.id, { code: term.code, label: term.label, active: false, expectedRevision: term.revision }))
    expect(unwrap<Record<Facet, { id: string }[]>>(await call('GET', '/taxonomies', undefined, customer)).techniques.some(item => item.id === term.id)).toBe(false)
    expect(await rows('SELECT version_id FROM version_techniques WHERE version_id = ? AND technique_id = ?', [version.id, term.id])).toHaveLength(1)
    await call('PATCH', '/admin/taxonomies/techniques/' + term.id, { code: term.code, label: term.label, active: true, expectedRevision: inactive.revision })
  })

  it('edições simultâneas de metodologias diferentes preservam fontes e atribuições compartilhadas', async () => {
    const first = await methodAndDraft(), second = await methodAndDraft()
    const reference = 'Origem original DEMO compartilhada ' + randomUUID()
    const data = demoEditor(termIds)
    data.sources[0]!.referenceText = reference
    data.contributors = data.contributors.map(item => ({ ...item, displayName: item.displayName + ' ' + serial }))
    // Segundo ADMIN somente na fixture isolada; a API nunca permite essa promoção.
    await pool.execute("UPDATE users SET role = 'ADMIN' WHERE id = ?", [customer.id])
    let responses: LightMyRequestResponse[]
    try {
      responses = await Promise.all([call('PATCH', '/admin/versions/' + first.version.id, { ...data, expectedRevision: first.version.revision }), call('PATCH', '/admin/versions/' + second.version.id, { ...data, expectedRevision: second.version.revision }, customer)])
    } finally { await pool.execute("UPDATE users SET role = 'CUSTOMER' WHERE id = ?", [customer.id]) }
    expect(responses.some(response => response.statusCode === 200)).toBe(true)
    for (const [index, initialResponse] of responses.entries()) {
      const original = [first, second][index]!.version
      let response = initialResponse
      if (response.statusCode === 409) {
        expect(response.json().error.code).toBe('EDIT_CONFLICT')
        const unchanged = unwrap<Version>(await call('GET', '/admin/versions/' + original.id))
        expect(unchanged.revision).toBe(original.revision)
        expect(unchanged.title).toBe('')
        expect(unchanged.sources).toEqual([])
        expect(unchanged.contributors).toEqual([])
        for (const facet of facets) expect(unchanged.classifications[facet]).toEqual([])
        expect(await rows('SELECT id FROM audit_events WHERE request_id = ? AND action = ?', [response.json().error.requestId, 'DRAFT_SAVED'])).toHaveLength(0)
        // InnoDB pode escolher uma vítima de deadlock; nova requisição é segura
        // porque a revisão e todos os vínculos anteriores foram preservados.
        response = await call('PATCH', '/admin/versions/' + original.id, { ...data, expectedRevision: original.revision })
      }
      const saved = unwrap<Version>(response)
      expect(saved.sources).toHaveLength(1)
      expect(saved.sources[0]?.referenceText).toBe(reference)
      expect(saved.contributors).toHaveLength(2)
      const loaded = unwrap<Version>(await call('GET', '/admin/versions/' + saved.id))
      expect(loaded.sources).toEqual(saved.sources)
      expect(loaded.contributors).toEqual(saved.contributors)
    }
    expect(await rows('SELECT id FROM sources WHERE reference_text = ?', [reference])).toHaveLength(1)
  })
  it('CSRF/origem são exigidos e revogação de papel é efetiva', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/admin/methodologies', headers: { cookie: admin.cookie, origin: config.APP_ORIGIN }, payload: { slug: 'must-not-exist' } })
    expect(response.statusCode).toBe(403)
    await pool.execute("UPDATE users SET role = 'CUSTOMER' WHERE id = ?", [admin.id])
    try { expect((await call('GET', '/admin/taxonomies')).statusCode).toBe(403); expect((await call('POST', '/admin/methodologies', { slug: 'must-not-exist' })).statusCode).toBe(403) }
    finally { await pool.execute("UPDATE users SET role = 'ADMIN' WHERE id = ?", [admin.id]) }
    expect(await rows('SELECT id FROM methodologies WHERE slug = ?', ['must-not-exist'])).toHaveLength(0)
  })
})

describe('pesquisa autenticada de prévias no MySQL', () => {
  const token = 'busca' + randomUUID().replaceAll('-', '')
  const hidden = 'restrito' + randomUUID().replaceAll('-', '')
  const bibliography = 'referencia' + randomUUID().replaceAll('-', '')
  const publicOnly = 'publico' + randomUUID().replaceAll('-', '')
  const summaryOnly = 'resumo' + randomUUID().replaceAll('-', '')
  const oldOnly = 'antiga' + randomUUID().replaceAll('-', '')
  let a: Methodology, b: Methodology, c: Methodology
  let current: Version, old: Version, suspended: Version, withdrawn: Methodology
  const fields = (position: 'a' | 'b' | 'c') => {
    const selected = Object.fromEntries(facets.map(facet => [facet, position === 'b' ? [termIds[facet][1]!] : [termIds[facet][0]!]])) as Record<Facet, string[]>
    if (position === 'a') { selected.analytes = termIds.analytes; selected.matrices = termIds.matrices }
    if (position === 'c') { selected.analytes = [termIds.analytes[1]!]; selected.matrices = [termIds.matrices[1]!] }
    const editor = demoEditor(selected, hidden)
    editor.title = 'DEMO ' + token + (position === 'c' ? ' Zinco' : ' Água')
    editor.freeSummary = position === 'a' ? summaryOnly + ' Fe²⁺ Na+ 10%_! literal \\ original DEMO.' : 'Resumo DEMO Fe²⁺ sem instruções.'
    editor.publicDescription = position === 'a' ? publicOnly + ' ácido cloreto — somente descrição gratuita DEMO.' : 'Descrição gratuita DEMO.'
    editor.sources[0]!.referenceText = position === 'a' ? bibliography + ' — texto original DEMO da suíte.' : 'Origem original DEMO ' + position
    editor.sources[0]!.permissionEvidence = hidden
    return editor
  }
  async function saveAndPublish(version: Version, data: ReturnType<typeof demoEditor>) {
    const saved = unwrap<Version>(await call('PATCH', '/admin/versions/' + version.id, { ...data, expectedRevision: version.revision }))
    return unwrap<Version>(await publish(saved))
  }
  const find = (params = new URLSearchParams({ q: token }), user: typeof admin | null = customer) => call('GET', '/methodologies?' + params.toString(), undefined, user)
  const ids = (response: LightMyRequestResponse) => { expect(response.statusCode, response.body).toBe(200); return response.json().data.map((item: { id: string }) => item.id) as string[] }
  beforeAll(async () => {
    const first = await methodAndDraft(); a = first.method
    old = await saveAndPublish(first.version, { ...fields('b'), title: 'DEMO ' + token + ' ' + oldOnly })
    const second = await methodAndDraft(); b = second.method; await saveAndPublish(second.version, fields('b'))
    const third = await methodAndDraft(); c = third.method; await saveAndPublish(third.version, fields('c'))
    const next = unwrap<Version>(await call('POST', '/admin/methodologies/' + a.id + '/versions', { versionLabel: 'v2' }), 201)
    current = await saveAndPublish(next, fields('a'))
    const draft = await methodAndDraft()
    await call('PATCH', '/admin/versions/' + draft.version.id, { ...fields('a'), expectedRevision: draft.version.revision })
    const suspendedMethod = await methodAndDraft(); suspended = await saveAndPublish(suspendedMethod.version, fields('a'))
    await pool.execute("UPDATE methodology_versions SET access_state = 'SUSPENDED' WHERE id = ?", [suspended.id])
    const retired = await methodAndDraft(); await saveAndPublish(retired.version, fields('a'))
    withdrawn = unwrap<Methodology>(await call('GET', '/admin/methodologies/' + retired.method.id))
    await call('PATCH', '/admin/methodologies/' + withdrawn.id, { retired: true, expectedRevision: withdrawn.revision })
    const deleted = await methodAndDraft()
    await call('PATCH', '/admin/versions/' + deleted.version.id, { ...fields('a'), expectedRevision: deleted.version.revision })
    await call('DELETE', '/admin/methodologies/' + deleted.method.id, { expectedRevision: deleted.method.revision })
  }, 30000)
  const keys = { techniques: 'techniqueIds', technologies: 'technologyIds', equipment: 'equipmentIds', matrices: 'matrixIds', analytes: 'analyteIds', standards: 'standardIds', segments: 'segmentIds' }
  it.each(facets)('filtra %s individualmente na versão corrente', async facet => {
    const query = new URLSearchParams({ q: token, [keys[facet]]: termIds[facet][0]! })
    expect(ids(await find(query))).toEqual(facet === 'matrices' || facet === 'analytes' ? [a.id] : [a.id, c.id])
  })
  it('combina OR interno com AND entre sete facetas, sem duplicar múltiplos analitos/matrizes', async () => {
    const query = new URLSearchParams({ q: token })
    for (const facet of ['analytes', 'matrices'] as const) for (const id of termIds[facet]) query.append(keys[facet], id)
    const all = await find(query)
    expect(ids(all)).toEqual([a.id, b.id, c.id]); expect(all.json().total).toBe(3)
    query.delete('analyteIds'); query.append('analyteIds', termIds.analytes[0]!)
    expect(ids(await find(query))).toEqual([a.id])
    const seven = new URLSearchParams({ q: token })
    for (const facet of facets) seven.append(keys[facet], termIds[facet][0]!)
    expect(ids(await find(seven))).toEqual([a.id])
  })
  it.each(['agua', 'ÁGUA', 'a\u0301gua'])('encontra títulos com acentos e caixa: %s', async word => {
    expect(ids(await find(new URLSearchParams({ q: token + ' ' + word })))).toEqual([a.id, b.id])
  })
  it.each(['Na+', '10%_!', '%', '_', '!', '\\'])('trata símbolo ou caractere especial como literal: %s', async word => {
    expect(ids(await find(new URLSearchParams({ q: token + ' ' + word })))).toEqual([a.id])
  })
  it('palavras podem ocorrer em campos gratuitos diferentes, inclusive referências e termos curtos', async () => {
    for (const term of [summaryOnly, publicOnly, bibliography, 'cloreto', 'ácido']) expect(ids(await find(new URLSearchParams({ q: token + ' ' + term })))).toEqual([a.id])
    expect(ids(await find(new URLSearchParams({ q: token + ' Fe²⁺' })))).toEqual([a.id, b.id, c.id])
    expect(ids(await find(new URLSearchParams({ q: token + ' ' + prefix + '-techniques-a' })))).toEqual([a.id, c.id])
  })
  it('retorna zero para inexistente, SQL literal, conteúdo privado e versão substituída', async () => {
    for (const q of [token + ' impossível', "' OR 1=1 --", hidden, oldOnly]) {
      const response = await find(new URLSearchParams({ q }))
      expect(ids(response)).toEqual([]); expect(response.json().total).toBe(0)
    }
  })
  it('pagina sem repetição e desempata títulos por identidade; publicação recente tem ordem estável', async () => {
    const collected: string[] = []
    for (let page = 1; page <= 4; page++) {
      const response = await find(new URLSearchParams({ q: token, page: String(page), pageSize: '1' }))
      collected.push(...ids(response)); expect(response.json()).toMatchObject({ total: 3, page, pageSize: 1 })
    }
    expect(collected).toEqual([a.id, b.id, c.id])
    expect(ids(await find(new URLSearchParams({ q: token, sort: 'updated_desc' })))).toEqual([a.id, c.id, b.id])
  })
  it('vazio lista catálogo autorizado; exclui rascunhos, suspensas, arquivadas e excluídas', async () => {
    expect(ids(await find())).toEqual([a.id, b.id, c.id])
    const response = await find(new URLSearchParams({ pageSize: '100' }))
    expect(ids(response)).toEqual(expect.arrayContaining([a.id, b.id, c.id]))
    expect(ids(response)).not.toContain(withdrawn.id)
    expect(response.body).not.toContain('"versionId":"' + suspended.id + '"')
    expect(response.body).not.toContain('"versionId":"' + old.id + '"')
  })
  it('rejeita filtros desconhecidos/inativos e parâmetros comerciais ou duplicados', async () => {
    for (const query of ['techniqueIds=18446744073709551615', 'analyteIds=1,2', 'q=a&q=b', 'sort=price_asc', 'page=0', 'pageSize=101', 'productIds=1']) expect((await call('GET', '/methodologies?' + query, undefined, customer)).statusCode).toBe(400)
    const termId = termIds.equipment[0]!
    await pool.execute('UPDATE equipment SET active = FALSE WHERE id = ?', [termId])
    try { expect((await find(new URLSearchParams({ equipmentIds: termId }))).statusCode).toBe(400) }
    finally { await pool.execute('UPDATE equipment SET active = TRUE WHERE id = ?', [termId]) }
  })
  it('exige sessão e não expõe nem usa campos privados para correspondência', async () => {
    expect((await find(undefined, null)).statusCode).toBe(401)
    for (const response of [await find(), await call('GET', '/methodologies/' + a.id, undefined, customer)]) {
      expect(response.statusCode).toBe(200)
      expect(response.body).not.toContain(hidden)
      expect(response.body).not.toMatch(/fullProcedure|fullDescription|permissionEvidence|reviewNote|owned/)
    }
  })
  it('total, página e metadados usam um snapshot mesmo com publicação concorrente', async () => {
    const snapshotToken = 'snapshot' + randomUUID().replaceAll('-', '')
    const first = await methodAndDraft(), second = await methodAndDraft()
    const editor = { ...fields('a'), title: 'DEMO ' + snapshotToken }
    await saveAndPublish(first.version, editor)
    let inserted = false
    // Barreira depois do COUNT, sem substituir o driver/banco: a segunda
    // publicação ocorre por API e outra conexão real antes da leitura da página.
    const instrumented = new Proxy(pool, { get(target, property) {
      if (property === 'getConnection') return async () => {
        const connection = await target.getConnection()
        return new Proxy(connection, { get(db, key) {
          if (key === 'execute') return async (sql: string, values: string[]) => {
            const response = await db.execute(sql, values)
            if (sql.startsWith('SELECT COUNT(*) AS total FROM methodologies') && !inserted) {
              inserted = true
              await saveAndPublish(second.version, editor)
            }
            return response
          }
          const value: unknown = Reflect.get(db, key)
          return typeof value === 'function' ? value.bind(db) : value
        } })
      }
      const value: unknown = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    } })
    const result = await createCatalogRepository(instrumented).search(searchQuery.parse({ q: snapshotToken }))
    expect(inserted).toBe(true)
    expect(result.total).toBe(1)
    expect(result.data.map(item => item.id)).toEqual([first.method.id])
    const after = await find(new URLSearchParams({ q: snapshotToken }))
    expect(ids(after)).toEqual([first.method.id, second.method.id])
    expect(after.json().total).toBe(2)
  })
  it('prévia e pesquisa usam o mesmo bloqueio de suspensão, exclusão e condição de fonte', async () => {
    const cases = [
      { sql: "UPDATE methodology_versions SET access_state = ? WHERE id = ?", blocked: 'SUSPENDED', restored: 'ALLOWED', id: current.id },
      { sql: 'UPDATE methodology_versions SET deleted_at = ? WHERE id = ?', blocked: '2026-01-01 00:00:00', restored: null, id: current.id },
      { sql: 'UPDATE methodologies SET deleted_at = ? WHERE id = ?', blocked: '2026-01-01 00:00:00', restored: null, id: a.id },
      { sql: 'UPDATE version_sources SET permission_status = ? WHERE version_id = ?', blocked: 'PENDING', restored: 'APPROVED', id: current.id },
    ]
    for (const item of cases) {
      await pool.execute(item.sql, [item.blocked, item.id])
      try {
        expect(ids(await find())).not.toContain(a.id)
        expect((await call('GET', '/methodologies/' + a.id, undefined, customer)).statusCode).toBe(404)
      } finally { await pool.execute(item.sql, [item.restored, item.id]) }
    }
  })
})
