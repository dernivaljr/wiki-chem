import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadMigrations } from '../../src/database/migrations.js'

const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'wikichem-migrations-'))
  directories.push(path)
  return path
}

describe('manifesto de migrações', () => {
  it('preserva a baseline de infraestrutura e ordena as migrações de identidade', async () => {
    const migrations = await loadMigrations()
    expect(migrations.slice(0, 3).map(item => item.version)).toEqual(['0001_schema_migrations', '0002_users', '0003_auth_sessions'])
    expect(migrations[0]?.version).toBe('0001_schema_migrations')
    expect(migrations[0]?.checksum).toMatch(/^[a-f0-9]{64}$/)
    expect(migrations[0]?.sql).not.toMatch(/CREATE TABLE (users|orders|products)/)
  })
  it('normaliza LF/CRLF para checksum reproduzível', async () => {
    const path = await directory()
    const sql = await readFile(new URL('../../migrations/0001_schema_migrations.sql', import.meta.url), 'utf8')
    await writeFile(join(path, '0001_schema_migrations.sql'), sql.replaceAll('\r\n', '\n'))
    const lf = await loadMigrations(path)
    await writeFile(join(path, '0001_schema_migrations.sql'), sql.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'))
    expect((await loadMigrations(path))[0]?.checksum).toBe(lf[0]?.checksum)
  })
  it.each(['0003_gap.sql', '0002_BAD.sql', '0001_duplicate.sql'])('rejeita nomes ou sequência inválida: %s', async name => {
    const path = await directory()
    await writeFile(join(path, '0001_schema_migrations.sql'), 'SELECT 1')
    await writeFile(join(path, name), 'SELECT 1')
    await expect(loadMigrations(path)).rejects.toThrow('MIGRATION_SEQUENCE_INVALID')
  })
  it('rejeita ausência de baseline e SQL vazio', async () => {
    const path = await directory()
    await expect(loadMigrations(path)).rejects.toThrow('MIGRATION_BASELINE_REQUIRED')
    await writeFile(join(path, '0001_schema_migrations.sql'), ' ')
    await expect(loadMigrations(path)).rejects.toThrow('MIGRATION_CONTENT_INVALID')
  })
})
