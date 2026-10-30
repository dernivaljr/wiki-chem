import type { Config } from '../../config/env.js'
import { AppError } from '../../shared/errors.js'
import type { IdentityRepository } from './identity.repository.js'
import { publicUser } from './identity.repository.js'
import { AccountAttempts, csrfFor, hashPassword, hashToken, newToken, validToken, verifyPassword } from './security.js'
import type { User } from './identity.contracts.js'

export function requireRole(user: User, role: User['role']) {
  if (user.role !== role) throw new AppError(403, 'FORBIDDEN', 'Ação não permitida.')
}
export async function createIdentityService(config: Config, repository: IdentityRepository, now = Date.now) {
  const dummyHash = await hashPassword(newToken())
  const attempts = new AccountAttempts(config.AUTH_RATE_LIMIT_MAX, now)
  return {
    async register(input: { displayName: string; email: string; password: string }) {
      return repository.register(input.displayName, input.email, await hashPassword(input.password))
    },
    async login(input: { email: string; password: string }, previousToken: string | undefined) {
      attempts.check(input.email)
      const user = await repository.findUser(input.email)
      const valid = await verifyPassword(user?.password_hash ?? dummyHash, input.password)
      if (!user || !valid || user.status !== 'ACTIVE') throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.')
      const token = newToken()
      const issuedAt = now()
      const absolute = issuedAt + config.SESSION_ABSOLUTE_SECONDS * 1000
      await repository.startSession(user, hashToken(token), validToken(previousToken) ? hashToken(previousToken) : undefined, issuedAt, absolute)
      return { token, data: {
        user: publicUser(user), csrfToken: csrfFor(token),
        expiresAt: new Date(Math.min(absolute, issuedAt + config.SESSION_IDLE_SECONDS * 1000)).toISOString(),
      } }
    },
    async session(token: unknown, touch: boolean) {
      const result = validToken(token) ? await repository.session(hashToken(token), now(), config.SESSION_IDLE_SECONDS * 1000, touch) : undefined
      if (!result || !validToken(token)) throw new AppError(401, 'SESSION_REQUIRED', 'Sua sessão expirou. Entre novamente.')
      return { user: result.user, csrfToken: csrfFor(token), expiresAt: new Date(result.expiresAt).toISOString() }
    },
    async logout(token: string) { await repository.revoke(hashToken(token), now()) },
    updateName: (token: string, name: string) => repository.updateName(hashToken(token), name, now(), config.SESSION_IDLE_SECONDS * 1000),
  }
}
export type IdentityService = Awaited<ReturnType<typeof createIdentityService>>
