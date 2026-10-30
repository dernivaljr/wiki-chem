import { z } from 'zod'

const port = z.coerce.number().int().min(1).max(65535)
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: port.default(3001),
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: port.default(3306),
  DB_NAME: z.string().regex(/^[a-zA-Z0-9_]{1,64}$/),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  DB_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(5000),
  DB_TLS: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  DB_TLS_CA_FILE: z.string().default(''),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.DB_TLS) {
    ctx.addIssue({ code: 'custom', path: ['DB_TLS'], message: 'TLS required' })
  }
  if (!env.DB_TLS && env.DB_TLS_CA_FILE) {
    ctx.addIssue({ code: 'custom', path: ['DB_TLS_CA_FILE'], message: 'TLS required' })
  }
})

export type Config = z.infer<typeof envSchema>

export class ConfigurationError extends Error {
  constructor(readonly fields: string[]) {
    super(`Configuração inválida: ${fields.join(', ')}`)
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    throw new ConfigurationError([...new Set(result.error.issues.map(issue => String(issue.path[0])))])
  }
  return result.data
}

export function loadMigrationConfig(env: NodeJS.ProcessEnv): Config {
  return loadConfig({ ...env, DB_USER: env.MIGRATION_DB_USER, DB_PASSWORD: env.MIGRATION_DB_PASSWORD })
}
