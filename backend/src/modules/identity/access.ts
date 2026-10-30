import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Config } from '../../config/env.js'
import { AppError } from '../../shared/errors.js'
import type { IdentityService } from './identity.service.js'
import { requireRole } from './identity.service.js'
import { sessionCookieName } from './identity.routes.js'
import { checkCsrf, validToken } from './security.js'
export interface Actor { userId: string; requestId: string }
export function createAccessGuard(config: Config, identity: IdentityService) {
  const actors = new WeakMap<FastifyRequest, Actor>()
  return {
    async authenticate(request: FastifyRequest, reply: FastifyReply, admin: boolean, bodylessDelete = false) {
      const token = request.cookies[sessionCookieName(config)]
      try {
        const session = await identity.session(token, false)
        if (admin) requireRole(session.user, 'ADMIN')
        if (!['GET', 'HEAD'].includes(request.method)) {
          if (request.headers.origin !== config.APP_ORIGIN || request.headers['sec-fetch-site'] === 'cross-site') throw new AppError(403, 'ORIGIN_FORBIDDEN', 'Origem da requisição não permitida.')
          if (!(bodylessDelete && request.method === 'DELETE') && !request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Esta ação exige JSON.')
          if (!validToken(token)) throw new AppError(401, 'SESSION_REQUIRED', 'Entre novamente.')
          checkCsrf(token, request.headers['x-csrf-token'])
        }
        const current = await identity.session(token, true)
        if (admin) requireRole(current.user, 'ADMIN')
        actors.set(request, { userId: current.user.id, requestId: request.id })
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 401) reply.clearCookie(sessionCookieName(config), { path: '/', httpOnly: true, sameSite: 'lax', secure: config.NODE_ENV === 'production' })
        throw error
      }
    },
    actor(request: FastifyRequest) {
      const actor = actors.get(request)
      if (!actor) throw new AppError(401, 'SESSION_REQUIRED', 'Entre novamente.')
      return actor
    },
  }
}
