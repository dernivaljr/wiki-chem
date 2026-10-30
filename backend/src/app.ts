import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import type { IdentityRepository } from './modules/identity/identity.repository.js'
import { createIdentityService } from './modules/identity/identity.service.js'
import { registerIdentityRoutes } from './modules/identity/identity.routes.js'
import { AppError } from './shared/errors.js'
import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import type { FastifyServerOptions } from 'fastify'
import type { Config } from './config/env.js'
import { configureErrors } from './shared/error-handler.js'
import { configureValidation } from './shared/validation.js'
import { createHealthService } from './modules/health/health.service.js'
import { registerHealthRoutes } from './modules/health/health.routes.js'

export function buildApp(config: Config, dependencies: {
  identity?: IdentityRepository
  now?: () => number
  checkDatabase: () => Promise<void>
  closeDatabase?: () => Promise<void>
  logger?: FastifyServerOptions['logger']
}) {
  const app = Fastify({
    logger: dependencies.logger === false ? false : {
      ...(typeof dependencies.logger === 'object' ? dependencies.logger : {}),
      level: config.LOG_LEVEL,
      serializers: { req: request => ({ method: request.method }), res: response => ({ statusCode: response.statusCode }) },
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    },
    // Não aceitar IDs controlados pelo cliente nem confiar em proxy não configurado.
    requestIdHeader: false, genReqId: () => randomUUID(), trustProxy: false,
    bodyLimit: 16384, requestTimeout: 10000,
  })
  configureValidation(app)
  configureErrors(app)
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id)
    reply.header('cache-control', 'no-store')
    reply.header('x-content-type-options', 'nosniff')
  })
  app.register(async api => {
    registerHealthRoutes(api, createHealthService(dependencies.checkDatabase))
    if (dependencies.identity) {
      await api.register(cookie)
      await api.register(rateLimit, { global: false, max: config.AUTH_RATE_LIMIT_MAX, timeWindow: 60000,
        errorResponseBuilder: () => new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um minuto.') })
      const service = await createIdentityService(config, dependencies.identity, dependencies.now)
      registerIdentityRoutes(api, config, service)
    }
  }, { prefix: '/api/v1' })
  app.addHook('onClose', async () => { await dependencies.closeDatabase?.() })
  return app
}
