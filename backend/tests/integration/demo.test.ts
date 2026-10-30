import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'
import { migrateTestDatabase, resetTestDatabase } from '../test-database.js'
import { seedAcademic } from '../demo/seed.js'
import { measureResearch } from '../demo/performance.js'
const config = { ...loadConfig(process.env), LOG_LEVEL: 'silent' as const }
const pool = createDatabasePool(config)
beforeAll(async () => { await resetTestDatabase(pool, config); await migrateTestDatabase(config) })
afterAll(async () => { await resetTestDatabase(pool, config); await migrateTestDatabase(config); await pool.end() })
describe('preparação demonstrativa isolada e medição real', () => {
  it('recusa produção e habilitação ausente antes de acessar tabelas', async () => {
    await expect(seedAcademic(config, pool, { NODE_ENV: 'production' })).rejects.toThrow('DEMO_ISOLATION_REQUIRED')
    await expect(seedAcademic(config, pool, { ...process.env, DEMO_ALLOW: 'false' })).rejects.toThrow('DEMO_ISOLATION_REQUIRED')
  })
  it('prepara cinco cenários pelos contratos editoriais e repete sem apagar dados', async () => {
    const env = { ...process.env, DEMO_ALLOW: 'true' }, first = await seedAcademic(config, pool, env)
    expect(first.methods).toHaveLength(5)
    expect(Object.values(first.ids).every(ids => ids.length === 2)).toBe(true)
    const repeated = await seedAcademic(config, pool, env)
    expect(repeated.methods).toEqual(first.methods)
    expect(repeated.ids).toEqual(first.ids)
    expect(JSON.stringify(repeated)).not.toMatch(/password|csrfToken|cookie|fullProcedure/)
  }, 30000)
  it('mede 5, 100 e 500 publicações sintéticas sem contornar validação editorial', async () => {
    const previous = process.env.DEMO_ALLOW; process.env.DEMO_ALLOW = 'true'
    try {
      const demo = await seedAcademic(config, pool), result = await measureResearch(pool, demo)
      expect(result.results).toHaveLength(15)
      const directory = resolve('../.artifacts'); await mkdir(directory, { recursive: true })
      await writeFile(resolve(directory, 'performance.json'), JSON.stringify(result, null, 2))
      console.log('Medição sintética com MySQL concluída; 15 séries de 20 amostras, sem SLA de produção.')
    } finally { if (previous === undefined) delete process.env.DEMO_ALLOW; else process.env.DEMO_ALLOW = previous }
  }, 240000)
})
