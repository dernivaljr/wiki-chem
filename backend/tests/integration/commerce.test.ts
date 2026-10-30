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
import type { Cart, Product } from '../../src/modules/commerce/commerce.contracts.js'
import type { Methodology, Preview, Version } from '../../src/modules/catalog/catalog.contracts.js'
import { facets } from '../../src/modules/catalog/catalog.contracts.js'
import { demoEditor } from '../catalog-fixtures.js'
import { demoPrices } from '../commerce-fixtures.js'
import { migrateTestDatabase, resetTestDatabase } from '../test-database.js'

const env = loadConfig(process.env)
if (env.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(env.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') throw new Error('Comércio exige banco descartável explícito.')
const config = { ...env, LOG_LEVEL: 'silent' as const, AUTH_RATE_LIMIT_MAX: 100 }
const pool = createDatabasePool(config)
let app: FastifyInstance
interface Session { cookie: string; csrf: string; id: string; email: string }
let admin: Session
const prefix = 'fx-demo-' + randomUUID().slice(0, 8), password = 'Senha DEMO de teste isolado 123!'
const privateMarker = 'PRIVATE_DEMO_' + randomUUID()
let serial = 0
const fx: Product[] = []
const sql = async (query: string, args: (string | number)[] = []) => (await pool.execute<RowDataPacket[]>(query, args))[0]
function api() { return buildApp(config, { checkDatabase: async () => {}, identity: createIdentityRepository(pool), catalog: createCatalogRepository(pool), commerce: createCommerceRepository(pool) }) }
function session(response: LightMyRequestResponse, email: string): Session {
  expect(response.statusCode, response.body).toBe(200)
  const header = response.headers['set-cookie'], cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0]
  if (!cookie) throw new Error('Cookie ausente')
  return { cookie, csrf: response.json().data.csrfToken, id: response.json().data.user.id, email }
}
async function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, user: Session | null = admin) {
  return app.inject({ method, url: '/api/v1' + path, headers: { origin: config.APP_ORIGIN, ...(user ? { cookie: user.cookie, 'x-csrf-token': user.csrf } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, ...(body !== undefined ? { payload: JSON.stringify(body) } : {}) })
}
function data<T>(response: LightMyRequestResponse, status = 200): T { expect(response.statusCode, response.body).toBe(status); return response.json().data as T }
async function customer() {
  const email = prefix + '-' + (++serial) + '@example.test'
  expect((await call('POST', '/auth/register', { displayName: 'Cliente sintético DEMO', email, password }, null)).statusCode).toBe(201)
  return session(await call('POST', '/auth/login', { email, password }, null), email)
}
function editor(title: string) {
  const value = demoEditor({ techniques: [], technologies: [], equipment: [], matrices: [], analytes: [], standards: [], segments: [] }, privateMarker)
  value.title = title
  for (const facet of facets) value.notApplicable[facet] = 'Fixture original DEMO de software, sem classificação científica real.'
  value.sources[0]!.permissionEvidence = privateMarker
  return value
}
async function draft() {
  const method = data<Methodology>(await call('POST', '/admin/methodologies', { slug: prefix + '-' + (++serial) }), 201)
  const version = data<Version>(await call('POST', '/admin/methodologies/' + method.id + '/versions', { versionLabel: 'v1' }), 201)
  return { method, version }
}
async function publish(version: Version, title: string) {
  const saved = data<Version>(await call('PATCH', '/admin/versions/' + version.id, { ...editor(title), expectedRevision: version.revision }))
  return data<Version>(await call('POST', '/admin/versions/' + saved.id + '/publish', { expectedRevision: saved.revision, reviewAcknowledged: true, reviewNote: 'Revisão explícita da fixture original DEMO; sem uso laboratorial ou fonte externa.' }))
}
async function priced(amount = '1000') {
  const { method, version } = await draft()
  await publish(version, 'DEMO original ' + method.slug)
  let product = data<Product>(await call('POST', '/admin/products', { methodologyId: method.id }), 201)
  product = data<Product>(await call('POST', '/admin/products/' + product.id + '/prices', { expectedRevision: product.revision, amountCentavos: amount, currency: 'BRL' }), 201)
  return data<Product>(await call('PATCH', '/admin/products/' + product.id, { active: true, expectedRevision: product.revision }))
}
const cart = async (user: Session) => data<Cart>(await call('GET', '/cart', undefined, user))
const preview = async (product: Product) => data<Preview>(await call('GET', '/methodologies/' + product.methodologyId))
async function add(user: Session, product: Product, expectedRevision?: number, observed?: Preview) {
  const p = observed ?? await preview(product), revision = expectedRevision ?? (await cart(user)).revision
  return call('PUT', '/cart/items/' + product.id, { expectedRevision: revision, offerRevision: p.offer!.revision, priceId: p.offer!.priceId, versionId: p.versionId }, user)
}
async function changePrice(product: Product, amount = '1250') {
  const current = data<Product>(await call('GET', '/admin/products/' + product.id))
  return data<Product>(await call('POST', '/admin/products/' + product.id + '/prices', { expectedRevision: current.revision, amountCentavos: amount, currency: 'BRL' }), 201)
}
beforeAll(async () => {
  await resetTestDatabase(pool, config); await migrateTestDatabase(config)
  const email = prefix + '-admin@example.test'
  await provisionInitialAdmin(pool, config.DB_NAME, { displayName: 'ADMIN sintético DEMO', email, password }, 'Operador DEMO da suíte comercial')
  app = api()
  admin = session(await call('POST', '/auth/login', { email, password }, null), email)
  for (const amount of demoPrices()) fx.push(await priced(amount))
}, 30000)
afterAll(async () => { await app?.close(); await resetTestDatabase(pool, config); await migrateTestDatabase(config); await pool.end() })

describe('produtos, preços e carrinhos no MySQL real', () => {
  it('FX01–FX05 somam 12000 centavos sem duplicar itens e sem pedidos', async () => {
    const user = await customer()
    for (const product of fx) data<Cart>(await add(user, product))
    const found = await cart(user)
    expect(found.items).toHaveLength(5); expect(found.totalCentavos).toBe('12000')
    expect(found.items.every(item => item.quantity === 1 && item.offer.available)).toBe(true)
    const duplicate = data<Cart>(await add(user, fx[0]!, found.revision))
    expect(duplicate.revision).toBe(found.revision); expect(duplicate.items).toHaveLength(5)
    expect(await sql('SELECT id FROM orders WHERE user_id = ?', [user.id])).toHaveLength(0)
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [user.id])).toHaveLength(0)
  })
  it('FX01 + FX02 somam 2750 e usuário nenhum fornece valores calculados', async () => {
    const user = await customer()
    data<Cart>(await add(user, fx[0]!)); expect(data<Cart>(await add(user, fx[1]!)).totalCentavos).toBe('2750')
    const p = await preview(fx[0]!), rev = (await cart(user)).revision
    for (const extra of [{ quantity: 2 }, { amountCentavos: '1' }, { totalCentavos: '1' }, { userId: admin.id }]) {
      expect((await call('PUT', '/cart/items/' + fx[0]!.id, { expectedRevision: rev, offerRevision: p.offer!.revision, priceId: p.offer!.priceId, versionId: p.versionId, ...extra }, user)).statusCode).toBe(400)
    }
  })
  it('produto sem preço continua pesquisável e não pode ativar ou entrar no carrinho', async () => {
    const item = await draft(); await publish(item.version, 'DEMO sem preço ' + item.method.slug)
    const product = data<Product>(await call('POST', '/admin/products', { methodologyId: item.method.id }), 201)
    const p = await preview(product)
    expect(p.offer).toMatchObject({ active: false, priceId: null, amountCentavos: null, available: false }); expect(p.purchasable).toBe(false)
    expect((await call('PATCH', '/admin/products/' + product.id, { active: true, expectedRevision: product.revision })).statusCode).toBe(409)
    const search = await call('GET', '/methodologies?q=' + item.method.slug)
    expect(search.statusCode).toBe(200); expect(search.json().data.map((row: Preview) => row.id)).toContain(item.method.id)
    expect((await call('PUT', '/cart/items/' + product.id, { expectedRevision: 1, offerRevision: 1, priceId: fx[0]!.offer.priceId, versionId: p.versionId }, await customer())).statusCode).toBe(409)
  })
  it('rascunho pode ter produto inativo/preço, mas não oferta ativa', async () => {
    const item = await draft(), product = data<Product>(await call('POST', '/admin/products', { methodologyId: item.method.id }), 201)
    const priced = data<Product>(await call('POST', '/admin/products/' + product.id + '/prices', { expectedRevision: 1, amountCentavos: '1000', currency: 'BRL' }), 201)
    expect(priced.offer.reason).toBe('CONTENT_UNAVAILABLE')
    expect((await call('PATCH', '/admin/products/' + product.id, { active: true, expectedRevision: priced.revision })).statusCode).toBe(409)
  })
  it.each(['0', '-10', '1.50', '01', '9223372036854775808'])('recusa preço monetário inválido %s sem criar histórico', async amount => {
    const p = fx[0]!
    const before = await sql('SELECT id FROM product_prices WHERE product_id = ?', [p.id])
    expect((await call('POST', '/admin/products/' + p.id + '/prices', { expectedRevision: p.revision, amountCentavos: amount, currency: 'BRL' })).statusCode).toBe(400)
    expect(await sql('SELECT id FROM product_prices WHERE product_id = ?', [p.id])).toHaveLength(before.length)
  })
  it('histórico é append-only também no banco e ponteiro não aceita preço de outro produto', async () => {
    const product = await priced(), updated = await changePrice(product)
    expect(updated.offer.amountCentavos).toBe('1250')
    const history = await call('GET', '/admin/products/' + product.id + '/prices?pageSize=1')
    expect(history.json()).toMatchObject({ total: 2, page: 1, pageSize: 1 })
    expect(history.json().data[0].createdBy).toBe(admin.id)
    await expect(pool.execute('UPDATE product_prices SET amount_centavos = 1 WHERE id = ?', [product.offer.priceId])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    await expect(pool.execute('DELETE FROM product_prices WHERE id = ?', [product.offer.priceId])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    await expect(pool.execute('UPDATE products SET current_price_id = ? WHERE id = ?', [fx[0]!.offer.priceId, product.id])).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' })
    const original = await sql('SELECT amount_centavos FROM product_prices WHERE id = ?', [product.offer.priceId!])
    expect(String(original[0]?.amount_centavos)).toBe('1000')
    expect((await call('POST', '/admin/products', { methodologyId: product.methodologyId })).statusCode).toBe(409)
  })
  it('restrições MySQL rejeitam zero, moeda inválida e versão de outra metodologia no item', async () => {
    for (const value of [{ amount: '0', currency: 'BRL' }, { amount: '1000', currency: 'USD' }]) await expect(pool.execute('INSERT INTO product_prices (product_id, amount_centavos, currency, created_by, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))', [fx[0]!.id, value.amount, value.currency, admin.id])).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' })
    const user = await customer(), found = data<Cart>(await add(user, fx[0]!)), other = await preview(fx[1]!)
    const [stored] = await sql('SELECT id FROM carts WHERE user_id = ?', [user.id])
    await expect(pool.execute('UPDATE cart_items SET observed_version_id = ? WHERE cart_id = ?', [other.versionId, stored!.id])).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' })
    expect((await cart(user)).items[0]?.observedVersionId).toBe(found.items[0]?.observedVersionId)
  })
  it('preserva precisão acima de Number.MAX_SAFE_INTEGER, inclusive na soma', async () => {
    const product = await priced('9007199254740993'), user = await customer()
    const found = data<Cart>(await add(user, product))
    expect(found.totalCentavos).toBe('9007199254740993'); expect(found.items[0]?.offer.amountCentavos).toBe('9007199254740993')
    await changePrice(product, '9223372036854775807')
    expect((await cart(user)).totalCentavos).toBe('9223372036854775807')
  })
  it('leituras revalidam preço, versão e disponibilidade sem remover nem atualizar baseline', async () => {
    const product = await priced(), user = await customer(), first = data<Cart>(await add(user, product))
    await changePrice(product)
    let found = await cart(user)
    expect(found).toMatchObject({ revision: first.revision, totalCentavos: '1250' })
    expect(found.items[0]).toMatchObject({ observedAmountCentavos: '1000', observedPriceId: first.items[0]!.observedPriceId })
    expect(found.items[0]!.issues).toEqual(expect.arrayContaining(['PRICE_CHANGED', 'OFFER_CHANGED']))
    const next = data<Version>(await call('POST', '/admin/methodologies/' + product.methodologyId + '/versions', { versionLabel: 'v2' }), 201)
    await publish(next, 'DEMO nova versão')
    found = await cart(user); expect(found.items[0]!.issues).toContain('VERSION_CHANGED'); expect(found.items[0]!.observedVersionLabel).toBe('v1'); expect(found.items[0]!.currentVersionLabel).toBe('v2')
    const method = data<Methodology>(await call('GET', '/admin/methodologies/' + product.methodologyId))
    data<Methodology>(await call('PATCH', '/admin/methodologies/' + method.id, { expectedRevision: method.revision, retired: true }))
    found = await cart(user); expect(found.items).toHaveLength(1); expect(found.totalCentavos).toBe('0'); expect(found.unavailableCount).toBe(1); expect(found.items[0]!.issues).toContain('UNAVAILABLE')
    expect(data<Product>(await call('GET', '/admin/products/' + product.id)).active).toBe(false)
    expect((await call('DELETE', '/cart/items/' + product.id + '?expectedRevision=' + found.revision, undefined, user)).statusCode).toBe(200)
    expect((await cart(user)).items).toHaveLength(0)
  })
  it('bloqueia condição de fonte ou versão suspensa mesmo se produto permanecer ativo', async () => {
    const product = await priced(), user = await customer(), p = await preview(product)
    data<Cart>(await add(user, product))
    for (const change of [
      { query: 'UPDATE methodology_versions SET access_state = ? WHERE id = ?', blocked: 'SUSPENDED', original: 'ALLOWED' },
      { query: 'UPDATE version_sources SET permission_status = ? WHERE version_id = ?', blocked: 'PENDING', original: 'APPROVED' },
    ]) {
      await pool.execute(change.query, [change.blocked, p.versionId])
      try {
        expect((await cart(user)).items[0]!.offer.available).toBe(false)
        expect((await add(user, product, (await cart(user)).revision, p)).statusCode).toBe(409)
        const current = data<Product>(await call('GET', '/admin/products/' + product.id))
        expect((await call('PATCH', '/admin/products/' + product.id, { active: true, expectedRevision: current.revision })).statusCode).toBe(409)
      } finally { await pool.execute(change.query, [change.original, p.versionId]) }
    }
  })
  it('oferta alterada entre prévia e inclusão exige nova leitura e não grava item parcial', async () => {
    const product = await priced(), user = await customer(), old = await preview(product)
    await changePrice(product)
    const response = await add(user, product, 1, old)
    expect(response.statusCode).toBe(409); expect(response.json().error.code).toBe('OFFER_CHANGED')
    expect((await cart(user)).items).toHaveLength(0)
    expect(data<Cart>(await add(user, product)).totalCentavos).toBe('1250')
  })
  it('serializa inclusões concorrentes por usuário e recusa revisão antiga sem perder itens', async () => {
    const user = await customer()
    const responses = await Promise.all([add(user, fx[0]!, 1), add(user, fx[1]!, 1)])
    expect(responses.map(response => response.statusCode).sort()).toEqual([200, 409])
    const first = await cart(user); expect(first.items).toHaveLength(1)
    const missing = fx.slice(0, 2).find(p => p.id !== first.items[0]!.productId)!
    expect(data<Cart>(await add(user, missing)).totalCentavos).toBe('2750')
    expect((await call('DELETE', '/cart/items/' + missing.id + '?expectedRevision=1', undefined, user)).statusCode).toBe(409)
    expect((await cart(user)).items).toHaveLength(2)
  })
  it('dois novos preços concorrentes criam somente um sucessor e auditoria transacional', async () => {
    const product = await priced()
    const responses = await Promise.all(['1750', '2250'].map(amount => call('POST', '/admin/products/' + product.id + '/prices', { expectedRevision: product.revision, amountCentavos: amount, currency: 'BRL' })))
    expect(responses.map(response => response.statusCode).sort()).toEqual([201, 409])
    expect((await call('GET', '/admin/products/' + product.id + '/prices')).json().total).toBe(2)
    const events = await sql("SELECT actor_user_id, action, request_id FROM audit_events WHERE action = 'PRICE_CREATED'")
    expect(events.length).toBeGreaterThan(0); expect(String(events[0]!.actor_user_id)).toBe(admin.id)
    expect(JSON.stringify(events)).not.toContain(privateMarker)
  })
  it('carrinhos são isolados e persistem após logout, novo login e recriação da API', async () => {
    const one = await customer(), two = await customer()
    data<Cart>(await add(one, fx[0]!)); expect((await cart(two)).items).toHaveLength(0)
    expect((await call('GET', '/cart?userId=' + one.id, undefined, two)).statusCode).toBe(400)
    expect((await call('GET', '/cart/' + one.id, undefined, two)).statusCode).toBe(404)
    const second = api()
    try { expect(data<Cart>(await second.inject({ method: 'GET', url: '/api/v1/cart', headers: { cookie: one.cookie } })).items).toHaveLength(1) } finally { await second.close() }
    expect((await call('POST', '/auth/logout', {}, one)).statusCode).toBe(204)
    expect((await call('GET', '/cart', undefined, one)).statusCode).toBe(401)
    const renewed = session(await call('POST', '/auth/login', { email: one.email, password }, null), one.email)
    expect((await cart(renewed)).totalCentavos).toBe('1000'); expect((await cart(two)).items).toHaveLength(0)
  })
  it('cliente não administra produtos/preços; escritas exigem CSRF e origem', async () => {
    const user = await customer()
    for (const [method, path, body] of [['GET', '/admin/products', undefined], ['POST', '/admin/products', { methodologyId: fx[0]!.methodologyId }], ['PATCH', '/admin/products/' + fx[0]!.id, { expectedRevision: 1, active: true }], ['POST', '/admin/products/' + fx[0]!.id + '/prices', { expectedRevision: 1, amountCentavos: '1000', currency: 'BRL' }]] as const) expect((await call(method, path, body, user)).statusCode).toBe(403)
    for (const headers of [{ cookie: admin.cookie, origin: config.APP_ORIGIN }, { cookie: admin.cookie, origin: 'https://evil.invalid', 'x-csrf-token': admin.csrf }]) {
      expect((await app.inject({ method: 'POST', url: '/api/v1/admin/products', headers, payload: { methodologyId: fx[0]!.methodologyId } })).statusCode).toBe(403)
    }
    expect((await app.inject({ method: 'DELETE', url: '/api/v1/cart/items/' + fx[0]!.id + '?expectedRevision=1', headers: { cookie: user.cookie, origin: config.APP_ORIGIN } })).statusCode).toBe(403)
    expect((await call('GET', '/cart', undefined, null)).statusCode).toBe(401)
  })
  it('desativar oferta mantém resultado de pesquisa e itens; remover ausente não muda revisão', async () => {
    const product = await priced(), user = await customer(), initial = data<Cart>(await add(user, product))
    data<Product>(await call('PATCH', '/admin/products/' + product.id, { active: false, expectedRevision: product.revision }))
    expect((await preview(product)).purchasable).toBe(false)
    const found = await cart(user); expect(found.items).toHaveLength(1); expect(found.totalCentavos).toBe('0'); expect(found.items[0]!.issues).toContain('UNAVAILABLE')
    const noOp = data<Cart>(await call('DELETE', '/cart/items/18446744073709551615?expectedRevision=' + found.revision, undefined, user))
    expect(noOp.revision).toBe(initial.revision)
    const removed = data<Cart>(await call('DELETE', '/cart/items/' + product.id + '?expectedRevision=' + found.revision, undefined, user))
    expect(removed.revision).toBe(found.revision + 1)
  })
  it('carrinho, pesquisa, detalhes e respostas negadas não expõem conteúdo técnico privado', async () => {
    const user = await customer(); data<Cart>(await add(user, fx[0]!))
    for (const response of [await call('GET', '/cart', undefined, user), await call('GET', '/methodologies', undefined, user), await call('GET', '/methodologies/' + fx[0]!.methodologyId, undefined, user), await call('GET', '/admin/products/' + fx[0]!.id + '/prices', undefined, user)]) {
      expect(response.body).not.toContain(privateMarker)
      expect(response.body).not.toMatch(/fullProcedure|fullDescription|permissionEvidence|password_hash|token_hash/)
    }
  })
  it('remoção sem corpo funciona e recusa qualquer corpo explícito sem alterar o carrinho', async () => {
    const user = await customer(), initial = data<Cart>(await add(user, fx[0]!))
    const target = '/cart/items/' + fx[0]!.id + '?expectedRevision=' + initial.revision
    for (const payload of [{}, null, { quantity: 1 }]) expect((await call('DELETE', target, payload, user)).statusCode).toBe(400)
    expect((await cart(user)).items).toHaveLength(1)
    expect(data<Cart>(await call('DELETE', target, undefined, user)).items).toHaveLength(0)
  })
})
