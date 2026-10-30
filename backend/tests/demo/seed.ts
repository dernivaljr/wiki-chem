import { randomBytes, randomUUID } from 'node:crypto'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import type { Config } from '../../src/config/env.js'
import { buildApp } from '../../src/app.js'
import { createIdentityRepository } from '../../src/modules/identity/identity.repository.js'
import { provisionInitialAdmin } from '../../src/modules/identity/admin-bootstrap.js'
import { createCatalogRepository } from '../../src/modules/catalog/catalog.repository.js'
import { facets } from '../../src/modules/catalog/catalog.contracts.js'
import type { Facet } from '../../src/modules/catalog/catalog.contracts.js'
import { createCommerceRepository } from '../../src/modules/commerce/commerce.repository.js'
import { academicEditor, assertDemo, demoNotice, vocabulary } from './examples.js'
export interface DemoCatalog { notice: string; ids: Record<Facet, string[]>; methods: { id: string; versionId: string; slug: string; title: string; productId: string }[] }
export const demoOperator = 'DEMO_TEST_AUTOMATION_ONLY'
export async function seedAcademic(config: Config, pool: Pool, env = process.env): Promise<DemoCatalog> {
  assertDemo(env)
  if (config.NODE_ENV !== 'test' || config.DB_NAME !== env.DB_NAME) throw new Error('DEMO_DATABASE_MISMATCH')
  const [database] = await pool.execute<RowDataPacket[]>('SELECT DATABASE() AS name')
  if (database[0]?.name !== config.DB_NAME) throw new Error('DEMO_DATABASE_MISMATCH')
  const [done] = await pool.execute<RowDataPacket[]>("SELECT id FROM audit_events WHERE action = 'ACADEMIC_DEMO_PREPARED' LIMIT 1")
  const [existing] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS count FROM users')
  if (done.length) {
    const ids = {} as Record<Facet, string[]>
    for (const facet of facets) { const [terms] = await pool.execute<RowDataPacket[]>('SELECT id FROM ' + facet + " WHERE code LIKE 'academic-demo-%' ORDER BY id"); ids[facet] = terms.map(row => String(row.id)) }
    const [methods] = await pool.execute<RowDataPacket[]>("SELECT m.id, m.slug, v.id AS version_id, v.title, p.id AS product_id FROM methodologies m JOIN methodology_versions v ON v.id=m.current_published_version_id JOIN products p ON p.methodology_id=m.id WHERE m.slug LIKE 'academic-demo-%' ORDER BY m.id")
    return { notice: demoNotice, ids, methods: methods.map(row => ({ id: String(row.id), slug: row.slug, title: row.title, versionId: String(row.version_id), productId: String(row.product_id) })) }
  }
  if (Number(existing[0]?.count)) throw new Error('DEMO_REQUIRES_EMPTY_DATABASE_OR_COMPLETED_SEED')
  const email = 'demo-automation-' + randomUUID() + '@example.invalid', password = randomBytes(32).toString('base64url')
  const admin = await provisionInitialAdmin(pool, config.DB_NAME, { displayName: 'Automação demonstrativa — não pessoa', email, password }, demoOperator)
  const app = buildApp({ ...config, LOG_LEVEL: 'silent' }, { identity: createIdentityRepository(pool), catalog: createCatalogRepository(pool), commerce: createCommerceRepository(pool), checkDatabase: async () => {} })
  try {
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin: config.APP_ORIGIN }, payload: { email, password } })
    if (login.statusCode !== 200) throw new Error('DEMO_LOGIN_FAILED')
    const cookies = login.headers['set-cookie'], cookie = (Array.isArray(cookies) ? cookies[0] : cookies)?.split(';')[0]
    if (!cookie) throw new Error('DEMO_LOGIN_FAILED')
    const headers = { origin: config.APP_ORIGIN, cookie, 'x-csrf-token': login.json().data.csrfToken as string }
    async function call(method: 'POST' | 'PATCH', path: string, payload: object, status = 200) {
      const response = await app.inject({ method, url: '/api/v1' + path, headers, payload })
      if (response.statusCode !== status) throw new Error('DEMO_CONTRACT_FAILED_' + response.json().error?.code)
      return response.json().data
    }
    const result: DemoCatalog = { notice: demoNotice, ids: {} as Record<Facet, string[]>, methods: [] }
    for (const facet of facets) {
      result.ids[facet] = []
      for (const [index, label] of vocabulary[facet].entries()) {
        const term = await call('POST', '/admin/taxonomies/' + facet, { code: 'academic-demo-' + facet + '-' + index, label: 'DEMO — ' + label,
          ...(facet === 'standards' ? { issuer: 'Vocabulário de teste do software Wiki-Chem — sem entidade normativa', identifier: 'DEMO-SOFTWARE-' + index, editionLabel: 'Fixture-1', verifiedStatus: 'VERIFIED' } : {}) }, 201)
        result.ids[facet].push(term.id)
      }
    }
    for (let index = 0; index < 5; index++) {
      const slug = 'academic-demo-' + (index + 1), m = await call('POST', '/admin/methodologies', { slug }, 201), v = await call('POST', '/admin/methodologies/' + m.id + '/versions', { versionLabel: 'v1' }, 201)
      const editor = academicEditor(index, result.ids), saved = await call('PATCH', '/admin/versions/' + v.id, { ...editor, expectedRevision: v.revision })
      await call('POST', '/admin/versions/' + v.id + '/publish', { expectedRevision: saved.revision, reviewAcknowledged: true, reviewNote: 'Conferência automatizada de fixture original de software. Não representa revisão humana, validade científica, licença externa ou autorização comercial. ' + demoNotice })
      let p = await call('POST', '/admin/products', { methodologyId: m.id }, 201)
      p = await call('POST', '/admin/products/' + p.id + '/prices', { expectedRevision: p.revision, amountCentavos: ['1000','1750','2500','3250','3500'][index], currency: 'BRL' }, 201)
      p = await call('PATCH', '/admin/products/' + p.id, { expectedRevision: p.revision, active: true })
      result.methods.push({ id: m.id, versionId: v.id, slug, title: editor.title, productId: p.id })
    }
    await pool.execute("INSERT INTO audit_events (actor_user_id, action, target_type, target_id, request_id, occurred_at) VALUES (?, 'ACADEMIC_DEMO_PREPARED', 'demo', 'isolated-test', ?, UTC_TIMESTAMP(6))", [admin.id, randomUUID()])
    await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers, payload: {} })
    return result
  } finally { await app.close() }
}
