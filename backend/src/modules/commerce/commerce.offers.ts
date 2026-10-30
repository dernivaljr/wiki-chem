import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import type { Offer } from './commerce.contracts.js'
export type Db = Pool | PoolConnection
export const rows = async (db: Db, sql: string, values: (string | number | boolean | null)[] = []) => (await db.execute<RowDataPacket[]>(sql, values))[0]
const slots = (ids: string[]) => ids.map(() => '?').join(', ')
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
