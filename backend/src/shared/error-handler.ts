import type { FastifyInstance } from 'fastify'
import { AppError } from './errors.js'

const clientErrors: Record<string, [number, string, string]> = {
  FST_ERR_CTP_INVALID_JSON_BODY: [400, 'INVALID_JSON', 'JSON inválido.'],
  FST_ERR_CTP_EMPTY_JSON_BODY: [400, 'INVALID_JSON', 'JSON inválido.'],
  FST_ERR_CTP_INVALID_MEDIA_TYPE: [415, 'UNSUPPORTED_MEDIA_TYPE', 'Formato de conteúdo não suportado.'],
  FST_ERR_CTP_BODY_TOO_LARGE: [413, 'PAYLOAD_TOO_LARGE', 'Conteúdo excede o limite permitido.'],
}

export function configureErrors(app: FastifyInstance) {
  app.setNotFoundHandler(() => { throw new AppError(404, 'NOT_FOUND', 'Recurso não encontrado.') })
  app.setErrorHandler((error: Error & { code?: string }, request, reply) => {
    const known = error.code ? clientErrors[error.code] : undefined
    const safe = error instanceof AppError ? error
      : known ? new AppError(...known)
        : new AppError(500, 'INTERNAL_ERROR', 'Falha interna. Utilize o requestId para suporte.')
    if (safe.statusCode >= 500) {
      // Não registrar erro bruto: mensagens de driver podem conter SQL, parâmetros ou credenciais.
      request.log.error({ event: 'request_failed', errorCode: safe.code, requestId: request.id })
    }
    void reply.code(safe.statusCode).send({ error: {
      code: safe.code, message: safe.message, details: safe.details, requestId: request.id,
    } })
  })
}
