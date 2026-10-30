import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import { acquireConnection } from './pool.js'

export interface Migration { version: string; sql: string; checksum: string }
interface History extends RowDataPacket { version: string; checksum: string; status: 'APPLYING' | 'APPLIED' }
export class MigrationError extends Error {
  constructor(readonly code: string) { super(code) }
}

export async function loadMigrations(directory = fileURLToPath(new URL('../../migrations/', import.meta.url))): Promise<Migration[]> {
  const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()
  if (!names.includes('0001_schema_migrations.sql')) throw new MigrationError('MIGRATION_BASELINE_REQUIRED')
  const result: Migration[] = []
  for (const [index, name] of names.entries()) {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(name) || Number(name.slice(0, 4)) !== index + 1) {
      throw new MigrationError('MIGRATION_SEQUENCE_INVALID')
    }
    const sql = (await readFile(join(directory, name), 'utf8')).replaceAll('\r\n', '\n')
    if (!sql.trim() || sql.includes('\uFFFD')) throw new MigrationError('MIGRATION_CONTENT_INVALID')
    result.push({ version: name.slice(0, -4), sql, checksum: createHash('sha256').update(sql).digest('hex') })
  }
  return result
}

export async function runMigrations(pool: Pool, database: string, migrations: readonly Migration[], apply: boolean) {
  if (migrations[0]?.version !== '0001_schema_migrations') throw new MigrationError('MIGRATION_BASELINE_REQUIRED')
  const connection = await acquireConnection(pool)
  const lockName = 'wikichem:migrate:' + createHash('sha256').update(database).digest('hex').slice(0, 40)
  let locked = false
  try {
    const [versions] = await connection.execute<RowDataPacket[]>('SELECT VERSION() AS version, DATABASE() AS database_name')
    if (versions[0]?.database_name !== database) throw new MigrationError('MIGRATION_DATABASE_MISMATCH')
    if (!/^8\.4\./.test(String(versions[0]?.version))) throw new MigrationError('MYSQL_84_REQUIRED')
    const [lock] = await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS acquired', [lockName])
    if (String(lock[0]?.acquired) !== '1') throw new MigrationError('MIGRATION_LOCKED')
    locked = true
    await connection.query("SET SESSION time_zone = '+00:00'")
    await connection.query('SET SESSION autocommit = 1')
    let history: History[] = []
    try {
      ;[history] = await connection.execute<History[]>('SELECT version, checksum, status FROM schema_migrations ORDER BY version')
    } catch (error) {
      if ((error as { code?: string }).code !== 'ER_NO_SUCH_TABLE') throw error
      if (apply) {
        // Somente a criação atômica da própria tabela de controle antecede seu registro.
        await connection.query(migrations[0].sql)
      }
    }
    for (const [index, entry] of history.entries()) {
      const file = migrations[index]
      if (!file || file.version !== entry.version) throw new MigrationError('MIGRATION_HISTORY_MISMATCH')
      if (entry.checksum !== file.checksum) throw new MigrationError('MIGRATION_CHECKSUM_MISMATCH')
      if (entry.status !== 'APPLIED') throw new MigrationError('MIGRATION_INCOMPLETE')
    }
    const pending = migrations.slice(history.length)
    if (apply) {
      for (const migration of pending) {
        await connection.execute(
          "INSERT INTO schema_migrations (version, checksum, status, started_at) VALUES (?, ?, 'APPLYING', UTC_TIMESTAMP(6))",
          [migration.version, migration.checksum],
        )
        try {
          // Um statement por arquivo; multipleStatements permanece desabilitado.
          // DDL não é envolvido em uma falsa promessa de rollback transacional.
          await connection.query({ sql: migration.sql, timeout: 30000 })
          await connection.execute(
            "UPDATE schema_migrations SET status = 'APPLIED', applied_at = UTC_TIMESTAMP(6) WHERE version = ?",
            [migration.version],
          )
        } catch {
          throw new MigrationError('MIGRATION_FAILED_REQUIRES_INSPECTION')
        }
      }
    }
    return migrations.map(migration => ({
      version: migration.version,
      status: apply || history.some(entry => entry.version === migration.version) ? 'APPLIED' : 'PENDING',
    }))
  } finally {
    if (locked) {
      try {
        const [released] = await connection.execute<RowDataPacket[]>('SELECT RELEASE_LOCK(?) AS released', [lockName])
        if (String(released[0]?.released) !== '1') connection.destroy()
      } catch { connection.destroy() }
    }
    connection.release()
  }
}
