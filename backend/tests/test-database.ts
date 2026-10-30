import type { Pool, RowDataPacket } from 'mysql2/promise'
import type { Config } from '../src/config/env.js'
import { loadMigrations } from '../src/database/migrations.js'

// Exclusivo de testes: nunca importado por src/ ou comandos de aplicação.
export async function resetTestDatabase(pool: Pool, config: Config) {
  if (config.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(config.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') throw new Error('Limpeza restrita a banco descartável explícito.')
  const [current] = await pool.execute<RowDataPacket[]>('SELECT DATABASE() AS name')
  if (current[0]?.name !== config.DB_NAME) throw new Error('Banco do pool diverge da configuração de testes.')
  const migrations = await loadMigrations()
  const names = migrations.flatMap(file => {
    const match = /CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)\s*\(/.exec(file.sql)
    return match?.[1] ? [match[1]] : []
  })
  const [tables] = await pool.execute<RowDataPacket[]>('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()')
  if (tables.some(row => !names.includes(row.name))) throw new Error('Banco contém tabela inesperada; limpeza recusada.')
  const [constraints] = await pool.execute<RowDataPacket[]>("SELECT CONSTRAINT_NAME AS name FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'methodologies' AND CONSTRAINT_NAME = 'methodology_current_version_fk'")
  if (constraints.length) await pool.query('ALTER TABLE methodologies DROP FOREIGN KEY methodology_current_version_fk')
  // Ordem inversa de criação; FKs permanecem habilitadas, inclusive nos testes negativos.
  for (const name of names.reverse()) await pool.query('DROP TABLE IF EXISTS ' + name)
}
