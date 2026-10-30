import { z } from 'zod'
import { id, revision } from '../../shared/identifiers.js'
export const maxPrice = 9223372036854775807n
export const amountCentavos = z.string().regex(/^[1-9][0-9]{0,18}$/).refine(value => /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= maxPrice, 'Valor fora do limite de armazenamento')
const total = z.string().regex(/^(0|[1-9][0-9]{0,20})$/)
export const offerSchema = z.strictObject({ productId: id, revision, active: z.boolean(), priceId: id.nullable(), amountCentavos: amountCentavos.nullable(), currency: z.literal('BRL'), available: z.boolean(), reason: z.enum(['INACTIVE', 'NO_PRICE', 'CONTENT_UNAVAILABLE']).nullable() })
export type Offer = z.infer<typeof offerSchema>
export const productInput = z.strictObject({ methodologyId: id })
export const productPatch = z.strictObject({ expectedRevision: revision, active: z.boolean() })
export const priceInput = z.strictObject({ expectedRevision: revision, amountCentavos, currency: z.literal('BRL') })
export const priceSchema = z.strictObject({ id, productId: id, amountCentavos, currency: z.literal('BRL'), createdBy: id, createdAt: z.string() })
export const productSchema = z.strictObject({ id, methodologyId: id, slug: z.string(), title: z.string(), active: z.boolean(), revision, offer: offerSchema })
export type Product = z.infer<typeof productSchema>
export const cartAdd = z.strictObject({ expectedRevision: revision, offerRevision: revision, priceId: id, versionId: id })
export const cartRemove = z.strictObject({ expectedRevision: z.coerce.number().int().positive().max(2147483647) })
export const cartItemSchema = z.strictObject({
  owned: z.boolean(),
  productId: id, methodologyId: id, title: z.string(), quantity: z.literal(1),
  observedPriceId: id, observedAmountCentavos: amountCentavos, observedVersionId: id, observedVersionLabel: z.string(),
  currentVersionId: id.nullable(), currentVersionLabel: z.string().nullable(), offer: offerSchema,
  issues: z.array(z.enum(['PRICE_CHANGED', 'VERSION_CHANGED', 'OFFER_CHANGED', 'UNAVAILABLE', 'ALREADY_OWNED'])),
})
export const cartSchema = z.strictObject({ revision, items: z.array(cartItemSchema).max(100), currency: z.literal('BRL'), totalCentavos: total, unavailableCount: z.number().int().nonnegative() })
export type Cart = z.infer<typeof cartSchema>
