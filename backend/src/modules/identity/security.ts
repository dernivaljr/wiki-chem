import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import * as argon2 from 'argon2'
import { AppError } from '../../shared/errors.js'

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const newToken = () => randomBytes(32).toString('hex')
export const validToken = (token: unknown): token is string => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
export const csrfFor = (token: string) => createHmac('sha256', Buffer.from(token, 'hex')).update('wikichem:csrf:v1').digest('hex')
export function checkCsrf(token: string, supplied: unknown) {
  if (!validToken(supplied) || !timingSafeEqual(Buffer.from(csrfFor(token), 'hex'), Buffer.from(supplied, 'hex'))) {
    throw new AppError(403, 'CSRF_INVALID', 'Não foi possível validar esta ação. Atualize a sessão.')
  }
}

let activeHashes = 0
async function boundedWork<T>(work: () => Promise<T>): Promise<T> {
  if (activeHashes >= 4) throw new AppError(503, 'IDENTITY_BUSY', 'Serviço ocupado. Tente novamente em instantes.')
  activeHashes++
  try { return await work() } finally { activeHashes-- }
}
export const hashPassword = (value: string) => boundedWork(() => argon2.hash(value, {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
}))
export const verifyPassword = (hash: string, value: string) => boundedWork(async () => {
  try { return await argon2.verify(hash, value) } catch { return false }
})

export class AccountAttempts {
  private entries = new Map<string, { count: number; until: number }>()
  private sweepAt = 0
  constructor(private max: number, private now = Date.now) {}
  check(email: string) {
    const now = this.now()
    if (now >= this.sweepAt) {
      for (const [key, item] of this.entries) if (item.until <= now) this.entries.delete(key)
      this.sweepAt = now + 60000
    }
    const key = hashToken(email)
    let entry = this.entries.get(key)
    if (!entry || entry.until <= now) {
      if (!entry && this.entries.size >= 5000) throw new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um minuto.')
      entry = { count: 0, until: now + 60000 }
      this.entries.set(key, entry)
    }
    if (++entry.count > this.max) throw new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um minuto.')
  }
}
