import { z } from 'zod'

export const emptyQuery = z.strictObject({})
export const healthResponse = z.strictObject({
  data: z.strictObject({ status: z.literal('ok') }),
})
export const databaseResponse = z.strictObject({
  data: z.strictObject({ status: z.literal('available') }),
})
export const errorResponse = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    details: z.array(z.strictObject({ field: z.string(), reason: z.string() })),
    requestId: z.uuid(),
  }),
})
