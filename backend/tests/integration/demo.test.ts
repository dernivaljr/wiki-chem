import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { RowDataPacket } from 'mysql2/promise'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'
import { createCatalogRepository } from '../../src/modules/catalog/catalog.repository.js'
import { searchQuery } from '../../src/modules/catalog/catalog.contracts.js'
import { createIdentityRepository } from '../../src/modules/identity/identity.repository.js'
import { hashPassword } from '../../src/modules/identity/security.js'
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

  it('prepara 5 exemplos sintéticos comerciais + 15 fichas técnicas informativas, preserva contas e reconcilia idempotentemente', async () => {
    const env = { ...process.env, DEMO_ALLOW: 'true' }
    const first = await seedAcademic(config, pool, env)
    expect(first.methods).toHaveLength(5)
    expect(first.informativeMethods).toHaveLength(15)

    const identity = createIdentityRepository(pool)
    const customerEmail = 'preserve-' + randomUUID() + '@example.invalid'
    const customer = await identity.register(
      'Conta preservada na reconciliação',
      customerEmail,
      await hashPassword(randomBytes(24).toString('base64url')),
    )

    await pool.execute(
      "INSERT INTO techniques (code, label, normalized_label, active, created_at, updated_at) VALUES ('academic-demo-legacy-tech', 'DEMO — Legado artificial', 'demo — legado artificial', TRUE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))",
    )

    const repeated = await seedAcademic(config, pool, env)
    expect(repeated.methods).toEqual(first.methods)
    expect(repeated.informativeMethods).toEqual(first.informativeMethods)
    expect(repeated.ids).toEqual(first.ids)
    expect(JSON.stringify(repeated)).not.toMatch(/password|csrfToken|cookie|fullProcedure/)

    const [preservedUser] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [customer.id])
    expect(preservedUser).toHaveLength(1)

    const catalog = createCatalogRepository(pool)
    const activeTaxonomies = await catalog.taxonomies(false)
    for (const terms of Object.values(activeTaxonomies)) {
      expect(terms.length).toBeGreaterThan(0)
      expect(terms.every(term => !term.code.startsWith('academic-demo-'))).toBe(true)
    }

    const allPublished = await catalog.search(searchQuery.parse({ pageSize: 50 }))
    expect(allPublished.total).toBe(20)
    expect(allPublished.data.filter(item => item.purchasable)).toHaveLength(5)
    expect(allPublished.data.filter(item => item.offer === null && !item.purchasable)).toHaveLength(15)

    const specTech = activeTaxonomies.techniques.find(term => term.code === 'espectrofotometria-uv-vis')!
    const uvVis = activeTaxonomies.technologies.find(term => term.code === 'uv-vis')!
    const ironResult = await catalog.search(searchQuery.parse({
      q: 'ferro',
      techniqueIds: [specTech.id],
      technologyIds: [uvVis.id],
    }))
    expect(ironResult.total).toBe(1)
    expect(ironResult.data[0]!.title).toContain('1,10-fenantrolina')
    expect(ironResult.data[0]!.offer).toBeNull()
    expect(ironResult.data[0]!.purchasable).toBe(false)

    const feSymbolResult = await catalog.search(searchQuery.parse({ q: 'Fe' }))
    expect(feSymbolResult.total).toBe(3)
    expect(feSymbolResult.data.every(item => item.offer === null)).toBe(true)

    for (const normQuery of ['EPA 200.7', 'EPA 300.0', 'EPA 8260D']) {
      const found = await catalog.search(searchQuery.parse({ q: normQuery }))
      expect(found.total).toBeGreaterThanOrEqual(1)
      expect(found.data.every(item => item.offer === null && !item.purchasable)).toBe(true)
    }
  }, 60000)

  it('mede 20, 100 e 500 publicações sem contornar validação editorial', async () => {
    const previous = process.env.DEMO_ALLOW; process.env.DEMO_ALLOW = 'true'
    try {
      const demo = await seedAcademic(config, pool), result = await measureResearch(pool, demo)
      expect(result.results).toHaveLength(15)
      expect(result.dataset.methodologies).toBe(500)
      expect(result.dataset.products).toBe(5)
      const directory = resolve('../.artifacts'); await mkdir(directory, { recursive: true })
      await writeFile(resolve(directory, 'performance.json'), JSON.stringify(result, null, 2))
      console.log('Medição sintética com MySQL concluída; 15 séries de 20 amostras, sem SLA de produção.')
    } finally { if (previous === undefined) delete process.env.DEMO_ALLOW; else process.env.DEMO_ALLOW = previous }
  }, 240000)
})
