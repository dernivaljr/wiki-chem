import { z } from 'zod'

export const displayName = z.string().trim().min(1).max(100).refine(value => [...value].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127), 'Caracteres de controle não permitidos')
export const email = z.string().trim().toLowerCase().max(254).regex(/^[\x20-\x7e]+$/).pipe(z.email())
export const password = z.string().min(12).max(128)
export const registerInput = z.strictObject({ displayName, email, password })
export const loginInput = z.strictObject({ email, password })
export const profileInput = z.strictObject({ displayName })
export const userSchema = z.strictObject({
  id: z.string().regex(/^\d+$/), displayName, email,
  role: z.enum(['CUSTOMER', 'ADMIN']), status: z.literal('ACTIVE'),
})
export type User = z.infer<typeof userSchema>
export const userResponse = z.strictObject({ data: userSchema })
export const sessionResponse = z.strictObject({ data: z.strictObject({
  user: userSchema, csrfToken: z.string().regex(/^[a-f0-9]{64}$/), expiresAt: z.iso.datetime(),
}) })
