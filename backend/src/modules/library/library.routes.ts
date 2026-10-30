import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { Config } from '../../config/env.js'
import { emptyQuery, errorResponse } from '../../shared/contracts.js'
import type { ZodProvider } from '../../shared/validation.js'
import { paged, paging } from '../catalog/catalog.contracts.js'
import { createAccessGuard } from '../identity/access.js'
import type { IdentityService } from '../identity/identity.service.js'
import { contentQuery, eligibleVersion, libraryContent, libraryEntry, libraryParams } from './library.contracts.js'
import type { LibraryRepository } from './library.repository.js'
export async function registerLibraryRoutes(app: FastifyInstance, config: Config, identity: IdentityService, repository: LibraryRepository) {
  const { authenticate, actor } = createAccessGuard(config, identity)
  await app.register(async scope => {
    scope.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'private, no-store, max-age=0').header('pragma', 'no-cache').header('expires', '0').header('vary', 'Cookie')
      await authenticate(request, reply, false)
    })
    const api = scope.withTypeProvider<ZodProvider>()
    const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 503: errorResponse }
    api.get('/', { schema: { querystring: paging, response: { 200: paged(libraryEntry), ...errors } } }, request => repository.list(actor(request), request.query.page, request.query.pageSize))
    api.get('/:methodologyId', { schema: { params: libraryParams, querystring: emptyQuery, response: { 200: z.strictObject({ data: libraryEntry }), ...errors } } }, async request => ({ data: await repository.detail(actor(request), request.params.methodologyId) }))
    api.get('/:methodologyId/versions', { schema: { params: libraryParams, querystring: paging, response: { 200: paged(eligibleVersion), ...errors } } }, request => repository.versions(actor(request), request.params.methodologyId, request.query.page, request.query.pageSize))
    api.get('/:methodologyId/content', { schema: { params: libraryParams, querystring: contentQuery, response: { 200: z.strictObject({ data: libraryContent }), ...errors } } }, async request => ({ data: await repository.content(actor(request), request.params.methodologyId, request.query.versionId) }))
  }, { prefix: '/library' })
}
