import { createCatalogRepository } from './modules/catalog/catalog.repository.js'
import { createLibraryRepository } from './modules/library/library.repository.js'
import { createCommerceRepository } from './modules/commerce/commerce.repository.js'
import { createCheckoutRepository } from './modules/checkout/checkout.repository.js'
import { createIdentityRepository } from './modules/identity/identity.repository.js'
import { buildApp } from './app.js'
import { ConfigurationError, loadConfig } from './config/env.js'
import { createDatabasePool } from './database/pool.js'
import { createHealthRepository } from './modules/health/health.repository.js'

async function main() {
  const config = loadConfig(process.env)
  const pool = createDatabasePool(config)
  const app = buildApp(config, {
    identity: createIdentityRepository(pool),
    library: createLibraryRepository(pool),
    catalog: createCatalogRepository(pool),
    commerce: createCommerceRepository(pool),
    checkout: createCheckoutRepository(pool, { ttlSeconds: config.CHECKOUT_TTL_SECONDS }),
    checkDatabase: createHealthRepository(pool, config.DB_TIMEOUT_MS).checkDatabase,
    closeDatabase: () => pool.end(),
  })
  let stopping = false
  const shutdown = async () => {
    if (stopping) return
    stopping = true
    const timeout = setTimeout(() => process.exit(1), 15000).unref()
    try { await app.close() } catch {
      console.error('Falha ao encerrar o backend.')
      process.exitCode = 1
    } finally { clearTimeout(timeout) }
  }
  process.once('SIGINT', () => { void shutdown() })
  process.once('SIGTERM', () => { void shutdown() })
  try {
    await app.listen({ host: config.HOST, port: config.PORT })
  } catch {
    await app.close()
    throw new Error('SERVER_START_FAILED')
  }
}

main().catch(error => {
  console.error(error instanceof ConfigurationError ? error.message : 'Falha ao iniciar o backend; verifique a configuração e a porta.')
  process.exitCode = 1
})
