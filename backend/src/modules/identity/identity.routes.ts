import { z } from 'zod'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Config } from '../../config/env.js'
import { AppError } from '../../shared/errors.js'
import { emptyQuery, errorResponse } from '../../shared/contracts.js'
import type { ZodProvider } from '../../shared/validation.js'
import { loginInput, profileInput, registerInput, sessionResponse, userResponse } from './identity.contracts.js'
import type { IdentityService } from './identity.service.js'
import { checkCsrf, validToken } from './security.js'

export const sessionCookieName = (config: Config) => config.NODE_ENV === 'production' ? '__Host-wikichem_session' : 'wikichem_session'
export function registerIdentityRoutes(app: FastifyInstance, config: Config, service: IdentityService) {
  const api = app.withTypeProvider<ZodProvider>()
  const name = sessionCookieName(config)
  const cookieOptions = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: config.NODE_ENV === 'production' }
  const clear = (reply: FastifyReply) => reply.clearCookie(name, cookieOptions)
  const origin = async (request: FastifyRequest) => {
    if (request.headers.origin !== config.APP_ORIGIN || request.headers['sec-fetch-site'] === 'cross-site') {
      throw new AppError(403, 'ORIGIN_FORBIDDEN', 'Origem da requisição não permitida.')
    }
    if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Esta ação exige JSON.')
    }
  }
  const authenticated = async (request: FastifyRequest, reply: FastifyReply, touch = true) => {
    try { return await service.session(request.cookies[name], touch) } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) clear(reply)
      throw error
    }
  }
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 409: errorResponse, 429: errorResponse, 503: errorResponse }
  const limited = { rateLimit: { max: config.AUTH_RATE_LIMIT_MAX, timeWindow: 60000 } }
  api.post('/auth/register', {
    preHandler: origin, config: limited,
    schema: { querystring: emptyQuery, body: registerInput, response: { 201: userResponse, ...errors } },
  }, async (request, reply) => {
    const user = await service.register(request.body)
    return reply.code(201).send({ data: user })
  })
  api.post('/auth/login', {
    preHandler: origin, config: limited,
    schema: { querystring: emptyQuery, body: loginInput, response: { 200: sessionResponse, ...errors } },
  }, async (request, reply) => {
    const result = await service.login(request.body, request.cookies[name])
    reply.setCookie(name, result.token, cookieOptions)
    return { data: result.data }
  })
  api.get('/auth/session', {
    schema: { querystring: emptyQuery, response: { 200: sessionResponse, ...errors } },
  }, async (request, reply) => ({ data: await authenticated(request, reply, false) }))
  api.get('/me', {
    schema: { querystring: emptyQuery, response: { 200: userResponse, ...errors } },
  }, async (request, reply) => ({ data: (await authenticated(request, reply)).user }))
  api.patch('/me', {
    preHandler: origin, schema: { querystring: emptyQuery, body: profileInput, response: { 200: userResponse, ...errors } },
  }, async (request, reply) => {
    await authenticated(request, reply, false)
    const token = request.cookies[name]
    if (!validToken(token)) throw new AppError(401, 'SESSION_REQUIRED', 'Entre novamente.')
    checkCsrf(token, request.headers['x-csrf-token'])
    const user = await service.updateName(token, request.body.displayName)
    return { data: user }
  })
  api.post('/auth/logout', {
    preHandler: origin, schema: { querystring: emptyQuery, body: emptyQuery, response: { 204: z.undefined(), ...errors } },
  }, async (request, reply) => {
    const token = request.cookies[name]
    if (validToken(token)) {
      checkCsrf(token, request.headers['x-csrf-token'])
      await service.logout(token)
    }
    clear(reply)
    return reply.code(204).send(undefined)
  })
}
