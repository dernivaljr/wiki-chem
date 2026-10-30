import { ConfigurationError, loadMigrationConfig } from '../config/env.js'
import { createDatabasePool } from './pool.js'
import { loadMigrations, MigrationError, runMigrations } from './migrations.js'

async function main() {
  const args = process.argv.slice(2)
  if (args.length > 1 || (args.length === 1 && args[0] !== '--status')) {
    throw new MigrationError('MIGRATION_ARGUMENT_INVALID')
  }
  const config = loadMigrationConfig(process.env)
  const migrations = await loadMigrations()
  const pool = createDatabasePool(config)
  try {
    console.log(JSON.stringify(await runMigrations(pool, config.DB_NAME, migrations, args[0] !== '--status')))
  } finally {
    await pool.end()
  }
}

main().catch(error => {
  console.error(error instanceof ConfigurationError ? error.message
    : error instanceof MigrationError ? error.code : 'MIGRATION_CONNECTION_OR_CONFIGURATION_FAILED')
  process.exitCode = 1
})
