import type { AuthValue } from '../auth/AuthContext'
import type { OrderDetail } from './types'
export interface Intent { key: string; cartRevision: number; orderId?: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const createName = (userId: string) => 'wikichem-demo-create:' + userId
const confirmName = (userId: string, orderId: string) => 'wikichem-demo-confirm:' + userId + ':' + orderId
const storageError = () => new Error('Não foi possível preservar a intenção de demonstração neste navegador. Consulte seus pedidos; nenhuma nova chave será enviada automaticamente.')
export function readIntent(userId: string): Intent | null {
  try {
    const raw = localStorage.getItem(createName(userId))
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || typeof value.key !== 'string' || !uuid.test(value.key) || !Number.isInteger(value.cartRevision) || value.cartRevision < 1 || (value.orderId !== undefined && !/^[1-9][0-9]{0,19}$/.test(value.orderId))) throw storageError()
    return { key: value.key, cartRevision: value.cartRevision, ...(value.orderId ? { orderId: value.orderId } : {}) }
  } catch { throw storageError() }
}
export async function locked<T>(name: string, work: () => Promise<T>): Promise<T> {
  if (navigator.locks) return navigator.locks.request('wikichem-demo:' + name, work)
  return work()
}
export async function begin(request: AuthValue['request'], userId: string, cartRevision: number) {
  return locked('create:' + userId, async () => {
    let intent = readIntent(userId)
    if (!intent) {
      intent = { key: crypto.randomUUID(), cartRevision }
      try { localStorage.setItem(createName(userId), JSON.stringify(intent)) } catch { throw storageError() }
    }
    const order = await request<OrderDetail>('/checkout/simulations', { method: 'POST', idempotencyKey: intent.key, body: { cartRevision: intent.cartRevision } })
    // A chave já está persistida: mesmo se esta atualização falhar, o replay
    // continua recuperável sem gerar uma intenção nova.
    try { localStorage.setItem(createName(userId), JSON.stringify({ ...intent, orderId: order.id })) } catch { /* Recuperação permanece pela chave existente. */ }
    return order
  })
}
export async function confirmIntent(request: AuthValue['request'], userId: string, orderId: string) {
  return locked('confirm:' + userId + ':' + orderId, async () => {
    let key: string
    try {
      const stored = localStorage.getItem(confirmName(userId, orderId))
      if (stored && !uuid.test(stored)) throw storageError()
      key = stored ?? crypto.randomUUID()
      if (!stored) localStorage.setItem(confirmName(userId, orderId), key)
    } catch { throw storageError() }
    return request<OrderDetail>('/orders/' + orderId + '/confirm-simulation', { method: 'POST', idempotencyKey: key, body: { demoAcknowledged: true } })
  })
}
export function clearRejected(userId: string, expectedKey: string) {
  if (readIntent(userId)?.key === expectedKey) localStorage.removeItem(createName(userId))
}
export function releaseCompleted(userId: string, orderId: string) {
  if (readIntent(userId)?.orderId === orderId) localStorage.removeItem(createName(userId))
  localStorage.removeItem(confirmName(userId, orderId))
}
