import { loadMigrationConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'
import { loadMigrations, runMigrations } from '../../src/database/migrations.js'
import { seedAcademic } from './seed.js'
import { assertDemo } from './examples.js'
try {
  assertDemo(process.env)
  const config = loadMigrationConfig(process.env), pool = createDatabasePool(config)
  try {
    await runMigrations(pool, config.DB_NAME, await loadMigrations(), true)
    const result = await seedAcademic(config, pool)
    console.log(JSON.stringify(result)) // Apenas IDs/avisos; nenhuma credencial ou conteúdo integral.
  } finally { await pool.end() }
} catch { console.error('Preparação recusada ou incompleta. Exige banco de testes isolado vazio; consulte o guia demonstrativo.'); process.exitCode = 1 }
