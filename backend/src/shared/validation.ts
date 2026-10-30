import type { FastifyInstance, FastifyTypeProvider } from 'fastify'
import { z } from 'zod'
import { AppError } from './errors.js'

export interface ZodProvider extends FastifyTypeProvider {
  validator: this['schema'] extends z.ZodType ? z.output<this['schema']> : unknown
  serializer: this['schema'] extends z.ZodType ? z.output<this['schema']> : unknown
}

export function configureValidation(app: FastifyInstance) {
  app.setValidatorCompiler(({ schema }) => data => {
    const result = (schema as z.ZodType).safeParse(data)
    if (result.success) return { value: result.data }
    return {
      error: new AppError(400, 'VALIDATION_ERROR', 'Entrada inválida.', result.error.issues.map(issue => ({
        field: issue.path.map(String).join('.'), reason: issue.code,
      }))),
    }
  })
  app.setSerializerCompiler(({ schema }) => data => JSON.stringify((schema as z.ZodType).parse(data)))
}
