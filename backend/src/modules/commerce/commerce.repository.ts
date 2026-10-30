import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import { withTransaction } from '../../database/pool.js'
import { AppError } from '../../shared/errors.js'
import type { Actor } from '../identity/access.js'
import { placeholders } from '../catalog/catalog.search.js'
import { currentVersions, loadOffers, lockProductForMethod, ownedMethods, rows } from './commerce.offers.js'
import type { Cart, Offer, Product } from './commerce.contracts.js'

type Row = RowDataPacket
const missing = () => new AppError(404, 'NOT_FOUND', 'Produto não encontrado.')
const conflict = () => new AppError(409, 'REVISION_CONFLICT', 'O registro foi alterado. Recarregue antes de continuar.')
function expected(row: Row, value: number) {
  if (Number(row.revision) !== value) throw conflict()
  if (value >= 2147483647) throw new AppError(409, 'REVISION_LIMIT', 'Limite de revisões atingido.')
}
const iso = (value: string) => new Date(value.replace(' ', 'T') + 'Z').toISOString()
async function boundary<T>(work: () => Promise<T>): Promise<T> {
  try { return await work() } catch (error) {
    if (error instanceof AppError) throw error
    const code = (error as { code?: string }).code
    if (code === 'ER_DUP_ENTRY') throw new AppError(409, 'DUPLICATE_PRODUCT', 'Esta metodologia já possui um produto.')
    if (code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT') throw new AppError(409, 'EDIT_CONFLICT', 'Edição concorrente. Recarregue e tente novamente.')
    if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_ROW_IS_REFERENCED_2') throw new AppError(409, 'REFERENCE_CONFLICT', 'Vínculo inválido; histórico preservado.')
    throw new AppError(503, 'COMMERCE_UNAVAILABLE', 'Ofertas e carrinho temporariamente indisponíveis.')
  }
}
async function audit(db: PoolConnection, actor: Actor, action: string, type: string, id: string) {
  await db.execute('INSERT INTO audit_events (actor_user_id, action, target_type, target_id, request_id, occurred_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(6))', [actor.userId, action, type, id, actor.requestId])
}
function effective(offer: Offer, availableContent: boolean): Offer {
  return availableContent ? offer : { ...offer, available: false, reason: 'CONTENT_UNAVAILABLE' }
}
async function productRow(db: PoolConnection, id: string, lock = false) {
  const [row] = await rows(db, 'SELECT * FROM products WHERE id = ?' + (lock ? ' FOR UPDATE' : ''), [id])
  if (!row) throw missing()
  return row
}
async function productDto(db: PoolConnection, row: Row, lock = false): Promise<Product> {
  const methodologyId = String(row.methodology_id)
  const versions = await currentVersions(db, [methodologyId], lock)
  const [method] = await rows(db, 'SELECT slug FROM methodologies WHERE id = ?' + (lock ? ' FOR SHARE' : ''), [methodologyId])
  const offer = (await loadOffers(db, [methodologyId], lock)).get(methodologyId)!
  return { id: String(row.id), methodologyId, slug: method?.slug ?? '', title: versions.get(methodologyId)?.title ?? method?.slug ?? '', active: Boolean(row.active), revision: Number(row.revision), offer: effective(offer, versions.has(methodologyId)) }
}
async function cartView(db: PoolConnection, userId: string, lock = false): Promise<Cart> {
  const [cart] = await rows(db, 'SELECT id, revision FROM carts WHERE user_id = ?' + (lock ? ' FOR UPDATE' : ''), [userId])
  if (!cart) return { revision: 1, items: [], currency: 'BRL', totalCentavos: '0', unavailableCount: 0 }
  const items = await rows(db, 'SELECT ci.*, pp.amount_centavos AS observed_amount FROM cart_items ci JOIN product_prices pp ON pp.id = ci.observed_price_id AND pp.product_id = ci.product_id WHERE ci.cart_id = ? ORDER BY ci.product_id' + (lock ? ' FOR SHARE' : ''), [String(cart.id)])
  const methodIds = items.map(item => String(item.methodology_id))
  const versions = await currentVersions(db, methodIds, lock), offers = await loadOffers(db, methodIds, lock)
  const owned = await ownedMethods(db, userId, methodIds, lock)
  let total = 0n, unavailableCount = 0
  const mapped = items.map(item => {
    const methodId = String(item.methodology_id), version = versions.get(methodId)
    const offer = effective(offers.get(methodId)!, Boolean(version))
    const issues: Cart['items'][number]['issues'] = []
    if (offer.priceId !== String(item.observed_price_id)) issues.push('PRICE_CHANGED')
    if (version && String(version.id) !== String(item.observed_version_id)) issues.push('VERSION_CHANGED')
    if (offer.revision !== Number(item.observed_offer_revision)) issues.push('OFFER_CHANGED')
    if (!offer.available) { issues.push('UNAVAILABLE'); unavailableCount++ }
    else if (!owned.has(methodId)) total += BigInt(offer.amountCentavos!)
    if (owned.has(methodId)) { issues.push('ALREADY_OWNED'); if (offer.available) unavailableCount++ }
    return { owned: owned.has(methodId), productId: String(item.product_id), methodologyId: methodId, title: version?.title ?? item.title_snapshot, quantity: 1 as const,
      observedPriceId: String(item.observed_price_id), observedAmountCentavos: String(item.observed_amount), observedVersionId: String(item.observed_version_id), observedVersionLabel: item.version_label_snapshot,
      currentVersionId: version ? String(version.id) : null, currentVersionLabel: version?.version_label ?? null, offer, issues }
  })
  return { revision: Number(cart.revision), items: mapped, currency: 'BRL', totalCentavos: total.toString(), unavailableCount }
}
export function createCommerceRepository(pool: Pool) {
  const write = <T>(actor: Actor, admin: boolean, work: (db: PoolConnection) => Promise<T>) => boundary(() => withTransaction(pool, async db => {
    const [user] = await rows(db, 'SELECT role, status FROM users WHERE id = ? FOR UPDATE', [actor.userId])
    if (!user || user.status !== 'ACTIVE' || (admin && user.role !== 'ADMIN')) throw new AppError(403, 'FORBIDDEN', 'Ação não permitida.')
    return work(db)
  }))
  return {
    async listProducts(page: number, pageSize: number, methodologyId?: string) {
      return boundary(() => withTransaction(pool, async db => {
        const where = methodologyId ? ' WHERE methodology_id = ?' : '', params = methodologyId ? [methodologyId] : []
        const [count] = await rows(db, 'SELECT COUNT(*) AS total FROM products' + where, params)
        const found = await rows(db, 'SELECT * FROM products' + where + ' ORDER BY id DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize])
        const data: Product[] = []
        for (const row of found) data.push(await productDto(db, row))
        return { data, total: Number(count?.total ?? 0), page, pageSize }
      }, true))
    },
    getProduct: (id: string) => boundary(() => withTransaction(pool, async db => productDto(db, await productRow(db, id)), true)),
    async createProduct(methodologyId: string, actor: Actor) {
      return write(actor, true, async db => {
        await lockProductForMethod(db, methodologyId)
        const [method] = await rows(db, 'SELECT id FROM methodologies WHERE id = ? AND deleted_at IS NULL FOR SHARE', [methodologyId])
        if (!method) throw new AppError(404, 'NOT_FOUND', 'Metodologia não encontrada.')
        await db.execute('INSERT INTO products (methodology_id, created_at, updated_at) VALUES (?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))', [methodologyId])
        const [row] = await rows(db, 'SELECT * FROM products WHERE methodology_id = ? FOR UPDATE', [methodologyId])
        if (!row) throw missing()
        await audit(db, actor, 'PRODUCT_CREATED', 'product', String(row.id))
        return productDto(db, row, true)
      })
    },
    async updateProduct(id: string, input: { expectedRevision: number; active: boolean }, actor: Actor) {
      return write(actor, true, async db => {
        const row = await productRow(db, id, true); expected(row, input.expectedRevision)
        const product = await productDto(db, row, true)
        if (input.active && (!product.offer.priceId || product.offer.reason === 'CONTENT_UNAVAILABLE')) throw new AppError(409, 'OFFER_INCOMPLETE', 'Ativação exige preço e versão publicada com condições de uso aprovadas.')
        if (Boolean(row.active) === input.active) return product
        await db.execute('UPDATE products SET active = ?, revision = revision + 1, updated_at = UTC_TIMESTAMP(6) WHERE id = ?', [input.active, id])
        await audit(db, actor, input.active ? 'OFFER_ACTIVATED' : 'OFFER_DEACTIVATED', 'product', id)
        return productDto(db, await productRow(db, id, true), true)
      })
    },
    async createPrice(id: string, input: { expectedRevision: number; amountCentavos: string; currency: 'BRL' }, actor: Actor) {
      return write(actor, true, async db => {
        const row = await productRow(db, id, true); expected(row, input.expectedRevision)
        const product = await productDto(db, row, true)
        const [method] = await rows(db, 'SELECT deleted_at FROM methodologies WHERE id = ? FOR SHARE', [product.methodologyId])
        if (method?.deleted_at || (product.active && product.offer.reason === 'CONTENT_UNAVAILABLE')) throw new AppError(409, 'CONTENT_UNAVAILABLE', 'Desative a oferta e revise a disponibilidade editorial antes de cadastrar preço.')
        await db.execute('INSERT INTO product_prices (product_id, amount_centavos, currency, created_by, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))', [id, input.amountCentavos, input.currency, actor.userId])
        const [last] = await rows(db, 'SELECT LAST_INSERT_ID() AS id')
        await db.execute('UPDATE products SET current_price_id = ?, revision = revision + 1, updated_at = UTC_TIMESTAMP(6) WHERE id = ?', [String(last?.id), id])
        await audit(db, actor, 'PRICE_CREATED', 'price', String(last?.id))
        return productDto(db, await productRow(db, id, true), true)
      })
    },
    async listPrices(id: string, page: number, pageSize: number) {
      return boundary(() => withTransaction(pool, async db => {
        await productRow(db, id)
        const [count] = await rows(db, 'SELECT COUNT(*) AS total FROM product_prices WHERE product_id = ?', [id])
        const found = await rows(db, 'SELECT * FROM product_prices WHERE product_id = ? ORDER BY id DESC LIMIT ? OFFSET ?', [id, pageSize, (page - 1) * pageSize])
        return { data: found.map(row => ({ id: String(row.id), productId: String(row.product_id), amountCentavos: String(row.amount_centavos), currency: 'BRL' as const, createdBy: String(row.created_by), createdAt: iso(row.created_at) })), total: Number(count?.total ?? 0), page, pageSize }
      }, true))
    },
    getCart: (userId: string) => boundary(() => withTransaction(pool, db => cartView(db, userId), true)),
    async changeCart(actor: Actor, productId: string, expectedRevision: number, addition?: { offerRevision: number; priceId: string; versionId: string }) {
      return write(actor, false, async db => {
        await db.execute('INSERT INTO carts (user_id, created_at, updated_at) VALUES (?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE user_id = user_id', [actor.userId])
        const [cart] = await rows(db, 'SELECT id, revision FROM carts WHERE user_id = ? FOR UPDATE', [actor.userId])
        if (!cart) throw new Error('CART_MISSING')
        expected(cart, expectedRevision)
        const existing = await rows(db, 'SELECT product_id FROM cart_items WHERE cart_id = ? ORDER BY product_id FOR UPDATE', [String(cart.id)])
        const ids = [...new Set([...existing.map(item => String(item.product_id)), productId])].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1)
        const locked = await rows(db, 'SELECT * FROM products WHERE id IN (' + placeholders(ids.length) + ') ORDER BY id FOR UPDATE', ids)
        const present = existing.some(item => String(item.product_id) === productId)
        if (addition) {
          const product = locked.find(row => String(row.id) === productId)
          if (!product) throw missing()
          if ((await ownedMethods(db, actor.userId, [String(product.methodology_id)], true)).size) throw new AppError(409, 'ALREADY_OWNED', 'Aquisição simulada já registrada para esta metodologia. Consulte seus pedidos.')
          const versions = await currentVersions(db, locked.map(row => String(row.methodology_id)), true)
          const offer = (await loadOffers(db, [String(product.methodology_id)], true)).get(String(product.methodology_id))!
          const version = versions.get(String(product.methodology_id))
          if (!offer.available || !version) throw new AppError(409, 'OFFER_UNAVAILABLE', 'Oferta indisponível. Recarregue a pesquisa.')
          if (offer.revision !== addition.offerRevision || offer.priceId !== addition.priceId || String(version.id) !== addition.versionId) throw new AppError(409, 'OFFER_CHANGED', 'Preço, versão ou disponibilidade mudou. Recarregue a prévia antes de adicionar.')
          if (!present) {
            if (existing.length >= 100) throw new AppError(409, 'CART_LIMIT', 'O carrinho permite até 100 produtos.')
            await db.execute('INSERT INTO cart_items (cart_id, product_id, methodology_id, observed_price_id, observed_version_id, observed_offer_revision, title_snapshot, version_label_snapshot, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6))', [String(cart.id), productId, String(product.methodology_id), offer.priceId, String(version.id), offer.revision, version.title, version.version_label])
          }
        } else if (present) await db.execute('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [String(cart.id), productId])
        if (addition ? !present : present) {
          await db.execute('UPDATE carts SET revision = revision + 1, updated_at = UTC_TIMESTAMP(6) WHERE id = ?', [String(cart.id)])
          await audit(db, actor, addition ? 'CART_ITEM_ADDED' : 'CART_ITEM_REMOVED', 'cart', String(cart.id))
        }
        return cartView(db, actor.userId, true)
      })
    },
  }
}
export type CommerceRepository = ReturnType<typeof createCommerceRepository>
