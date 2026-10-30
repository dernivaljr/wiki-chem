import { z } from 'zod'
import { searchQuery } from './catalog.contracts.js'
import { versionAccessInput } from './catalog.contracts.js'
import type { FastifyInstance } from 'fastify'
import type { Config } from '../../config/env.js'
import { emptyQuery, errorResponse } from '../../shared/contracts.js'
import type { ZodProvider } from '../../shared/validation.js'
import type { IdentityService } from '../identity/identity.service.js'
import { createAccessGuard } from '../identity/access.js'
import type { CatalogRepository } from './catalog.repository.js'
import { expectedRevision, facetSchema, id, idParams, methodInput, methodPatch, methodSchema, newVersion, paged, paging, previewSchema, publishInput, taxonomiesSchema, termInput, termPatch, termSchema, versionPatch, versionSchema, versionSummarySchema } from './catalog.contracts.js'

export async function registerCatalogRoutes(app: FastifyInstance, config: Config, identity: IdentityService, catalog: CatalogRepository) {
  const { authenticate, actor } = createAccessGuard(config, identity)
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 409: errorResponse, 503: errorResponse }
  const api = app.withTypeProvider<ZodProvider>()
  api.get('/methodologies', { onRequest: (request, reply) => authenticate(request, reply, false), schema: { querystring: searchQuery, response: { 200: paged(previewSchema), ...errors } } },
    async request => catalog.search(request.query, actor(request).userId))
  api.get('/taxonomies', { onRequest: (request, reply) => authenticate(request, reply, false), schema: { querystring: emptyQuery, response: { 200: z.strictObject({ data: taxonomiesSchema }), ...errors } } },
    async () => ({ data: await catalog.taxonomies(false) }))
  api.get('/methodologies/:id', { onRequest: (request, reply) => authenticate(request, reply, false), schema: { params: idParams, querystring: emptyQuery, response: { 200: z.strictObject({ data: previewSchema }), ...errors } } },
    async request => ({ data: await catalog.preview(request.params.id, actor(request).userId) }))
  await app.register(async scope => {
    scope.addHook('onRequest', (request, reply) => authenticate(request, reply, true))
    const admin = scope.withTypeProvider<ZodProvider>()
    admin.get('/taxonomies', { schema: { querystring: emptyQuery, response: { 200: z.strictObject({ data: taxonomiesSchema }), ...errors } } },
      async () => ({ data: await catalog.taxonomies(true) }))
    admin.post('/taxonomies/:type', { schema: { params: z.strictObject({ type: facetSchema }), querystring: emptyQuery, body: termInput, response: { 201: z.strictObject({ data: termSchema }), ...errors } } },
      async (request, reply) => reply.code(201).send({ data: await catalog.createTerm(request.params.type, request.body, actor(request)) }))
    admin.patch('/taxonomies/:type/:id', { schema: { params: z.strictObject({ type: facetSchema, id }), querystring: emptyQuery, body: termPatch, response: { 200: z.strictObject({ data: termSchema }), ...errors } } },
      async request => ({ data: await catalog.updateTerm(request.params.type, request.params.id, request.body, actor(request)) }))
    admin.get('/methodologies', { schema: { querystring: paging, response: { 200: paged(methodSchema), ...errors } } },
      async request => catalog.listMethods(request.query.page, request.query.pageSize))
    admin.post('/methodologies', { schema: { querystring: emptyQuery, body: methodInput, response: { 201: z.strictObject({ data: methodSchema }), ...errors } } },
      async (request, reply) => reply.code(201).send({ data: await catalog.createMethod(request.body.slug, actor(request)) }))
    admin.get('/methodologies/:id', { schema: { params: idParams, querystring: emptyQuery, response: { 200: z.strictObject({ data: methodSchema }), ...errors } } },
      async request => ({ data: await catalog.getMethod(request.params.id) }))
    admin.patch('/methodologies/:id', { schema: { params: idParams, querystring: emptyQuery, body: methodPatch, response: { 200: z.strictObject({ data: methodSchema }), ...errors } } },
      async request => ({ data: await catalog.updateMethod(request.params.id, request.body, actor(request)) }))
    admin.delete('/methodologies/:id', { schema: { params: idParams, querystring: emptyQuery, body: expectedRevision, response: { 204: z.undefined(), ...errors } } },
      async (request, reply) => { await catalog.deleteMethod(request.params.id, request.body.expectedRevision, actor(request)); return reply.code(204).send(undefined) })
    admin.get('/methodologies/:id/versions', { schema: { params: idParams, querystring: paging, response: { 200: paged(versionSummarySchema), ...errors } } },
      async request => catalog.listVersions(request.params.id, request.query.page, request.query.pageSize))
    admin.post('/methodologies/:id/versions', { schema: { params: idParams, querystring: emptyQuery, body: newVersion, response: { 201: z.strictObject({ data: versionSchema }), ...errors } } },
      async (request, reply) => reply.code(201).send({ data: await catalog.createVersion(request.params.id, request.body, actor(request)) }))
    admin.get('/versions/:id', { schema: { params: idParams, querystring: emptyQuery, response: { 200: z.strictObject({ data: versionSchema }), ...errors } } },
      async request => ({ data: await catalog.getVersion(request.params.id, actor(request)) }))
    admin.patch('/versions/:id', { bodyLimit: 524288, schema: { params: idParams, querystring: emptyQuery, body: versionPatch, response: { 200: z.strictObject({ data: versionSchema }), ...errors } } },
      async request => ({ data: await catalog.saveVersion(request.params.id, request.body, actor(request)) }))
    admin.delete('/versions/:id', { schema: { params: idParams, querystring: emptyQuery, body: expectedRevision, response: { 204: z.undefined(), ...errors } } },
      async (request, reply) => { await catalog.deleteVersion(request.params.id, request.body.expectedRevision, actor(request)); return reply.code(204).send(undefined) })
    admin.post('/versions/:id/publish', { schema: { params: idParams, querystring: emptyQuery, body: publishInput, response: { 200: z.strictObject({ data: versionSchema }), ...errors } } },
      async request => ({ data: await catalog.publish(request.params.id, request.body, actor(request)) }))
    admin.patch('/versions/:id/access', { schema: { params: idParams, querystring: emptyQuery, body: versionAccessInput, response: { 200: z.strictObject({ data: versionSchema }), ...errors } } },
      async request => ({ data: await catalog.setVersionAccess(request.params.id, request.body, actor(request)) }))
  }, { prefix: '/admin' })
}
