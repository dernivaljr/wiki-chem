import { resetTestDatabase } from '../test-database.js'
import { createHash } from 'node:crypto'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/env.js'
import { createDatabasePool, withTransaction } from '../../src/database/pool.js'
import { loadMigrations, runMigrations } from '../../src/database/migrations.js'
import type { Migration } from '../../src/database/migrations.js'
import { createHealthRepository } from '../../src/modules/health/health.repository.js'

const config = loadConfig(process.env)
if (config.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(config.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') {
  throw new Error('Integração exige NODE_ENV=test, MYSQL_TEST_ALLOW=true e banco exclusivo wikichem_test_<sufixo>.')
}
const pool: Pool = createDatabasePool(config)
const apps: FastifyInstance[] = []
const baseline = (await loadMigrations()).slice(0, 1)
const lockName = 'wikichem:migrate:' + createHash('sha256').update(config.DB_NAME).digest('hex').slice(0, 40)

function migration(version: string, sql: string): Migration {
  return { version, sql, checksum: createHash('sha256').update(sql).digest('hex') }
}
async function rows(sql: string, values: string[] = []) {
  return (await pool.execute<RowDataPacket[]>(sql, values))[0]
}
function api(dbPool = pool) {
  const app = buildApp(config, { checkDatabase: createHealthRepository(dbPool, config.DB_TIMEOUT_MS).checkDatabase })
  apps.push(app)
  return app
}

beforeAll(async () => {
  const version = await rows('SELECT VERSION() AS version')
  expect(version[0]?.version).toMatch(/^8\.4\./)
  await resetTestDatabase(pool, config)
}, 30000)
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())) })
afterAll(async () => { await pool.end() })

describe('integração com MySQL 8.4 real', () => {
  it('recusa divergência entre banco do pool e namespace do lock', async () => {
    await expect(runMigrations(pool, config.DB_NAME + '_other', baseline, true)).rejects.toThrow('MIGRATION_DATABASE_MISMATCH')
  })
  it('status não cria tabelas nem aplica migrações', async () => {
    expect(await runMigrations(pool, config.DB_NAME, baseline, false)).toEqual([{ version: '0001_schema_migrations', status: 'PENDING' }])
    const tables = await rows("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()")
    expect(tables).toHaveLength(0)
  })
  it('aplica em banco vazio, registra checksum e é repetível sem duplicar', async () => {
    await runMigrations(pool, config.DB_NAME, baseline, true)
    await runMigrations(pool, config.DB_NAME, baseline, true)
    const ledger = await rows('SELECT version, checksum, status, applied_at FROM schema_migrations')
    expect(ledger).toHaveLength(1)
    expect(ledger[0]).toMatchObject({ version: baseline[0]?.version, checksum: baseline[0]?.checksum, status: 'APPLIED' })
    expect(ledger[0]?.applied_at).toBeTruthy()
  })
  it('readiness consulta MySQL real e liveness continua independente', async () => {
    const app = api()
    expect((await app.inject('/api/v1/health')).statusCode).toBe(200)
    expect((await app.inject('/api/v1/health/database')).json()).toEqual({ data: { status: 'available' } })
  })
  it('trata caracteres de SQL como valor parametrizado, sem execução', async () => {
    const input = "'; DROP TABLE schema_migrations; --"
    expect((await rows('SELECT ? AS literal', [input]))[0]?.literal).toBe(input)
    expect(await rows('SELECT version FROM schema_migrations')).toHaveLength(1)
  })
  it('recusa checksum alterado sem executar SQL', async () => {
    const modified = baseline.map(item => ({ ...item, checksum: '0'.repeat(64) }))
    await expect(runMigrations(pool, config.DB_NAME, modified, true)).rejects.toThrow('MIGRATION_CHECKSUM_MISMATCH')
  })
  it('impede dois executores simultâneos no mesmo banco', async () => {
    const connection = await pool.getConnection()
    try {
      await connection.execute('SELECT GET_LOCK(?, 0)', [lockName])
      await expect(runMigrations(pool, config.DB_NAME, baseline, true)).rejects.toThrow('MIGRATION_LOCKED')
    } finally {
      await connection.execute('SELECT RELEASE_LOCK(?)', [lockName])
      connection.release()
    }
  })
  it('preserva BIGINT, unicidade e FKs do InnoDB', async () => {
    await pool.query('CREATE TABLE foundation_test_parent (id BIGINT UNSIGNED PRIMARY KEY, label VARCHAR(80) UNIQUE) ENGINE=InnoDB')
    await pool.query('CREATE TABLE foundation_test_child (id INT PRIMARY KEY, parent_id BIGINT UNSIGNED, FOREIGN KEY(parent_id) REFERENCES foundation_test_parent(id)) ENGINE=InnoDB')
    try {
      await pool.execute('INSERT INTO foundation_test_parent VALUES (?, ?)', ['9007199254740993', 'unique'])
      expect((await rows('SELECT id FROM foundation_test_parent'))[0]?.id).toBe('9007199254740993')
      await expect(pool.execute('INSERT INTO foundation_test_parent VALUES (?, ?)', ['2', 'unique'])).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' })
      await expect(pool.execute('INSERT INTO foundation_test_child VALUES (?, ?)', ['1', '99'])).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' })
    } finally {
      await pool.query('DROP TABLE foundation_test_child')
      await pool.query('DROP TABLE foundation_test_parent')
    }
  })
  it('confirma DML completo e reverte falha entre escritas', async () => {
    await pool.query('CREATE TABLE foundation_test_transaction (id INT PRIMARY KEY, value INT NOT NULL) ENGINE=InnoDB')
    try {
      await withTransaction(pool, async connection => {
        await connection.execute('INSERT INTO foundation_test_transaction VALUES (?, ?)', [1, 10])
        await connection.execute('INSERT INTO foundation_test_transaction VALUES (?, ?)', [2, 20])
      })
      await expect(withTransaction(pool, async connection => {
        await connection.execute('INSERT INTO foundation_test_transaction VALUES (?, ?)', [3, 30])
        throw new Error('injected failure')
      })).rejects.toThrow('injected failure')
      expect(await rows('SELECT id FROM foundation_test_transaction ORDER BY id')).toEqual([{ id: 1 }, { id: 2 }])
    } finally { await pool.query('DROP TABLE foundation_test_transaction') }
  })
  it('serializa gravações concorrentes com constraint única', async () => {
    await pool.query('CREATE TABLE foundation_test_concurrency (id INT PRIMARY KEY) ENGINE=InnoDB')
    try {
      const results = await Promise.allSettled([1, 2].map(() => withTransaction(pool, async connection => {
        await connection.execute('INSERT INTO foundation_test_concurrency VALUES (?)', [1])
      })))
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
      expect(await rows('SELECT id FROM foundation_test_concurrency')).toHaveLength(1)
    } finally { await pool.query('DROP TABLE foundation_test_concurrency') }
  })
  it('aplica uma evolução e detecta arquivo histórico removido', async () => {
    const next = migration('0002_test_probe', 'CREATE TABLE foundation_test_migration (id INT PRIMARY KEY) ENGINE=InnoDB')
    try {
      await runMigrations(pool, config.DB_NAME, [...baseline, next], true)
      await expect(runMigrations(pool, config.DB_NAME, baseline, false)).rejects.toThrow('MIGRATION_HISTORY_MISMATCH')
      expect(await runMigrations(pool, config.DB_NAME, [...baseline, next], false)).toHaveLength(2)
    } finally {
      await pool.query('DROP TABLE IF EXISTS foundation_test_migration')
      await pool.execute('DELETE FROM schema_migrations WHERE version = ?', [next.version])
    }
  })
  it('falha DDL deixa marcador e bloqueia repetição automática', async () => {
    const broken = migration('0002_test_failure', 'CREATE TABLE invalid syntax')
    try {
      await expect(runMigrations(pool, config.DB_NAME, [...baseline, broken], true)).rejects.toThrow('MIGRATION_FAILED_REQUIRES_INSPECTION')
      expect((await rows('SELECT status FROM schema_migrations WHERE version = ?', [broken.version]))[0]?.status).toBe('APPLYING')
      await expect(runMigrations(pool, config.DB_NAME, [...baseline, broken], true)).rejects.toThrow('MIGRATION_INCOMPLETE')
    } finally { await pool.execute('DELETE FROM schema_migrations WHERE version = ?', [broken.version]) }
  })
  it('não habilita execução de múltiplos statements', async () => {
    await expect(pool.query('SELECT 1; SELECT 2')).rejects.toMatchObject({ code: 'ER_PARSE_ERROR' })
  })
  it('pool encerrado produz 503 e mantém liveness 200', async () => {
    const closed = createDatabasePool(config)
    await closed.end()
    const app = api(closed)
    expect((await app.inject('/api/v1/health/database')).statusCode).toBe(503)
    expect((await app.inject('/api/v1/health')).statusCode).toBe(200)
  })
  it('credencial inválida é rejeitada sem exposição', async () => {
    const denied = createDatabasePool({ ...config, DB_PASSWORD: config.DB_PASSWORD + '-incorrect' })
    try {
      const response = await api(denied).inject('/api/v1/health/database')
      expect(response.statusCode).toBe(503)
      expect(response.body).not.toContain(config.DB_PASSWORD)
    } finally { await denied.end() }
  })
  it('banco inexistente é rejeitado sem criação automática', async () => {
    const missing = createDatabasePool({ ...config, DB_NAME: config.DB_NAME + '_missing' })
    try { expect((await api(missing).inject('/api/v1/health/database')).statusCode).toBe(503) }
    finally { await missing.end() }
  })
})
