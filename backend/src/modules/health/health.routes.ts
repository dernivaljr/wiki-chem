import type { FastifyInstance } from 'fastify'
import type { ZodProvider } from '../../shared/validation.js'
import { databaseResponse, emptyQuery, errorResponse, healthResponse } from '../../shared/contracts.js'
import type { createHealthService } from './health.service.js'

export function registerHealthRoutes(app: FastifyInstance, service: ReturnType<typeof createHealthService>) {
  const api = app.withTypeProvider<ZodProvider>()
  api.get('/health', {
    schema: { querystring: emptyQuery, response: { 200: healthResponse, 400: errorResponse } },
  }, async () => ({ data: { status: 'ok' as const } }))
  api.get('/health/database', {
    schema: { querystring: emptyQuery, response: { 200: databaseResponse, 400: errorResponse, 503: errorResponse } },
  }, async () => ({ data: await service.databaseStatus() }))
}
