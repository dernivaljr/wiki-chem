import { z } from 'zod'
export const id = z.string().regex(/^[1-9][0-9]{0,19}$/).refine(value => /^[1-9][0-9]{0,19}$/.test(value) && BigInt(value) <= 18446744073709551615n)
export const revision = z.number().int().positive().max(2147483647)
