import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { loadMigrationConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'
import { loadMigrations, runMigrations } from '../../src/database/migrations.js'
import { provisionInitialAdmin } from '../../src/modules/identity/admin-bootstrap.js'
import { resetTestDatabase } from '../test-database.js'

const config = loadMigrationConfig(process.env)
if (config.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(config.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') throw new Error('Fixture DEMO exige banco descartável explícito.')
const pool = createDatabasePool(config)
try {
  await resetTestDatabase(pool, config)
  await runMigrations(pool, config.DB_NAME, await loadMigrations(), true)
  const email = 'admin-demo-fixture@example.test'
  const password = randomBytes(32).toString('base64url')
  await provisionInitialAdmin(pool, config.DB_NAME, { displayName: 'Admin DEMO da suíte', email, password }, 'Fixture original DEMO Playwright')
  const response = await fetch('http://127.0.0.1:4174/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4174' }, body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error('Não foi possível iniciar sessão da fixture administrativa.')
  const value = response.headers.getSetCookie().find(cookie => cookie.startsWith('wikichem_session='))?.split(';')[0]?.split('=')[1]
  if (!value) throw new Error('Cookie da fixture ausente.')
  const directory = fileURLToPath(new URL('../../../frontend/.test-fixtures/', import.meta.url))
  await mkdir(directory, { recursive: true })
  // Cookie efêmero de teste, ignorado no Git; a senha aleatória nunca é gravada.
  await writeFile(directory + 'admin.json', JSON.stringify({ cookies: [{ name: 'wikichem_session', value, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }), { mode: 0o600 })
  console.log('Fixture administrativa DEMO preparada no banco isolado.')
} finally { await pool.end() }
