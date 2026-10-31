import { randomUUID } from 'node:crypto'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import type { RowDataPacket } from 'mysql2/promise'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'
import { createIdentityRepository } from '../../src/modules/identity/identity.repository.js'
import { provisionInitialAdmin } from '../../src/modules/identity/admin-bootstrap.js'
import { createCatalogRepository } from '../../src/modules/catalog/catalog.repository.js'
import { createCommerceRepository } from '../../src/modules/commerce/commerce.repository.js'
import { createLibraryRepository } from '../../src/modules/library/library.repository.js'
import type { LibraryContent, LibraryEntry } from '../../src/modules/library/library.contracts.js'
import { createCheckoutRepository } from '../../src/modules/checkout/checkout.repository.js'
import type { OrderDetail } from '../../src/modules/checkout/checkout.contracts.js'
import type { Cart, Product } from '../../src/modules/commerce/commerce.contracts.js'
import type { Methodology, Preview, Version } from '../../src/modules/catalog/catalog.contracts.js'
import { facets } from '../../src/modules/catalog/catalog.contracts.js'
import { demoEditor } from '../catalog-fixtures.js'
import { demoPrices } from '../commerce-fixtures.js'
import { migrateTestDatabase, resetTestDatabase } from '../test-database.js'
const env = loadConfig(process.env)
if (env.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(env.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') throw new Error('Biblioteca exige banco descartável explícito.')
const config = { ...env, LOG_LEVEL: 'silent' as const, AUTH_RATE_LIMIT_MAX: 100, CHECKOUT_RATE_LIMIT_MAX: 1000 }
const pool = createDatabasePool(config)
interface Session { cookie: string; csrf: string; id: string; email: string }
let app: FastifyInstance, admin: Session
let serial = 0
const prefix = 'library-demo-' + randomUUID().slice(0, 8), password = 'Senha original DEMO isolada 123!', privateMarker = 'FULL_LIBRARY_' + randomUUID(), privateProof = 'PRIVATE_PERMISSION_' + randomUUID()
const fx: Product[] = []
const sql = async (query: string, values: (string | number)[] = []) => (await pool.execute<RowDataPacket[]>(query, values))[0]
function data<T>(response: LightMyRequestResponse, status = 200): T { expect(response.statusCode, response.body).toBe(status); return response.json().data as T }
function auth(response: LightMyRequestResponse, email: string): Session {
  data(response)
  const value = response.headers['set-cookie'], cookie = (Array.isArray(value) ? value[0] : value)?.split(';')[0]
  if (!cookie) throw new Error('Cookie ausente')
  return { cookie, csrf: response.json().data.csrfToken, id: response.json().data.user.id, email }
}
async function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, user: Session | null = admin, key?: string) {
  return app.inject({ method, url: '/api/v1' + path, headers: { origin: config.APP_ORIGIN, ...(user ? { cookie: user.cookie, 'x-csrf-token': user.csrf } : {}), ...(key ? { 'idempotency-key': key } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, ...(body !== undefined ? { payload: JSON.stringify(body) } : {}) })
}
async function customer() {
  const email = prefix + '-' + (++serial) + '@example.test'
  expect((await call('POST', '/auth/register', { displayName: 'Cliente de checkout DEMO', email, password }, null)).statusCode).toBe(201)
  return auth(await call('POST', '/auth/login', { email, password }, null), email)
}
function editor(title: string) {
  const value = demoEditor({ techniques: [], technologies: [], equipment: [], matrices: [], analytes: [], standards: [], segments: [] }, privateMarker)
  value.title = title; value.sources[0]!.permissionEvidence = privateProof
  for (const facet of facets) value.notApplicable[facet] = 'Fixture original DEMO de software, sem classificação científica real.'
  return value
}
async function publish(version: Version, title: string) {
  const saved = data<Version>(await call('PATCH', '/admin/versions/' + version.id, { ...editor(title), expectedRevision: version.revision }))
  return data<Version>(await call('POST', '/admin/versions/' + version.id + '/publish', { expectedRevision: saved.revision, reviewAcknowledged: true, reviewNote: 'Revisão explícita de fixture original DEMO; sem conteúdo científico de terceiro.' }))
}
async function product(amount = '1000') {
  const method = data<Methodology>(await call('POST', '/admin/methodologies', { slug: prefix + '-' + (++serial) }), 201)
  const version = data<Version>(await call('POST', '/admin/methodologies/' + method.id + '/versions', { versionLabel: 'v1' }), 201)
  await publish(version, 'DEMO original ' + method.slug)
  let p = data<Product>(await call('POST', '/admin/products', { methodologyId: method.id }), 201)
  p = data<Product>(await call('POST', '/admin/products/' + p.id + '/prices', { expectedRevision: p.revision, amountCentavos: amount, currency: 'BRL' }), 201)
  return data<Product>(await call('PATCH', '/admin/products/' + p.id, { expectedRevision: p.revision, active: true }))
}
const cart = async (user: Session) => data<Cart>(await call('GET', '/cart', undefined, user))
async function add(user: Session, p: Product) {
  const current = data<Preview>(await call('GET', '/methodologies/' + p.methodologyId, undefined, user))
  return call('PUT', '/cart/items/' + p.id, { expectedRevision: (await cart(user)).revision, offerRevision: current.offer!.revision, priceId: current.offer!.priceId, versionId: current.versionId }, user)
}
async function prepare(user: Session, products = [fx[0]!]) {
  for (const p of products) data<Cart>(await add(user, p))
  return cart(user)
}
const create = (user: Session, revision: number, key = randomUUID()) => call('POST', '/checkout/simulations', { cartRevision: revision }, user, key)
const confirm = (user: Session, id: string, key = randomUUID()) => call('POST', '/orders/' + id + '/confirm-simulation', { demoAcknowledged: true, paymentMethod: 'PIX' }, user, key)
const content = (user: Session, p: Product, versionId?: string) => call('GET', '/library/' + p.methodologyId + '/content' + (versionId ? '?versionId=' + versionId : ''), undefined, user)
beforeAll(async () => {
  await resetTestDatabase(pool, config); await migrateTestDatabase(config)
  const email = prefix + '-admin@example.test'
  await provisionInitialAdmin(pool, config.DB_NAME, { displayName: 'ADMIN original DEMO', email, password }, 'Operador da suíte isolada de biblioteca')
  app = buildApp(config, { checkDatabase: async () => {}, identity: createIdentityRepository(pool), catalog: createCatalogRepository(pool), commerce: createCommerceRepository(pool), checkout: createCheckoutRepository(pool), library: createLibraryRepository(pool) })
  admin = auth(await call('POST', '/auth/login', { email, password }, null), email)
  for (const amount of demoPrices().slice(0, 2)) fx.push(await product(amount))
}, 30000)
afterAll(async () => { await app?.close(); await resetTestDatabase(pool, config); await migrateTestDatabase(config); await pool.end() })
async function acquire(user: Session, p = fx[0]!) {
  const before = await prepare(user, [p]), order = data<OrderDetail>(await create(user, before.revision), 201)
  data<OrderDetail>(await confirm(user, order.id))
  return order
}
async function access(versionId: string, accessState: 'ALLOWED' | 'SUSPENDED', reason = 'Justificativa editorial original DEMO de teste.') {
  const current = data<Version>(await call('GET', '/admin/versions/' + versionId))
  return call('PATCH', '/admin/versions/' + versionId + '/access', { expectedRevision: current.revision, accessState, reason })
}
describe('biblioteca autorizada com MySQL real', () => {
  it('pedido pendente não concede acesso e ADMIN não contorna direito de cliente', async () => {
    const user = await customer(), before = await prepare(user)
    data<OrderDetail>(await create(user, before.revision), 201)
    expect((await call('GET', '/library', undefined, user)).json()).toMatchObject({ data: [], total: 0 })
    for (const who of [user, admin]) for (const suffix of ['', '/versions', '/content']) {
      const response = await call('GET', '/library/' + fx[0]!.methodologyId + suffix, undefined, who)
      expect(response.statusCode).toBe(403); expect(response.body).not.toContain(privateMarker)
    }
  })
  it('somente titular concluído recebe conteúdo, sem cache nem evidências privadas', async () => {
    const user = await customer(), other = await customer(), order = await acquire(user), response = await content(user, fx[0]!)
    const full = data<LibraryContent>(response)
    expect(full.fullProcedure).toContain(privateMarker)
    expect(full.selectedVersionId).toBe(order.items[0]!.methodologyVersionId)
    expect(full.references).toHaveLength(1); expect(full.contributors).toHaveLength(2)
    expect(response.headers['cache-control']).toContain('private, no-store'); expect(response.headers.pragma).toBe('no-cache')
    expect(response.body).not.toContain(privateProof)
    expect(response.body).not.toMatch(/permissionEvidence|permission_evidence|password_hash|token_hash|reviewNote/)
    const denied = await content(other, fx[0]!)
    expect(denied.statusCode).toBe(403); expect(denied.headers['cache-control']).toContain('no-store'); expect(denied.body).not.toContain(privateMarker)
    expect((await call('GET', '/library', undefined, other)).json().total).toBe(0)
  })
  it('v1 adquirida, v2 publicada e ambas acessíveis sem alterar snapshots, pedidos ou direitos', async () => {
    const p = await product(), user = await customer(), order = await acquire(user, p)
    const next = data<Version>(await call('POST', '/admin/methodologies/' + p.methodologyId + '/versions', { versionLabel: 'v2' }), 201)
    await publish(next, 'DEMO atualização publicada')
    const current = data<LibraryContent>(await content(user, p)), original = data<LibraryContent>(await content(user, p, order.items[0]!.methodologyVersionId))
    expect(current.versionLabel).toBe('v2'); expect(original.versionLabel).toBe('v1')
    const entry = data<LibraryEntry>(await call('GET', '/library/' + p.methodologyId, undefined, user))
    expect(entry).toMatchObject({ originalVersionId: original.selectedVersionId, originalVersionLabel: 'v1', currentVersionId: current.selectedVersionId, currentVersionLabel: 'v2', originalAmountCentavos: '1000', accessState: 'AVAILABLE' })
    const versions = (await call('GET', '/library/' + p.methodologyId + '/versions', undefined, user)).json()
    expect(versions.total).toBe(2); expect(versions.data[0]).toMatchObject({ id: next.id, current: true, original: false })
    expect((await call('GET', '/orders/' + order.id, undefined, user)).json().data.items).toEqual(order.items)
    expect(await sql('SELECT id FROM orders WHERE user_id = ?', [user.id])).toHaveLength(1)
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [user.id])).toHaveLength(1)
  })
  it('rascunho, versão alheia, inexistente e parâmetros inválidos não liberam procedimento', async () => {
    const user = await customer(), order = await acquire(user)
    const draft = data<Version>(await call('POST', '/admin/methodologies/' + fx[0]!.methodologyId + '/versions', { versionLabel: 'draft-' + (++serial) }), 201)
    const foreign = data<Preview>(await call('GET', '/methodologies/' + fx[1]!.methodologyId, undefined, user))
    for (const id of [draft.id, foreign.versionId, '18446744073709551615']) {
      const response = await content(user, fx[0]!, id); expect(response.statusCode).toBe(404); expect(response.body).not.toContain(privateMarker)
    }
    const versions = (await call('GET', '/library/' + fx[0]!.methodologyId + '/versions', undefined, user)).json().data
    expect(versions.some((v: { id: string }) => v.id === draft.id)).toBe(false)
    for (const query of ['?versionId=0','?versionId=1&versionId=2','?userId=' + user.id,'?versionId=%27%20OR%201%3D1']) expect((await call('GET', '/library/' + fx[0]!.methodologyId + '/content' + query, undefined, user)).statusCode).toBe(400)
    expect((await content(user, fx[0]!, order.items[0]!.methodologyVersionId)).statusCode).toBe(200)
  })
  it('atual suspensa não faz fallback; histórico explícito é permitido e restauração é auditada', async () => {
    const p = await product(), user = await customer(), order = await acquire(user, p)
    const next = data<Version>(await call('POST', '/admin/methodologies/' + p.methodologyId + '/versions', { versionLabel: 'v2' }), 201)
    await publish(next, 'DEMO versão atual')
    const originalBefore = data<Version>(await call('GET', '/admin/versions/' + next.id))
    const suspended = data<Version>(await access(next.id, 'SUSPENDED'))
    expect(suspended.fullProcedure).toBe(originalBefore.fullProcedure); expect(suspended.reviewedRevision).toBe(originalBefore.reviewedRevision)
    expect((await content(user, p)).json().error.code).toBe('CONTENT_SUSPENDED')
    expect((await content(user, p, next.id)).statusCode).toBe(403)
    expect(data<LibraryContent>(await content(user, p, order.items[0]!.methodologyVersionId)).versionLabel).toBe('v1')
    expect(data<LibraryEntry>(await call('GET', '/library/' + p.methodologyId, undefined, user)).accessState).toBe('CONTENT_SUSPENDED')
    expect((await call('GET', '/library/' + p.methodologyId + '/versions', undefined, user)).json().data.map((v: { id: string }) => v.id)).toEqual([order.items[0]!.methodologyVersionId])
    const restored = data<Version>(await access(next.id, 'ALLOWED'))
    expect(restored.fullProcedure).toBe(originalBefore.fullProcedure); expect(data<LibraryContent>(await content(user, p)).versionLabel).toBe('v2')
    const events = await sql('SELECT previous_state, access_state, reason, actor_user_id FROM version_access_events WHERE version_id = ? ORDER BY id', [next.id])
    expect(events).toHaveLength(2); expect(events[0]).toMatchObject({ previous_state: 'ALLOWED', access_state: 'SUSPENDED', actor_user_id: admin.id })
    expect(events.every(row => row.reason.length > 0)).toBe(true)
  })
  it('ADMIN/CSRF/revisão/justificativa são exigidos e publicação não pode ser sobrescrita', async () => {
    const p = await product(), user = await customer(), v = data<Preview>(await call('GET', '/methodologies/' + p.methodologyId, undefined, user))
    const current = data<Version>(await call('GET', '/admin/versions/' + v.versionId)), path = '/admin/versions/' + v.versionId + '/access'
    const body = { expectedRevision: current.revision, accessState: 'SUSPENDED', reason: 'Revisão original DEMO' }
    expect((await call('PATCH', path, body, user)).statusCode).toBe(403)
    expect((await call('PATCH', path, { ...body, reason: ' ' })).statusCode).toBe(400)
    expect((await call('PATCH', path, { ...body, fullProcedure: 'forjado' })).statusCode).toBe(400)
    expect((await app.inject({ method: 'PATCH', url: '/api/v1' + path, headers: { cookie: admin.cookie, origin: config.APP_ORIGIN }, payload: body })).statusCode).toBe(403)
    const races = await Promise.all([call('PATCH', path, body), call('PATCH', path, body)])
    expect(races.map(r => r.statusCode).sort()).toEqual([200, 409])
    expect(await sql('SELECT id FROM version_access_events WHERE version_id = ?', [v.versionId])).toHaveLength(1)
    expect((await call('PATCH', '/admin/versions/' + v.versionId, { ...editor('Sobrescrita'), expectedRevision: current.revision + 1 })).json().error.code).toBe('VERSION_IMMUTABLE')
    const draft = data<Version>(await call('POST', '/admin/methodologies/' + p.methodologyId + '/versions', { versionLabel: 'draft' }), 201)
    expect((await access(draft.id, 'SUSPENDED')).json().error.code).toBe('VERSION_NOT_PUBLISHED')
  })
  it.each(['logout','absolute','idle','blocked','revoked'] as const)('%s impede leitura sem expor conteúdo', async mode => {
    const user = await customer(); await acquire(user)
    if (mode === 'logout') expect((await call('POST', '/auth/logout', {}, user)).statusCode).toBe(204)
    if (mode === 'absolute') await pool.execute('UPDATE auth_sessions SET expires_at = DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 1 SECOND) WHERE user_id = ?', [user.id])
    if (mode === 'idle') await pool.execute('UPDATE auth_sessions SET last_seen_at = DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 2 DAY) WHERE user_id = ?', [user.id])
    if (mode === 'blocked') await pool.execute("UPDATE users SET status = 'BLOCKED' WHERE id = ?", [user.id])
    if (mode === 'revoked') await pool.execute("UPDATE entitlements SET status = 'REVOKED', revoked_at = UTC_TIMESTAMP(6), reason = 'Restrição sintética DEMO' WHERE user_id = ?", [user.id])
    const response = await content(user, fx[0]!)
    expect(response.statusCode).toBe(mode === 'revoked' ? 403 : 401); expect(response.body).not.toContain(privateMarker)
    if (mode === 'revoked') {
      expect((await call('GET', '/library', undefined, user)).json().data[0].accessState).toBe('ENTITLEMENT_REVOKED')
      expect((await call('GET', '/library/' + fx[0]!.methodologyId + '/versions', undefined, user)).statusCode).toBe(403)
    }
  })
  it('retirada de venda e arquivamento não apagam direitos nem impedem leitura publicada permitida', async () => {
    const p = await product(), user = await customer(), order = await acquire(user, p)
    data<Product>(await call('PATCH', '/admin/products/' + p.id, { expectedRevision: p.revision, active: false }))
    expect((await content(user, p)).statusCode).toBe(200)
    const method = data<Methodology>(await call('GET', '/admin/methodologies/' + p.methodologyId))
    data<Methodology>(await call('PATCH', '/admin/methodologies/' + p.methodologyId, { expectedRevision: method.revision, retired: true }))
    expect((await content(user, p)).statusCode).toBe(200)
    expect((await call('GET', '/orders/' + order.id, undefined, user)).json().data.items).toEqual(order.items)
  })
  it.each(['PENDING','REJECTED'])('fonte %s bloqueia leitura e versão elegível mesmo com direito', async permission => {
    const p = await product(), user = await customer(), order = await acquire(user, p)
    await pool.execute('UPDATE version_sources SET permission_status = ? WHERE version_id = ?', [permission, order.items[0]!.methodologyVersionId])
    const response = await content(user, p)
    expect(response.statusCode).toBe(403); expect(response.json().error.code).toBe('CONTENT_UNAVAILABLE'); expect(response.body).not.toContain(privateMarker)
    expect((await call('GET', '/library/' + p.methodologyId + '/versions', undefined, user)).json().total).toBe(0)
  })
  it('paginação própria e DTOs gratuitos/pedidos/erros não incluem procedimento ou provas privadas', async () => {
    const user = await customer(); await acquire(user, fx[0]!); await acquire(user, fx[1]!)
    const one = await call('GET', '/library?pageSize=1', undefined, user), two = await call('GET', '/library?pageSize=1&page=2', undefined, user)
    expect(one.json().total).toBe(2); expect(one.json().data[0].methodologyId).not.toBe(two.json().data[0].methodologyId)
    for (const path of ['/library', '/library/' + fx[0]!.methodologyId, '/library/' + fx[0]!.methodologyId + '/versions', '/methodologies', '/methodologies/' + fx[0]!.methodologyId, '/orders', '/library/' + fx[0]!.methodologyId + '/content?versionId=0']) {
      const response = await call('GET', path, undefined, user)
      expect(response.body).not.toContain(privateMarker); expect(response.body).not.toContain(privateProof)
      expect(response.body).not.toMatch(/fullProcedure|fullDescription|permissionEvidence|permission_evidence_ref/)
    }
    expect((await call('GET', '/library?userId=' + user.id, undefined, user)).statusCode).toBe(400)
    expect((await call('GET', '/library', undefined, null)).statusCode).toBe(401)
  })
})
