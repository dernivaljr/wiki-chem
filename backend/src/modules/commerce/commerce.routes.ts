import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { Config } from '../../config/env.js'
import { emptyQuery, errorResponse } from '../../shared/contracts.js'
import type { ZodProvider } from '../../shared/validation.js'
import { id, idParams, paged, paging } from '../catalog/catalog.contracts.js'
import type { IdentityService } from '../identity/identity.service.js'
import { createAccessGuard } from '../identity/access.js'
import type { CommerceRepository } from './commerce.repository.js'
import { cartAdd, cartRemove, cartSchema, priceInput, priceSchema, productInput, productPatch, productSchema } from './commerce.contracts.js'
export async function registerCommerceRoutes(app: FastifyInstance, config: Config, identity: IdentityService, repository: CommerceRepository) {
  const { authenticate, actor } = createAccessGuard(config, identity)
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 409: errorResponse, 503: errorResponse }
  await app.register(async scope => {
    scope.addHook('onRequest', (request, reply) => authenticate(request, reply, false, true))
    const api = scope.withTypeProvider<ZodProvider>()
    api.get('/', { prefixTrailingSlash: 'both', schema: { querystring: emptyQuery, response: { 200: z.strictObject({ data: cartSchema }), ...errors } } }, async request => ({ data: await repository.getCart(actor(request).userId) }))
    api.put('/items/:id', { schema: { params: idParams, querystring: emptyQuery, body: cartAdd, response: { 200: z.strictObject({ data: cartSchema }), ...errors } } }, async request => ({ data: await repository.changeCart(actor(request), request.params.id, request.body.expectedRevision, request.body) }))
    api.delete('/items/:id', { schema: { params: idParams, querystring: cartRemove, body: z.undefined(), response: { 200: z.strictObject({ data: cartSchema }), ...errors } } }, async request => ({ data: await repository.changeCart(actor(request), request.params.id, request.query.expectedRevision) }))
  }, { prefix: '/cart' })
  await app.register(async scope => {
    scope.addHook('onRequest', (request, reply) => authenticate(request, reply, true))
    const api = scope.withTypeProvider<ZodProvider>()
    api.get('/', { schema: { querystring: paging.extend({ methodologyId: id.optional() }), response: { 200: paged(productSchema), ...errors } } }, async request => repository.listProducts(request.query.page, request.query.pageSize, request.query.methodologyId))
    api.post('/', { prefixTrailingSlash: 'both', schema: { querystring: emptyQuery, body: productInput, response: { 201: z.strictObject({ data: productSchema }), ...errors } } }, async (request, reply) => reply.code(201).send({ data: await repository.createProduct(request.body.methodologyId, actor(request)) }))
    api.get('/:id', { schema: { params: idParams, querystring: emptyQuery, response: { 200: z.strictObject({ data: productSchema }), ...errors } } }, async request => ({ data: await repository.getProduct(request.params.id) }))
    api.patch('/:id', { schema: { params: idParams, querystring: emptyQuery, body: productPatch, response: { 200: z.strictObject({ data: productSchema }), ...errors } } }, async request => ({ data: await repository.updateProduct(request.params.id, request.body, actor(request)) }))
    api.post('/:id/prices', { schema: { params: idParams, querystring: emptyQuery, body: priceInput, response: { 201: z.strictObject({ data: productSchema }), ...errors } } }, async (request, reply) => reply.code(201).send({ data: await repository.createPrice(request.params.id, request.body, actor(request)) }))
    api.get('/:id/prices', { schema: { params: idParams, querystring: paging, response: { 200: paged(priceSchema), ...errors } } }, async request => repository.listPrices(request.params.id, request.query.page, request.query.pageSize))
  }, { prefix: '/admin/products' })
}
