import { createHash, randomUUID } from 'node:crypto'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import type { RowDataPacket } from 'mysql2/promise'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'
import { createIdentityRepository } from '../../src/modules/identity/identity.repository.js'
import { provisionInitialAdmin } from '../../src/modules/identity/admin-bootstrap.js'
import { createCatalogRepository } from '../../src/modules/catalog/catalog.repository.js'
import { createCommerceRepository } from '../../src/modules/commerce/commerce.repository.js'
import { createCheckoutRepository } from '../../src/modules/checkout/checkout.repository.js'
import type { Checkpoint } from '../../src/modules/checkout/checkout.repository.js'
import type { OrderDetail } from '../../src/modules/checkout/checkout.contracts.js'
import type { Cart, Product } from '../../src/modules/commerce/commerce.contracts.js'
import type { Methodology, Preview, Version } from '../../src/modules/catalog/catalog.contracts.js'
import { facets } from '../../src/modules/catalog/catalog.contracts.js'
import { demoEditor } from '../catalog-fixtures.js'
import { demoPrices } from '../commerce-fixtures.js'
import { migrateTestDatabase, resetTestDatabase } from '../test-database.js'
const env = loadConfig(process.env)
if (env.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(env.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') throw new Error('Checkout exige banco descartável explícito.')
const config = { ...env, LOG_LEVEL: 'silent' as const, AUTH_RATE_LIMIT_MAX: 100, CHECKOUT_RATE_LIMIT_MAX: 1000 }
const pool = createDatabasePool(config)
interface Session { cookie: string; csrf: string; id: string; email: string }
let app: FastifyInstance, admin: Session, clock = Date.now(), fault: Checkpoint | null = null, advance = false
let serial = 0
const prefix = 'checkout-demo-' + randomUUID().slice(0, 8), password = 'Senha original DEMO isolada 123!', privateMarker = 'PRIVATE_ORDER_DEMO_' + randomUUID()
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
  value.title = title; value.sources[0]!.permissionEvidence = privateMarker
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
const confirm = (user: Session, id: string, key = randomUUID()) => call('POST', '/orders/' + id + '/confirm-simulation', { demoAcknowledged: true }, user, key)
const get = async (user: Session, id: string) => data<OrderDetail>(await call('GET', '/orders/' + id, undefined, user))
async function changePrice(p: Product, amount = '1250') {
  const current = data<Product>(await call('GET', '/admin/products/' + p.id))
  return data<Product>(await call('POST', '/admin/products/' + p.id + '/prices', { expectedRevision: current.revision, amountCentavos: amount, currency: 'BRL' }), 201)
}
beforeAll(async () => {
  await resetTestDatabase(pool, config); await migrateTestDatabase(config)
  const email = prefix + '-admin@example.test'
  await provisionInitialAdmin(pool, config.DB_NAME, { displayName: 'ADMIN original DEMO', email, password }, 'Operador de checkout DEMO da suíte')
  app = buildApp(config, { checkDatabase: async () => {}, identity: createIdentityRepository(pool), catalog: createCatalogRepository(pool), commerce: createCommerceRepository(pool), checkout: createCheckoutRepository(pool, { ttlSeconds: 5, now: () => clock, checkpoint: (point, index) => {
    if (advance && point === 'OFFERS_VALIDATED') clock += 6000
    if (fault === point && (!['ITEM_CREATED','ENTITLEMENT_CREATED'].includes(point) || index === 0)) throw new Error('Falha injetada apenas pela composição de teste.')
  } }) })
  admin = auth(await call('POST', '/auth/login', { email, password }, null), email)
  for (const amount of demoPrices()) fx.push(await product(amount))
}, 30000)
beforeEach(() => { clock = Date.now(); fault = null; advance = false })
afterAll(async () => { await app?.close(); await resetTestDatabase(pool, config); await migrateTestDatabase(config); await pool.end() })

describe('checkout demonstrativo transacional com MySQL real', () => {
  it('T1 cria pedido de 12000 centavos com snapshots e sem conceder direitos ou limpar carrinho', async () => {
    const user = await customer(), before = await prepare(user, fx), key = randomUUID()
    const order = data<OrderDetail>(await create(user, before.revision, key), 201)
    expect(order).toMatchObject({ status: 'PENDING_CONFIRMATION', mode: 'SIMULATED', totalCentavos: '12000', itemCount: 5 })
    expect(order.items.map(item => item.unitAmountCentavos)).toEqual([...demoPrices()])
    expect(order.items.every(item => item.quantity === 1 && item.lineTotalCentavos === item.unitAmountCentavos)).toBe(true)
    expect((await cart(user)).revision).toBe(before.revision); expect((await cart(user)).items).toHaveLength(5)
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [user.id])).toHaveLength(0)
    const stored = await sql('SELECT key_hash, request_hash FROM idempotency_records WHERE user_id = ?', [user.id])
    expect(stored[0]?.key_hash).toBe(createHash('sha256').update(key).digest('hex'))
    expect(JSON.stringify(stored)).not.toContain(key)
  })
  it('T2 conclui, concede direitos, limpa somente itens adquiridos e persiste histórico', async () => {
    const user = await customer(), before = await prepare(user, fx.slice(0, 2))
    const order = data<OrderDetail>(await create(user, before.revision), 201)
    data<Cart>(await add(user, fx[2]!))
    const result = data<OrderDetail>(await confirm(user, order.id))
    expect(result).toMatchObject({ status: 'COMPLETED_SIMULATED', totalCentavos: '2750' }); expect(result.completedAt).toBeTruthy()
    const rights = await sql('SELECT methodology_id, order_item_id, status FROM entitlements WHERE user_id = ? ORDER BY methodology_id', [user.id])
    expect(rights).toHaveLength(2); expect(rights.every(row => row.status === 'ACTIVE')).toBe(true)
    expect((await cart(user)).items.map(item => item.productId)).toEqual([fx[2]!.id])
    expect((await call('GET', '/orders', undefined, user)).json().data[0]).toMatchObject({ id: order.id, status: 'COMPLETED_SIMULATED', itemCount: 2 })
    expect((await get(user, order.id)).items).toEqual(order.items)
  })
  it('replay de criação após conclusão devolve o mesmo pedido, e payload diferente conflita', async () => {
    const user = await customer(), before = await prepare(user), key = randomUUID()
    const one = data<OrderDetail>(await create(user, before.revision, key), 201)
    data<OrderDetail>(await confirm(user, one.id))
    const replay = data<OrderDetail>(await create(user, before.revision, key), 201)
    expect(replay.id).toBe(one.id); expect(replay.status).toBe('COMPLETED_SIMULATED')
    expect((await create(user, before.revision + 1, key)).statusCode).toBe(409)
    expect(await sql('SELECT id FROM orders WHERE user_id = ?', [user.id])).toHaveLength(1)
  })
  it('mesma chave em duas criações concorrentes persiste um único pedido', async () => {
    const user = await customer(), before = await prepare(user), key = randomUUID()
    const responses = await Promise.all([create(user, before.revision, key), create(user, before.revision, key)])
    const ids = responses.map(response => data<OrderDetail>(response, 201).id)
    expect(new Set(ids).size).toBe(1)
    expect(await sql('SELECT id FROM idempotency_records WHERE user_id = ?', [user.id])).toHaveLength(1)
  })
  it('duas abas/chaves confirmam o mesmo pedido sem dupla concessão ou revisão extra do carrinho', async () => {
    const user = await customer(), before = await prepare(user)
    const order = data<OrderDetail>(await create(user, before.revision), 201), key = randomUUID()
    const responses = await Promise.all([confirm(user, order.id, key), confirm(user, order.id, randomUUID())])
    expect(responses.map(response => data<OrderDetail>(response).status)).toEqual(['COMPLETED_SIMULATED','COMPLETED_SIMULATED'])
    data<OrderDetail>(await confirm(user, order.id, key))
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [user.id])).toHaveLength(1)
    expect((await cart(user)).revision).toBe(before.revision + 1)
    expect(await sql("SELECT id FROM audit_events WHERE actor_user_id = ? AND action = 'ORDER_COMPLETED_SIMULATED'", [user.id])).toHaveLength(1)
  })
  it('pedidos pendentes concorrentes com metodologia repetida não concedem aquisição parcial', async () => {
    const user = await customer(), firstCart = await prepare(user)
    const first = data<OrderDetail>(await create(user, firstCart.revision), 201)
    const secondCart = data<Cart>(await add(user, fx[1]!)), second = data<OrderDetail>(await create(user, secondCart.revision), 201)
    const responses = await Promise.all([confirm(user, first.id), confirm(user, second.id)])
    expect(responses.map(response => response.statusCode).sort()).toEqual([200, 409])
    const succeeded = responses.find(response => response.statusCode === 200)!.json().data as OrderDetail
    const failed = responses.find(response => response.statusCode === 409)!
    expect(failed.json().error.code).toBe('ALREADY_OWNED')
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [user.id])).toHaveLength(succeeded.items.length)
    expect((await get(user, succeeded.id === first.id ? second.id : first.id)).status).toBe('PENDING_CONFIRMATION')
  })
  it('compradores independentes podem usar a mesma chave sem compartilhar pedidos ou direitos', async () => {
    const one = await customer(), two = await customer(), key = randomUUID()
    const carts = await Promise.all([prepare(one), prepare(two)])
    const created = await Promise.all([create(one, carts[0]!.revision, key), create(two, carts[1]!.revision, key)])
    const a = data<OrderDetail>(created[0]!, 201), b = data<OrderDetail>(created[1]!, 201)
    expect(a.id).not.toBe(b.id)
    const done = await Promise.all([confirm(one, a.id, key), confirm(two, b.id, key)])
    for (const response of done) expect(data<OrderDetail>(response).status).toBe('COMPLETED_SIMULATED')
  })
  it.each(['ORDER_CREATED', 'ITEM_CREATED', 'IDEMPOTENCY_RECORDED'] as const)('falha T1 em %s reverte pedido, itens, chave e auditoria', async point => {
    const user = await customer(), before = await prepare(user, fx.slice(0, 2)), key = randomUUID(); fault = point
    expect((await create(user, before.revision, key)).statusCode).toBe(503)
    for (const table of ['orders','order_items','entitlements','idempotency_records']) expect(await sql('SELECT id FROM ' + table + ' WHERE user_id = ?', [user.id])).toHaveLength(0)
    expect(await sql("SELECT id FROM audit_events WHERE actor_user_id = ? AND action = 'ORDER_CREATED'", [user.id])).toHaveLength(0)
    expect((await cart(user)).revision).toBe(before.revision)
    fault = null; expect(data<OrderDetail>(await create(user, before.revision, key), 201).items).toHaveLength(2)
  })
  it.each(['ORDER_COMPLETED','ENTITLEMENT_CREATED','CART_UPDATED','AUDIT_RECORDED','IDEMPOTENCY_RECORDED'] as const)('falha T2 em %s faz rollback integral e permite a mesma chave', async point => {
    const user = await customer(), before = await prepare(user, fx.slice(0, 2)), order = data<OrderDetail>(await create(user, before.revision), 201), key = randomUUID(); fault = point
    expect((await confirm(user, order.id, key)).statusCode).toBe(503)
    expect((await get(user, order.id)).status).toBe('PENDING_CONFIRMATION')
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [user.id])).toHaveLength(0)
    expect((await cart(user)).items).toHaveLength(2); expect((await cart(user)).revision).toBe(before.revision)
    expect(await sql("SELECT id FROM idempotency_records WHERE user_id = ? AND operation = 'CONFIRM_SIMULATION'", [user.id])).toHaveLength(0)
    expect(await sql("SELECT id FROM audit_events WHERE actor_user_id = ? AND action = 'ORDER_COMPLETED_SIMULATED'", [user.id])).toHaveLength(0)
    fault = null; expect(data<OrderDetail>(await confirm(user, order.id, key)).status).toBe('COMPLETED_SIMULATED')
  })
  it.each(['1250','750'])('mudança de preço para %s exige outra revisão, sem substituir snapshots', async amount => {
    const p = await product(), user = await customer(), before = await prepare(user, [p]), order = data<OrderDetail>(await create(user, before.revision), 201)
    await changePrice(p, amount)
    const response = await confirm(user, order.id)
    expect(response.statusCode).toBe(409); expect(response.json().error.code).toBe('OFFER_CHANGED')
    expect((await get(user, order.id)).items[0]!.unitAmountCentavos).toBe('1000')
    expect((await cart(user)).items).toHaveLength(1)
    data<OrderDetail>(await call('POST', '/orders/' + order.id + '/cancel', {}, user))
    const next = data<OrderDetail>(await create(user, before.revision), 201)
    expect(next.items[0]!.unitAmountCentavos).toBe(amount)
    expect(data<OrderDetail>(await confirm(user, next.id)).status).toBe('COMPLETED_SIMULATED')
  })
  it('nova versão impede confirmar snapshot anterior e não permite recompra após aquisição', async () => {
    const p = await product(), user = await customer(), before = await prepare(user, [p]), order = data<OrderDetail>(await create(user, before.revision), 201)
    const version = data<Version>(await call('POST', '/admin/methodologies/' + p.methodologyId + '/versions', { versionLabel: 'v2' }), 201)
    await publish(version, 'DEMO atualização revisada')
    expect((await confirm(user, order.id)).json().error.code).toBe('OFFER_CHANGED')
    data<OrderDetail>(await call('POST', '/orders/' + order.id + '/cancel', {}, user))
    const next = data<OrderDetail>(await create(user, before.revision), 201); data<OrderDetail>(await confirm(user, next.id))
    const preview = data<Preview>(await call('GET', '/methodologies/' + p.methodologyId, undefined, user))
    expect(preview).toMatchObject({ owned: true, purchasable: false }); expect((await add(user, p)).json().error.code).toBe('ALREADY_OWNED')
    const rights = await sql('SELECT * FROM entitlements WHERE user_id = ?', [user.id])
    expect(rights[0]).not.toHaveProperty('methodology_version_id')
  })
  it.each(['inactive','suspended','permission'] as const)('revalida disponibilidade/permissão: %s', async state => {
    const p = await product(), user = await customer(), before = await prepare(user, [p]), order = data<OrderDetail>(await create(user, before.revision), 201), versionId = order.items[0]!.methodologyVersionId
    if (state === 'inactive') data<Product>(await call('PATCH', '/admin/products/' + p.id, { active: false, expectedRevision: p.revision }))
    else await pool.execute(state === 'suspended' ? "UPDATE methodology_versions SET access_state = 'SUSPENDED' WHERE id = ?" : "UPDATE version_sources SET permission_status = 'PENDING' WHERE version_id = ?", [versionId])
    const response = await confirm(user, order.id)
    expect(response.statusCode).toBe(409); expect(response.json().error.code).toBe('PRODUCT_UNAVAILABLE')
    expect((await get(user, order.id)).status).toBe('PENDING_CONFIRMATION'); expect((await cart(user)).items).toHaveLength(1)
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [user.id])).toHaveLength(0)
  })
  it('cancelamento é persistente/idempotente e não concede direito nem limpa carrinho', async () => {
    const user = await customer(), before = await prepare(user), order = data<OrderDetail>(await create(user, before.revision), 201)
    const cancelled = data<OrderDetail>(await call('POST', '/orders/' + order.id + '/cancel', {}, user))
    expect(cancelled.status).toBe('CANCELLED')
    expect(data<OrderDetail>(await call('POST', '/orders/' + order.id + '/cancel', {}, user)).cancelledAt).toBe(cancelled.cancelledAt)
    expect((await confirm(user, order.id)).statusCode).toBe(409)
    expect((await cart(user)).items).toHaveLength(1)
    expect(await sql("SELECT id FROM audit_events WHERE actor_user_id = ? AND action = 'ORDER_CANCELLED'", [user.id])).toHaveLength(1)
  })
  it('prazo é verificado no servidor, GET não altera estado e confirmação materializa expiração uma vez', async () => {
    const user = await customer(), before = await prepare(user), order = data<OrderDetail>(await create(user, before.revision), 201)
    clock += 5000
    expect((await get(user, order.id)).status).toBe('EXPIRED')
    expect((await sql('SELECT status FROM orders WHERE id = ?', [order.id]))[0]!.status).toBe('PENDING_CONFIRMATION')
    expect((await call('GET', '/orders', undefined, user)).json().data[0].status).toBe('EXPIRED')
    expect((await confirm(user, order.id)).json().error.code).toBe('ORDER_EXPIRED')
    expect((await confirm(user, order.id)).json().error.code).toBe('ORDER_EXPIRED')
    expect((await sql('SELECT status FROM orders WHERE id = ?', [order.id]))[0]!.status).toBe('EXPIRED')
    expect(await sql("SELECT id FROM audit_events WHERE actor_user_id = ? AND action = 'ORDER_EXPIRED'", [user.id])).toHaveLength(1)
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [user.id])).toHaveLength(0)
  })
  it('reconfere prazo depois de bloquear/revalidar ofertas', async () => {
    const user = await customer(), before = await prepare(user), order = data<OrderDetail>(await create(user, before.revision), 201); advance = true
    expect((await confirm(user, order.id)).json().error.code).toBe('ORDER_EXPIRED')
    expect((await get(user, order.id)).status).toBe('EXPIRED'); expect((await cart(user)).items).toHaveLength(1)
  })
  it('snapshots e origem do direito permanecem imutáveis; revogação não autoriza recompra', async () => {
    const p = await product(), user = await customer(), before = await prepare(user, [p]), order = data<OrderDetail>(await create(user, before.revision), 201), key = randomUUID()
    data<OrderDetail>(await confirm(user, order.id, key)); await changePrice(p, '3000')
    expect((await get(user, order.id)).items).toEqual(order.items)
    for (const query of ['UPDATE orders SET total_centavos = 1 WHERE id = ?', 'UPDATE orders SET expires_at = UTC_TIMESTAMP(6) WHERE id = ?', 'DELETE FROM orders WHERE id = ?']) await expect(pool.execute(query, [order.id])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    await expect(pool.execute('UPDATE order_items SET title_snapshot = ? WHERE order_id = ?', ['forjado', order.id])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    await expect(pool.execute('DELETE FROM order_items WHERE order_id = ?', [order.id])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    await expect(pool.execute('UPDATE entitlements SET methodology_id = ? WHERE user_id = ?', [fx[1]!.methodologyId, user.id])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    await expect(pool.execute('DELETE FROM entitlements WHERE user_id = ?', [user.id])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    await pool.execute("UPDATE entitlements SET status = 'REVOKED', revoked_at = UTC_TIMESTAMP(6), reason = 'Restrição sintética DEMO de teste' WHERE user_id = ?", [user.id])
    expect((await add(user, p)).json().error.code).toBe('ALREADY_OWNED')
    expect(data<OrderDetail>(await confirm(user, order.id, key)).status).toBe('COMPLETED_SIMULATED')
    expect((await sql('SELECT status FROM entitlements WHERE user_id = ?', [user.id]))[0]!.status).toBe('REVOKED')
  })
  it('banco impede concessão a partir de pedido pendente ou a proprietário divergente', async () => {
    const user = await customer(), other = await customer(), before = await prepare(user), order = data<OrderDetail>(await create(user, before.revision), 201), item = order.items[0]!
    await expect(pool.execute("INSERT INTO entitlements (user_id, methodology_id, order_item_id, status, granted_at) VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(6))", [user.id, item.methodologyId, item.id])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    data<OrderDetail>(await confirm(user, order.id))
    await expect(pool.execute("INSERT INTO entitlements (user_id, methodology_id, order_item_id, status, granted_at) VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(6))", [other.id, item.methodologyId, item.id])).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION' })
    expect(await sql('SELECT id FROM entitlements WHERE user_id = ?', [other.id])).toHaveLength(0)
  })
  it('propriedade, sessão, CSRF e chave são obrigatórios', async () => {
    const user = await customer(), other = await customer(), before = await prepare(user), order = data<OrderDetail>(await create(user, before.revision), 201)
    for (const [method, path, body] of [['GET','/orders/' + order.id,undefined],['POST','/orders/' + order.id + '/cancel',{}],['POST','/orders/' + order.id + '/confirm-simulation',{ demoAcknowledged: true }]] as const) expect((await call(method, path, body, other, randomUUID())).statusCode).toBe(404)
    expect((await call('GET', '/orders', undefined, null)).statusCode).toBe(401)
    expect((await call('GET', '/orders?userId=' + user.id, undefined, other)).statusCode).toBe(400)
    expect((await call('POST', '/checkout/simulations', { cartRevision: before.revision }, user)).statusCode).toBe(400)
    expect((await call('POST', '/orders/' + order.id + '/confirm-simulation', { demoAcknowledged: false }, user, randomUUID())).statusCode).toBe(400)
    expect((await app.inject({ method: 'POST', url: '/api/v1/checkout/simulations', headers: { cookie: user.cookie, origin: config.APP_ORIGIN, 'idempotency-key': randomUUID() }, payload: { cartRevision: before.revision } })).statusCode).toBe(403)
  })
  it('chave de confirmação não pode ser reutilizada para outro pedido do mesmo usuário', async () => {
    const user = await customer(), before = await prepare(user), first = data<OrderDetail>(await create(user, before.revision), 201), key = randomUUID()
    data<OrderDetail>(await confirm(user, first.id, key)); const nextCart = data<Cart>(await add(user, fx[1]!)), second = data<OrderDetail>(await create(user, nextCart.revision), 201)
    const response = await confirm(user, second.id, key)
    expect(response.statusCode).toBe(409); expect(response.json().error.code).toBe('IDEMPOTENCY_CONFLICT'); expect((await get(user, second.id)).status).toBe('PENDING_CONFIRMATION')
  })
  it('rejeita carrinho vazio, revisão antiga e total fora do limite sem criar pedido', async () => {
    const user = await customer()
    expect((await create(user, 1)).json().error.code).toBe('EMPTY_CART')
    const before = await prepare(user)
    expect((await create(user, before.revision - 1)).json().error.code).toBe('CART_CHANGED')
    const huge = await product('9223372036854775807'), other = await customer(); await prepare(other, [huge, fx[0]!])
    expect((await create(other, (await cart(other)).revision)).json().error.code).toBe('ORDER_TOTAL_LIMIT')
    expect(await sql('SELECT id FROM orders WHERE user_id = ?', [other.id])).toHaveLength(0)
  })
  it('listagem estável/paginada e respostas não expõem procedimento, permissões ou credenciais', async () => {
    const user = await customer(), before = await prepare(user)
    const a = data<OrderDetail>(await create(user, before.revision), 201), b = data<OrderDetail>(await create(user, before.revision), 201)
    const first = await call('GET', '/orders?pageSize=1', undefined, user), second = await call('GET', '/orders?pageSize=1&page=2', undefined, user)
    expect(first.json()).toMatchObject({ total: 2, page: 1 }); expect(first.json().data[0].id).toBe(b.id); expect(second.json().data[0].id).toBe(a.id)
    for (const response of [first, second, await call('GET', '/orders/' + a.id, undefined, user), await confirm(user, a.id)]) {
      expect(response.body).not.toContain(privateMarker)
      expect(response.body).not.toMatch(/fullProcedure|fullDescription|permissionEvidence|password_hash|token_hash|key_hash|request_hash/)
    }
  })
})
