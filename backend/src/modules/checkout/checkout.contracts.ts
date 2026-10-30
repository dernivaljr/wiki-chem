import { z } from 'zod'
import { id, revision } from '../../shared/identifiers.js'
import { amountCentavos } from '../commerce/commerce.contracts.js'
export const creationInput = z.strictObject({ cartRevision: revision })
export const confirmationInput = z.strictObject({ demoAcknowledged: z.literal(true) })
export const idempotencyKey = z.uuid().transform(value => value.toLowerCase())
export const idempotencyHeaders = z.looseObject({ 'idempotency-key': idempotencyKey })
export const orderStatus = z.enum(['PENDING_CONFIRMATION', 'COMPLETED_SIMULATED', 'CANCELLED', 'EXPIRED'])
export const orderSummary = z.strictObject({
  id, status: orderStatus, mode: z.literal('SIMULATED'), currency: z.literal('BRL'), totalCentavos: amountCentavos,
  cartRevisionSnapshot: revision, createdAt: z.string(), expiresAt: z.string(), completedAt: z.string().nullable(), cancelledAt: z.string().nullable(),
  itemCount: z.number().int().min(1).max(100), serverTime: z.string(),
})
export const orderItem = z.strictObject({
  id, productId: id, methodologyId: id, methodologyVersionId: id, priceId: id,
  titleSnapshot: z.string(), versionLabelSnapshot: z.string(), unitAmountCentavos: amountCentavos, lineTotalCentavos: amountCentavos, quantity: z.literal(1),
})
export const orderDetail = orderSummary.extend({ items: z.array(orderItem).min(1).max(100) })
export type OrderDetail = z.infer<typeof orderDetail>
export type OrderSummary = z.infer<typeof orderSummary>
export type Operation = 'CHECKOUT_SIMULATION' | 'CONFIRM_SIMULATION'
