import { ApiError } from '../auth/api'
import type { AuthValue } from '../auth/AuthContext'
import type { Page } from '../catalog/types'
import type { OrderDetail, OrderSummary, PaymentMethod } from './types'
import { paymentMethods } from './types'

export interface Intent {
  key: string
  cartRevision: number
  orderId?: string
}

export interface ConfirmIntent {
  key: string
  paymentMethod: PaymentMethod
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const createName = (userId: string) => 'wikichem-demo-create:' + userId
const confirmName = (userId: string, orderId: string) => 'wikichem-demo-confirm:' + userId + ':' + orderId
const deterministicCreateErrors = new Set([
  'CART_CHANGED',
  'EMPTY_CART',
  'PRODUCT_UNAVAILABLE',
  'ALREADY_OWNED',
  'ORDER_TOTAL_LIMIT',
  'CART_LIMIT',
])

const storageError = () =>
  new Error(
    'Não foi possível preservar a intenção de demonstração neste navegador. Consulte seus pedidos; nenhuma nova chave será enviada automaticamente.',
  )

const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  typeof value === 'string' && (paymentMethods as readonly string[]).includes(value)

export function readIntent(userId: string): Intent | null {
  try {
    const raw = localStorage.getItem(createName(userId))
    if (!raw) return null
    const value = JSON.parse(raw)
    if (
      !value ||
      typeof value.key !== 'string' ||
      !uuid.test(value.key) ||
      !Number.isInteger(value.cartRevision) ||
      value.cartRevision < 1 ||
      (value.orderId !== undefined && !/^[1-9][0-9]{0,19}$/.test(value.orderId))
    ) {
      throw storageError()
    }
    return { key: value.key, cartRevision: value.cartRevision, ...(value.orderId ? { orderId: value.orderId } : {}) }
  } catch {
    throw storageError()
  }
}

export function readConfirmIntent(userId: string, orderId: string): ConfirmIntent | null {
  try {
    const raw = localStorage.getItem(confirmName(userId, orderId))
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || typeof value.key !== 'string' || !uuid.test(value.key) || !isPaymentMethod(value.paymentMethod)) {
      throw storageError()
    }
    return { key: value.key, paymentMethod: value.paymentMethod }
  } catch {
    throw storageError()
  }
}

export async function locked<T>(name: string, work: () => Promise<T>): Promise<T> {
  if (navigator.locks) return navigator.locks.request('wikichem-demo:' + name, work)
  return work()
}

export async function reconcileIntent(
  request: AuthValue['request'],
  userId: string,
  cartRevision: number,
): Promise<Intent | null> {
  const intent = readIntent(userId)
  if (!intent) return null

  if (intent.orderId) {
    try {
      const order = await request<OrderDetail>('/orders/' + intent.orderId)
      if (order.status !== 'PENDING_CONFIRMATION') {
        releaseCompleted(userId, intent.orderId, order.cartRevisionSnapshot)
        return null
      }
      if (intent.cartRevision !== cartRevision) {
        clearRejected(userId, intent.key)
        return null
      }
      return intent
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        releaseCompleted(userId, intent.orderId)
        return null
      }
      if (error instanceof ApiError && error.status === 401) throw error
      return intent
    }
  }

  try {
    const history = await request<Page<OrderSummary>>('/orders?page=1', { includeMeta: true })
    const matching = history.data.find(item => item.cartRevisionSnapshot === intent.cartRevision)
    if (matching && matching.status !== 'PENDING_CONFIRMATION') {
      releaseCompleted(userId, matching.id, matching.cartRevisionSnapshot)
      return null
    }
    return intent
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error
    return intent
  }
}

export async function begin(request: AuthValue['request'], userId: string, cartRevision: number) {
  return locked('create:' + userId, async () => {
    let intent = readIntent(userId)
    if (intent?.orderId && intent.cartRevision !== cartRevision) {
      localStorage.removeItem(createName(userId))
      intent = null
    }
    if (!intent) {
      intent = { key: crypto.randomUUID(), cartRevision }
      try {
        localStorage.setItem(createName(userId), JSON.stringify(intent))
      } catch {
        throw storageError()
      }
    }

    let order: OrderDetail
    try {
      order = await request<OrderDetail>('/checkout/simulations', {
        method: 'POST',
        idempotencyKey: intent.key,
        body: { cartRevision: intent.cartRevision },
      })
    } catch (error) {
      if (error instanceof ApiError && deterministicCreateErrors.has(error.code) && !intent.orderId) {
        clearRejected(userId, intent.key)
      }
      throw error
    }

    if (order.status !== 'PENDING_CONFIRMATION') {
      releaseCompleted(userId, order.id, order.cartRevisionSnapshot)
      intent = { key: crypto.randomUUID(), cartRevision }
      try {
        localStorage.setItem(createName(userId), JSON.stringify(intent))
      } catch {
        throw storageError()
      }
      order = await request<OrderDetail>('/checkout/simulations', {
        method: 'POST',
        idempotencyKey: intent.key,
        body: { cartRevision: intent.cartRevision },
      })
    }

    try {
      localStorage.setItem(createName(userId), JSON.stringify({ ...intent, orderId: order.id }))
    } catch {
      /* Recuperação permanece pela chave existente. */
    }
    return order
  })
}

export async function confirmIntent(
  request: AuthValue['request'],
  userId: string,
  orderId: string,
  paymentMethod: PaymentMethod,
) {
  return locked('confirm:' + userId + ':' + orderId, async () => {
    const existing = readConfirmIntent(userId, orderId)
    if (existing && existing.paymentMethod !== paymentMethod) {
      throw new ApiError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'A tentativa de confirmação em aberto para este pedido preserva a forma de pagamento selecionada originalmente.',
      )
    }
    const key = existing?.key ?? crypto.randomUUID()
    if (!existing) {
      try {
        localStorage.setItem(confirmName(userId, orderId), JSON.stringify({ key, paymentMethod }))
      } catch {
        throw storageError()
      }
    }
    const result = await request<OrderDetail>('/orders/' + orderId + '/confirm-simulation', {
      method: 'POST',
      idempotencyKey: key,
      body: { demoAcknowledged: true, paymentMethod },
    })
    if (result.status !== 'PENDING_CONFIRMATION') {
      try {
        releaseCompleted(userId, orderId, result.cartRevisionSnapshot)
      } catch {
        /* Estado confirmado no servidor prevalece sobre limpeza local. */
      }
    }
    return result
  })
}

export function clearRejected(userId: string, expectedKey: string) {
  if (readIntent(userId)?.key === expectedKey) localStorage.removeItem(createName(userId))
}

export function releaseCompleted(userId: string, orderId: string, cartRevisionSnapshot?: number) {
  const current = readIntent(userId)
  if (
    current &&
    (current.orderId === orderId ||
      (!current.orderId && cartRevisionSnapshot !== undefined && current.cartRevision === cartRevisionSnapshot))
  ) {
    localStorage.removeItem(createName(userId))
  }
  localStorage.removeItem(confirmName(userId, orderId))
}
