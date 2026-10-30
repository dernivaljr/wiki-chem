import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import type { Offer } from './commerce.contracts.js'
import { previewColumns, publishedFrom, publishedWhere } from '../catalog/catalog.search.js'
export type Db = Pool | PoolConnection
export const rows = async (db: Db, sql: string, values: (string | number | boolean | null)[] = []) => (await db.execute<RowDataPacket[]>(sql, values))[0]
const slots = (ids: string[]) => ids.map(() => '?').join(', ')
export async function ownedMethods(db: Db, userId: string, ids: string[], lock = false) {
  if (!ids.length) return new Set<string>()
  const found = await rows(db, 'SELECT methodology_id FROM entitlements WHERE user_id = ? AND methodology_id IN (' + slots(ids) + ') ORDER BY methodology_id' + (lock ? ' FOR SHARE' : ''), [userId, ...ids])
  // ACTIVE e REVOKED impedem recompra; revogação não concede nova aquisição.
  return new Set(found.map(row => String(row.methodology_id)))
}
export async function currentVersions(db: PoolConnection, ids: string[], lock = false) {
  if (!ids.length) return new Map<string, RowDataPacket>()
  if (!lock) {
    const found = await rows(db, 'SELECT ' + previewColumns + publishedFrom + ' WHERE m.id IN (' + slots(ids) + ') AND ' + publishedWhere + ' ORDER BY m.id', ids)
    return new Map(found.map(row => [String(row.methodology_id), row]))
  }
  // Leituras correntes explícitas, inclusive de origens: uma publicação que
  // terminou enquanto aguardávamos o produto não pode usar snapshot anterior.
  const methods = await rows(db, 'SELECT id, lifecycle, deleted_at, current_published_version_id FROM methodologies WHERE id IN (' + slots(ids) + ') ORDER BY id FOR SHARE', ids)
  const versionIds = methods.filter(row => row.current_published_version_id !== null).map(row => String(row.current_published_version_id))
  if (!versionIds.length) return new Map<string, RowDataPacket>()
  const versions = await rows(db, 'SELECT id, methodology_id, title, version_label, free_summary, public_description, editorial_status, access_state, deleted_at FROM methodology_versions WHERE id IN (' + slots(versionIds) + ') ORDER BY id FOR SHARE', versionIds)
  const sources = await rows(db, 'SELECT version_id, permission_status FROM version_sources WHERE version_id IN (' + slots(versionIds) + ') ORDER BY version_id, source_id FOR SHARE', versionIds)
  const result = new Map<string, RowDataPacket>()
  for (const method of methods) {
    const version = versions.find(row => String(row.id) === String(method.current_published_version_id) && String(row.methodology_id) === String(method.id))
    const origins = sources.filter(row => String(row.version_id) === String(method.current_published_version_id))
    if (method.deleted_at === null && method.lifecycle === 'PUBLISHED' && version?.deleted_at === null && version.editorial_status === 'PUBLISHED' && version.access_state === 'ALLOWED' && origins.length && origins.every(row => row.permission_status === 'APPROVED')) result.set(String(method.id), version)
  }
  return result
}
// Compartilhado por oferta, carrinho e publicação editorial: produto antes de metodologia.
export async function lockProductForMethod(db: Db, methodologyId: string) {
  await rows(db, 'SELECT id FROM products WHERE methodology_id = ? FOR UPDATE', [methodologyId])
}
export async function loadOffers(db: Db, methodologyIds: string[], currentRead = false): Promise<Map<string, Offer>> {
  if (!methodologyIds.length) return new Map()
  const found = await rows(db, 'SELECT p.id, p.methodology_id, p.active, p.revision, pp.id AS price_id, pp.amount_centavos FROM products p LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.id = p.current_price_id WHERE p.methodology_id IN (' + slots(methodologyIds) + ') ORDER BY p.id' + (currentRead ? ' FOR SHARE' : ''), methodologyIds)
  return new Map(found.map(row => {
    const reason = !row.active ? 'INACTIVE' as const : row.price_id === null ? 'NO_PRICE' as const : null
    return [String(row.methodology_id), { productId: String(row.id), revision: Number(row.revision), active: Boolean(row.active), priceId: row.price_id === null ? null : String(row.price_id), amountCentavos: row.amount_centavos === null ? null : String(row.amount_centavos), currency: 'BRL', available: reason === null, reason }]
  }))
}
