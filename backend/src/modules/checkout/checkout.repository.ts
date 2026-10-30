import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { withTransaction } from '../../database/pool.js'
import { AppError } from '../../shared/errors.js'
import type { Actor } from '../identity/access.js'
import { placeholders } from '../catalog/catalog.search.js'
import { currentVersions, loadOffers, ownedMethods, rows } from '../commerce/commerce.offers.js'
import { maxPrice } from '../commerce/commerce.contracts.js'
import type { Operation, OrderDetail, OrderSummary } from './checkout.contracts.js'

type Row = RowDataPacket
export type Checkpoint = 'ORDER_CREATED' | 'ITEM_CREATED' | 'OFFERS_VALIDATED' | 'ORDER_COMPLETED' | 'ENTITLEMENT_CREATED' | 'CART_UPDATED' | 'AUDIT_RECORDED' | 'IDEMPOTENCY_RECORDED'
export interface CheckoutOptions { ttlSeconds?: number; now?: () => number; checkpoint?: (point: Checkpoint, index?: number) => void }
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const date = (ms: number) => new Date(ms).toISOString().slice(0, 23).replace('T', ' ')
const millis = (value: string) => Date.parse(value.replace(' ', 'T') + 'Z')
const iso = (value: string | null) => value === null ? null : new Date(millis(value)).toISOString()
const missing = () => new AppError(404, 'NOT_FOUND', 'Pedido não encontrado.')
export function requestHash(operation: Operation, target: string, payload: { cartRevision: number } | { demoAcknowledged: true }) {
  return digest(JSON.stringify([operation, target, 'cartRevision' in payload ? { cartRevision: payload.cartRevision } : { demoAcknowledged: true }]))
}
async function audit(db: PoolConnection, actor: Actor, action: string, orderId: string) {
  await db.execute('INSERT INTO audit_events (actor_user_id, action, target_type, target_id, request_id, occurred_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(6))', [actor.userId, action, 'order', orderId, actor.requestId])
}
async function ownOrder(db: PoolConnection, id: string, userId: string, lock = false) {
  const [row] = await rows(db, 'SELECT * FROM orders WHERE id = ? AND user_id = ?' + (lock ? ' FOR UPDATE' : ''), [id, userId])
  if (!row) throw missing()
  return row
}
const effectiveStatus = (row: Row, now: number): OrderDetail['status'] => row.status === 'PENDING_CONFIRMATION' && millis(row.expires_at) <= now ? 'EXPIRED' : row.status
function summary(row: Row, itemCount: number, now: number): OrderSummary {
  return { id: String(row.id), status: effectiveStatus(row, now), mode: 'SIMULATED', currency: 'BRL', totalCentavos: String(row.total_centavos), cartRevisionSnapshot: Number(row.cart_revision_snapshot),
    createdAt: iso(row.created_at)!, expiresAt: iso(row.expires_at)!, completedAt: iso(row.completed_at), cancelledAt: iso(row.cancelled_at), itemCount, serverTime: new Date(now).toISOString() }
}
async function detail(db: PoolConnection, row: Row, now: number, currentRead = false): Promise<OrderDetail> {
  const found = await rows(db, 'SELECT * FROM order_items WHERE order_id = ? AND user_id = ? ORDER BY product_id' + (currentRead ? ' FOR SHARE' : ''), [String(row.id), String(row.user_id)])
  return { ...summary(row, found.length, now), items: found.map(item => ({ id: String(item.id), productId: String(item.product_id), methodologyId: String(item.methodology_id), methodologyVersionId: String(item.methodology_version_id), priceId: String(item.price_id), titleSnapshot: item.title_snapshot, versionLabelSnapshot: item.version_label_snapshot, unitAmountCentavos: String(item.unit_amount_centavos), lineTotalCentavos: String(item.line_total_centavos), quantity: 1 })) }
}
async function lockCart(db: PoolConnection, userId: string) {
  const [cart] = await rows(db, 'SELECT id, revision FROM carts WHERE user_id = ? FOR UPDATE', [userId])
  return cart
}
async function snapshot(db: PoolConnection, productIds: string[], userId: string) {
  const ids = [...new Set(productIds)].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1)
  const products = await rows(db, 'SELECT * FROM products WHERE id IN (' + placeholders(ids.length) + ') ORDER BY id FOR UPDATE', ids)
  if (products.length !== ids.length) throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'Há produto indisponível. Revise o carrinho.')
  const methodIds = products.map(row => String(row.methodology_id))
  const versions = await currentVersions(db, methodIds, true), offers = await loadOffers(db, methodIds, true)
  if ((await ownedMethods(db, userId, methodIds, true)).size) throw new AppError(409, 'ALREADY_OWNED', 'Aquisição simulada já registrada para uma metodologia deste pedido. Consulte seus pedidos.')
  return products.map(product => {
    const methodologyId = String(product.methodology_id), version = versions.get(methodologyId), offer = offers.get(methodologyId)
    if (!version || !offer?.available || !offer.priceId || !offer.amountCentavos) throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'Oferta ou conteúdo indisponível. Revise o pedido e o carrinho.')
    return { productId: String(product.id), methodologyId, versionId: String(version.id), title: version.title as string, versionLabel: version.version_label as string, priceId: offer.priceId, amount: offer.amountCentavos, offerRevision: offer.revision }
  })
}
export function createCheckoutRepository(pool: Pool, options: CheckoutOptions = {}) {
  const now = options.now ?? Date.now, ttl = options.ttlSeconds ?? 900, checkpoint = options.checkpoint ?? (() => {})
  if (!Number.isInteger(ttl) || ttl < 5 || ttl > 3600) throw new Error('CHECKOUT_TTL_INVALID')
  async function boundary<T>(work: () => Promise<T>): Promise<T> {
    try { return await work() } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(503, 'CHECKOUT_RETRYABLE', 'Não foi possível determinar o resultado. Consulte o pedido ou repita a mesma tentativa com a mesma chave.')
    }
  }
  async function write(actor: Actor, work: (db: PoolConnection) => Promise<OrderDetail | AppError>): Promise<OrderDetail> {
    return boundary(async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const result = await withTransaction(pool, async db => {
            const [user] = await rows(db, 'SELECT status FROM users WHERE id = ? FOR UPDATE', [actor.userId])
            if (!user || user.status !== 'ACTIVE') throw new AppError(403, 'FORBIDDEN', 'Ação não permitida.')
            return work(db)
          })
          // Somente a transição de expiração e sua auditoria podem ser
          // confirmadas com recusa 409; nenhum efeito de aquisição é feito.
          if (result instanceof AppError) throw result
          return result
        } catch (error) {
          const code = (error as { code?: string }).code
          if (code === 'ER_DUP_ENTRY') throw new AppError(409, 'CHECKOUT_CONFLICT', 'Conflito de aquisição. Consulte seus pedidos antes de repetir a tentativa.')
          if (!['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(code ?? '') || attempt >= 2) throw error
          await delay(20 * (attempt + 1))
        }
      }
    })
  }
  async function replay(db: PoolConnection, actor: Actor, operation: Operation, key: string, hash: string) {
    // O bloqueio de users serializa o escopo; a leitura não reserva gaps de
    // chaves inexistentes entre compradores independentes.
    const [record] = await rows(db, 'SELECT order_id, request_hash FROM idempotency_records WHERE user_id = ? AND operation = ? AND key_hash = ?', [actor.userId, operation, digest(key)])
    if (!record) return null
    if (record.request_hash !== hash) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'A chave já identifica outra intenção. Consulte o histórico antes de iniciar nova revisão.')
    return detail(db, await ownOrder(db, String(record.order_id), actor.userId, true), now(), true)
  }
  async function remember(db: PoolConnection, actor: Actor, operation: Operation, key: string, hash: string, orderId: string) {
    await db.execute('INSERT INTO idempotency_records (user_id, operation, key_hash, request_hash, order_id, response_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [actor.userId, operation, digest(key), hash, orderId, operation === 'CHECKOUT_SIMULATION' ? 201 : 200, date(now())])
    checkpoint('IDEMPOTENCY_RECORDED')
  }
  async function expire(db: PoolConnection, actor: Actor, row: Row) {
    if (row.status !== 'PENDING_CONFIRMATION' || millis(row.expires_at) > now()) return false
    await db.execute("UPDATE orders SET status = 'EXPIRED' WHERE id = ?", [String(row.id)])
    await audit(db, actor, 'ORDER_EXPIRED', String(row.id))
    return true
  }
  return {
    async create(actor: Actor, cartRevision: number, key: string) {
      const hash = requestHash('CHECKOUT_SIMULATION', '/checkout/simulations', { cartRevision })
      return write(actor, async db => {
        const cart = await lockCart(db, actor.userId)
        const previous = await replay(db, actor, 'CHECKOUT_SIMULATION', key, hash)
        if (previous) return previous
        if (!cart) throw new AppError(400, 'EMPTY_CART', 'O carrinho está vazio.')
        if (Number(cart.revision) !== cartRevision) throw new AppError(409, 'CART_CHANGED', 'O carrinho mudou. Atualize e revise antes de continuar.')
        const items = await rows(db, 'SELECT product_id FROM cart_items WHERE cart_id = ? ORDER BY product_id FOR SHARE', [String(cart.id)])
        if (!items.length) throw new AppError(400, 'EMPTY_CART', 'O carrinho está vazio.')
        if (items.length > 100) throw new AppError(409, 'CART_LIMIT', 'O pedido permite até 100 produtos.')
        const current = await snapshot(db, items.map(row => String(row.product_id)), actor.userId)
        const total = current.reduce((sum, item) => sum + BigInt(item.amount), 0n)
        if (total < 1n || total > maxPrice) throw new AppError(409, 'ORDER_TOTAL_LIMIT', 'O total excede o limite técnico de armazenamento do pedido.')
        const created = now()
        const [insert] = await db.execute<ResultSetHeader>("INSERT INTO orders (user_id, mode, currency, total_centavos, cart_revision_snapshot, created_at, expires_at) VALUES (?, 'SIMULATED', 'BRL', ?, ?, ?, ?)", [actor.userId, total.toString(), cartRevision, date(created), date(created + ttl * 1000)])
        // insertId pode ser numérico no driver; LAST_INSERT_ID preserva BIGINT.
        const [last] = await rows(db, 'SELECT LAST_INSERT_ID() AS id')
        const orderId = String(last?.id ?? insert.insertId)
        checkpoint('ORDER_CREATED')
        for (const [index, item] of current.entries()) {
          await db.execute('INSERT INTO order_items (order_id, user_id, product_id, methodology_id, methodology_version_id, price_id, offer_revision_snapshot, title_snapshot, version_label_snapshot, unit_amount_centavos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [orderId, actor.userId, item.productId, item.methodologyId, item.versionId, item.priceId, item.offerRevision, item.title, item.versionLabel, item.amount])
          checkpoint('ITEM_CREATED', index)
        }
        await audit(db, actor, 'ORDER_CREATED', orderId)
        await remember(db, actor, 'CHECKOUT_SIMULATION', key, hash, orderId)
        return detail(db, await ownOrder(db, orderId, actor.userId, true), now(), true)
      })
    },
    async confirm(actor: Actor, orderId: string, key: string) {
      const hash = requestHash('CONFIRM_SIMULATION', orderId, { demoAcknowledged: true })
      return write(actor, async db => {
        const cart = await lockCart(db, actor.userId)
        const order = await ownOrder(db, orderId, actor.userId, true)
        const previous = await replay(db, actor, 'CONFIRM_SIMULATION', key, hash)
        if (previous) return previous
        if (order.status === 'COMPLETED_SIMULATED') {
          await remember(db, actor, 'CONFIRM_SIMULATION', key, hash, orderId)
          return detail(db, order, now(), true)
        }
        if (await expire(db, actor, order)) return new AppError(409, 'ORDER_EXPIRED', 'O prazo de confirmação encerrou. Nenhuma aquisição foi concluída.')
        if (order.status !== 'PENDING_CONFIRMATION') throw new AppError(409, order.status === 'EXPIRED' ? 'ORDER_EXPIRED' : 'ORDER_STATE', 'Pedido cancelado ou expirado não pode ser confirmado.')
        const items = await rows(db, 'SELECT * FROM order_items WHERE order_id = ? AND user_id = ? ORDER BY product_id FOR SHARE', [orderId, actor.userId])
        if (!items.length || items.length > 100) throw new AppError(409, 'ORDER_INVALID', 'Pedido inconsistente; confirmação bloqueada.')
        const current = await snapshot(db, items.map(row => String(row.product_id)), actor.userId)
        let total = 0n
        for (const item of items) {
          const found = current.find(row => row.productId === String(item.product_id))
          if (!found || found.methodologyId !== String(item.methodology_id) || found.priceId !== String(item.price_id) || found.versionId !== String(item.methodology_version_id) || found.offerRevision !== Number(item.offer_revision_snapshot) || found.amount !== String(item.unit_amount_centavos) || Number(item.quantity) !== 1) throw new AppError(409, 'OFFER_CHANGED', 'Preço, versão ou oferta mudou. Cancele esta revisão e crie outra com os valores atuais.')
          total += BigInt(item.unit_amount_centavos)
        }
        if (total.toString() !== String(order.total_centavos)) throw new AppError(409, 'ORDER_INVALID', 'Total inconsistente; confirmação bloqueada.')
        checkpoint('OFFERS_VALIDATED')
        if (await expire(db, actor, order)) return new AppError(409, 'ORDER_EXPIRED', 'O prazo de confirmação encerrou. Nenhuma aquisição foi concluída.')
        const completed = date(now())
        await db.execute("UPDATE orders SET status = 'COMPLETED_SIMULATED', completed_at = ? WHERE id = ?", [completed, orderId])
        checkpoint('ORDER_COMPLETED')
        for (const [index, item] of items.entries()) {
          await db.execute("INSERT INTO entitlements (user_id, methodology_id, order_item_id, status, granted_at) VALUES (?, ?, ?, 'ACTIVE', ?)", [actor.userId, String(item.methodology_id), String(item.id), completed])
          checkpoint('ENTITLEMENT_CREATED', index)
        }
        if (cart) {
          const [removed] = await db.execute<ResultSetHeader>('DELETE FROM cart_items WHERE cart_id = ? AND product_id IN (' + placeholders(items.length) + ')', [String(cart.id), ...items.map(row => String(row.product_id))])
          if (removed.affectedRows) {
            if (Number(cart.revision) >= 2147483647) throw new AppError(409, 'REVISION_LIMIT', 'Limite de revisões do carrinho atingido.')
            await db.execute('UPDATE carts SET revision = revision + 1, updated_at = UTC_TIMESTAMP(6) WHERE id = ?', [String(cart.id)])
          }
        }
        checkpoint('CART_UPDATED')
        await audit(db, actor, 'ORDER_COMPLETED_SIMULATED', orderId)
        checkpoint('AUDIT_RECORDED')
        await remember(db, actor, 'CONFIRM_SIMULATION', key, hash, orderId)
        return detail(db, await ownOrder(db, orderId, actor.userId, true), now(), true)
      })
    },
    async cancel(actor: Actor, orderId: string) {
      return write(actor, async db => {
        await lockCart(db, actor.userId)
        const order = await ownOrder(db, orderId, actor.userId, true)
        if (order.status === 'COMPLETED_SIMULATED') throw new AppError(409, 'ORDER_STATE', 'Aquisição simulada concluída não pode ser cancelada por esta operação.')
        if (await expire(db, actor, order)) return detail(db, await ownOrder(db, orderId, actor.userId, true), now(), true)
        if (order.status === 'PENDING_CONFIRMATION') {
          await db.execute("UPDATE orders SET status = 'CANCELLED', cancelled_at = ? WHERE id = ?", [date(now()), orderId])
          await audit(db, actor, 'ORDER_CANCELLED', orderId)
        }
        return detail(db, await ownOrder(db, orderId, actor.userId, true), now(), true)
      })
    },
    get: (actor: Actor, orderId: string) => boundary(() => withTransaction(pool, async db => detail(db, await ownOrder(db, orderId, actor.userId), now()), true)),
    list: (actor: Actor, page: number, pageSize: number) => boundary(() => withTransaction(pool, async db => {
      const [count] = await rows(db, 'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [actor.userId])
      const found = await rows(db, 'SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count FROM orders o WHERE o.user_id = ? ORDER BY o.id DESC LIMIT ? OFFSET ?', [actor.userId, pageSize, (page - 1) * pageSize])
      const at = now()
      return { data: found.map(row => summary(row, Number(row.item_count), at)), total: Number(count?.total ?? 0), page, pageSize }
    }, true)),
  }
}
export type CheckoutRepository = ReturnType<typeof createCheckoutRepository>
