import { performance } from 'node:perf_hooks'
import { cpus, platform, totalmem } from 'node:os'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import { createCatalogRepository } from '../../src/modules/catalog/catalog.repository.js'
import { facets, facetTables, searchQuery } from '../../src/modules/catalog/catalog.contracts.js'
import { academicEditor, assertDemo } from './examples.js'
import type { DemoCatalog } from './seed.js'
import { demoOperator } from './seed.js'
import { searchPredicate, publishedFrom, searchOrders } from '../../src/modules/catalog/catalog.search.js'

export async function measureResearch(pool: Pool, demo: DemoCatalog) {
  assertDemo(process.env)
  const repository = createCatalogRepository(pool)
  const [users] = await pool.execute<RowDataPacket[]>("SELECT id FROM users WHERE provisioned_by = ? AND role = 'ADMIN'", [demoOperator])
  const actor = { userId: String(users[0]!.id), requestId: '00000000-0000-4000-8000-000000000010' }
  const all = Object.fromEntries(['techniqueIds', 'technologyIds', 'equipmentIds', 'matrixIds', 'analyteIds', 'standardIds', 'segmentIds'].map((key, index) => [key, [demo.ids[facets[index]!][0]!]]))
  const cases = [
    { name: 'texto com acento', value: { q: 'absorbância' } },
    { name: 'sete filtros AND', value: all },
    { name: 'matrizes e analitos OR', value: { matrixIds: demo.ids.matrices.slice(0, 2), analyteIds: demo.ids.analytes.slice(0, 2) } },
    { name: 'sem resultados', value: { q: 'inexistentetestvolume' } },
    { name: 'pagina intermediaria ordenada', value: { page: 2, pageSize: 20, sort: 'updated_desc' } },
  ]
  const results: object[] = [], seedTimes: object[] = []
  const [initialRows] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM methodologies WHERE deleted_at IS NULL')
  let count = Number(initialRows[0]?.total ?? 20)
  const baseVolume = count
  for (const volume of [baseVolume, 100, 500]) {
    const preparation = performance.now()
    for (; count < volume; count++) {
      const method = await repository.createMethod('academic-volume-' + count, actor)
      const version = await repository.createVersion(method.id, { versionLabel: 'v1' }, actor)
      const saved = await repository.saveVersion(version.id, { ...academicEditor(count % 5, demo.ids), expectedRevision: version.revision }, actor)
      await repository.publish(version.id, { expectedRevision: saved.revision, reviewNote: 'Conferência automatizada de fixture original para medição isolada; não revisão humana ou científica.' }, actor)
    }
    seedTimes.push({ volume, milliseconds: performance.now() - preparation })
    for (const scenario of cases) {
      const query = searchQuery.parse(scenario.value)
      for (let i = 0; i < 3; i++) await repository.search(query)
      const times: number[] = []; let total = 0
      for (let i = 0; i < 20; i++) {
        const started = performance.now(), result = await repository.search(query)
        times.push(performance.now() - started); total = result.total
        if (new Set(result.data.map(row => row.id)).size !== result.data.length || JSON.stringify(result).includes('fullProcedure')) throw new Error('BENCHMARK_CORRECTNESS_FAILED')
      }
      times.sort((a, b) => a - b)
      results.push({ volume, scenario: scenario.name, samples: times.length, warmups: 3, total, minMs: times[0], medianMs: (times[9]! + times[10]!) / 2, p95Ms: times[Math.ceil(times.length * 0.95) - 1], maxMs: times.at(-1) })
    }
  }
  const query = searchQuery.parse(all), predicate = searchPredicate(query)
  const [plan] = await pool.execute<RowDataPacket[]>('EXPLAIN FORMAT=JSON SELECT m.id' + publishedFrom + ' WHERE ' + predicate.sql + ' ORDER BY ' + searchOrders.title_asc + ' LIMIT ? OFFSET ?', [...predicate.params, query.pageSize, 0])
  const [database] = await pool.execute<RowDataPacket[]>('SELECT VERSION() AS version')
  let associations = 0, taxonomyTerms = 0
  for (const facet of facets) {
    const [n] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM ' + facetTables[facet].link)
    associations += Number(n[0]?.total ?? 0)
    const [t] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM ' + facetTables[facet].table + ' WHERE active = TRUE')
    taxonomyTerms += Number(t[0]?.total ?? 0)
  }
  const [methodTotal] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM methodologies WHERE deleted_at IS NULL')
  const [publishedTotal] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS total FROM methodology_versions WHERE editorial_status = 'PUBLISHED' AND deleted_at IS NULL")
  const [productTotal] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM products')
  return {
    measuredAt: new Date().toISOString(),
    environment: { node: process.version, mysql: database[0]!.version, platform: platform(), cpuModel: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem() },
    scope: 'Caso de uso de pesquisa com MySQL real; inclui consultas SQL e montagem do DTO. Exclui HTTP, rede do navegador e renderização React. Processo aquecido; ambiente compartilhado sem meta de produção.',
    dataset: {
      methodologies: Number(methodTotal[0]?.total ?? 500),
      publishedVersions: Number(publishedTotal[0]?.total ?? 500),
      taxonomyTerms,
      associations,
      informativeReferenceSheets: demo.informativeMethods.length,
      syntheticCommercialFixtures: demo.methods.length,
      products: Number(productTotal[0]?.total ?? 5),
    },
    results,
    seedTimes,
    plan: typeof plan[0]?.EXPLAIN === 'string' ? JSON.parse(plan[0].EXPLAIN) : plan[0]?.EXPLAIN,
  }
}
