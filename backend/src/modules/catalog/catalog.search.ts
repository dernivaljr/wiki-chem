import { facets, facetTables } from './catalog.contracts.js'
import type { Facet, SearchQuery } from './catalog.contracts.js'

export const filterKeys = {
  techniques: 'techniqueIds', technologies: 'technologyIds', equipment: 'equipmentIds', matrices: 'matrixIds',
  analytes: 'analyteIds', standards: 'standardIds', segments: 'segmentIds',
} as const satisfies Record<Facet, keyof SearchQuery>
export const previewColumns = 'm.id AS methodology_id, v.id, v.version_label, v.title, v.free_summary, v.public_description'
export const publishedFrom = ' FROM methodologies m JOIN methodology_versions v ON v.id = m.current_published_version_id AND v.methodology_id = m.id'
export const publishedWhere = "m.deleted_at IS NULL AND m.lifecycle = 'PUBLISHED' AND v.editorial_status = 'PUBLISHED' AND v.access_state = 'ALLOWED' AND v.deleted_at IS NULL AND EXISTS (SELECT 1 FROM version_sources approved WHERE approved.version_id = v.id AND approved.permission_status = 'APPROVED') AND NOT EXISTS (SELECT 1 FROM version_sources denied WHERE denied.version_id = v.id AND denied.permission_status <> 'APPROVED')"
export const searchOrders = { title_asc: 'v.title COLLATE utf8mb4_0900_ai_ci ASC, m.id ASC', updated_desc: 'v.published_at DESC, m.id ASC' } as const
export const placeholders = (count: number) => Array.from({ length: count }, () => '?').join(', ')
export const literalPattern = (word: string) => '%' + word.replace(/[!%_]/g, match => '!' + match) + '%'
const like = (field: string) => 'CONVERT(' + field + " USING utf8mb4) COLLATE utf8mb4_0900_ai_ci LIKE ? ESCAPE '!'"

// Somente nomes da allowlist entram no SQL. Texto, IDs e paginação são parâmetros.
// EXISTS evita multiplicar metodologias com múltiplos termos/fontes correspondentes.
export function searchPredicate(query: SearchQuery) {
  const conditions = [publishedWhere], params: string[] = []
  for (const facet of facets) {
    const ids = query[filterKeys[facet]], map = facetTables[facet]
    if (ids.length) {
      conditions.push('EXISTS (SELECT 1 FROM ' + map.link + ' f WHERE f.version_id = v.id AND f.' + map.column + ' IN (' + placeholders(ids.length) + '))')
      params.push(...ids)
    }
  }
  for (const word of query.q ? query.q.split(' ') : []) {
    const fields = ['v.title', 'v.free_summary', 'v.public_description']
    const matches = fields.map(field => { params.push(literalPattern(word)); return like(field) })
    for (const facet of facets) {
      const map = facetTables[facet]
      const termFields = ['t.label', 't.code', ...(facet === 'standards' ? ['t.issuer', 't.identifier', 't.edition_label'] : [])]
      matches.push('EXISTS (SELECT 1 FROM ' + map.link + ' x JOIN ' + map.table + ' t ON t.id = x.' + map.column + ' WHERE x.version_id = v.id AND (' + termFields.map(field => { params.push(literalPattern(word)); return like(field) }).join(' OR ') + '))')
    }
    const referenceFields = ['s.reference_text', 's.owner_credit', 's.edition_label', 'vs.locator']
    matches.push("EXISTS (SELECT 1 FROM version_sources vs JOIN sources s ON s.id = vs.source_id WHERE vs.version_id = v.id AND vs.permission_status = 'APPROVED' AND (" + referenceFields.map(field => { params.push(literalPattern(word)); return like(field) }).join(' OR ') + '))')
    conditions.push('(' + matches.join(' OR ') + ')')
  }
  return { sql: conditions.join(' AND '), params }
}
