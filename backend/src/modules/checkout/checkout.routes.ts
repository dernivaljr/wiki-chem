import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { Config } from '../../config/env.js'
import { emptyQuery, errorResponse } from '../../shared/contracts.js'
import type { ZodProvider } from '../../shared/validation.js'
import { idParams, paged, paging } from '../catalog/catalog.contracts.js'
import { createAccessGuard } from '../identity/access.js'
import type { IdentityService } from '../identity/identity.service.js'
import { confirmationInput, creationInput, idempotencyHeaders, orderDetail, orderSummary } from './checkout.contracts.js'
import type { CheckoutRepository } from './checkout.repository.js'
export async function registerCheckoutRoutes(app: FastifyInstance, config: Config, identity: IdentityService, repository: CheckoutRepository) {
  const { authenticate, actor } = createAccessGuard(config, identity)
  await app.register(async scope => {
    scope.addHook('onRequest', (request, reply) => authenticate(request, reply, false))
    const limit = scope.rateLimit({ max: config.CHECKOUT_RATE_LIMIT_MAX, timeWindow: 60000, keyGenerator: request => actor(request).userId })
    const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 409: errorResponse, 429: errorResponse, 503: errorResponse }
    const api = scope.withTypeProvider<ZodProvider>()
    api.post('/checkout/simulations', { preHandler: limit, schema: { querystring: emptyQuery, headers: idempotencyHeaders, body: creationInput, response: { 201: z.strictObject({ data: orderDetail }), ...errors } } }, async (request, reply) => reply.code(201).send({ data: await repository.create(actor(request), request.body.cartRevision, request.headers['idempotency-key']) }))
    api.post('/orders/:id/confirm-simulation', { preHandler: limit, schema: { params: idParams, querystring: emptyQuery, headers: idempotencyHeaders, body: confirmationInput, response: { 200: z.strictObject({ data: orderDetail }), ...errors } } }, async request => ({ data: await repository.confirm(actor(request), request.params.id, request.headers['idempotency-key']) }))
    api.post('/orders/:id/cancel', { preHandler: limit, schema: { params: idParams, querystring: emptyQuery, body: emptyQuery, response: { 200: z.strictObject({ data: orderDetail }), ...errors } } }, async request => ({ data: await repository.cancel(actor(request), request.params.id) }))
    api.get('/orders', { schema: { querystring: paging, response: { 200: paged(orderSummary), ...errors } } }, async request => repository.list(actor(request), request.query.page, request.query.pageSize))
    api.get('/orders/:id', { schema: { params: idParams, querystring: emptyQuery, response: { 200: z.strictObject({ data: orderDetail }), ...errors } } }, async request => ({ data: await repository.get(actor(request), request.params.id) }))
  })
}
