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
const standaloneSymbol = (field: string) => 'REGEXP_LIKE(CONVERT(' + field + ' USING utf8mb4) COLLATE utf8mb4_0900_as_ci, ?)'

export interface TokenExpansion { terms: readonly string[]; symbol?: string }

// Símbolos químicos curtos colidem por substring com palavras comuns em português
// (ex.: "fe" em "referência"/"efluentes", "cu" em "curadoria"); por isso não usam
// LIKE '%fe%' aberto em prosa, mas termos canônicos + símbolo isolado sensível à caixa.
// Palavras ambíguas do idioma ("as") e letras isoladas ("p", "f", "n") não são expandidas.
const shortElementAliases: Readonly<Record<string, TokenExpansion>> = {
  fe: { terms: ['ferro', 'fe²⁺', 'fe2+', 'fe(ii)', 'fe(iii)'], symbol: 'Fe' },
  cu: { terms: ['cobre', 'cu²⁺', 'cu2+', 'cu(ii)'], symbol: 'Cu' },
  pb: { terms: ['chumbo', 'pb²⁺', 'pb2+', 'pb(ii)'], symbol: 'Pb' },
  zn: { terms: ['zinco', 'zn²⁺', 'zn2+', 'zn(ii)'], symbol: 'Zn' },
  hg: { terms: ['mercúrio', 'hg²⁺', 'hg2+', 'hg(ii)'], symbol: 'Hg' },
  mn: { terms: ['manganês', 'mn²⁺', 'mn2+', 'mn(ii)'], symbol: 'Mn' },
  cr: { terms: ['cromo hexavalente', 'cr(vi)', 'cr6+'], symbol: 'Cr' },
}

const domainSynonyms: Readonly<Record<string, TokenExpansion>> = {
  ferro: { terms: ['ferro', 'fe²⁺', 'fe(ii)'], symbol: 'Fe' },
  'fe2+': { terms: ['fe2+', 'fe²⁺', 'ferro', 'fe(ii)'] },
  'fe²⁺': { terms: ['fe²⁺', 'fe2+', 'ferro', 'fe(ii)'] },
  'fe(ii)': { terms: ['fe(ii)', 'fe²⁺', 'fe2+', 'ferro'] },
  'fe3+': { terms: ['fe3+', 'fe³⁺', 'ferro', 'fe(iii)'] },
  'fe³⁺': { terms: ['fe³⁺', 'fe3+', 'ferro', 'fe(iii)'] },
  'fe(iii)': { terms: ['fe(iii)', 'fe³⁺', 'fe3+', 'ferro'] },
  fenantrolina: { terms: ['fenantrolina', 'phenanthroline'] },
  '1,10-fenantrolina': { terms: ['1,10-fenantrolina', 'fenantrolina', 'phenanthroline'] },
  'o-fenantrolina': { terms: ['o-fenantrolina', 'fenantrolina', 'phenanthroline'] },
  phenanthroline: { terms: ['phenanthroline', 'fenantrolina'] },
  'uv-vis': { terms: ['uv-vis', 'uv/vis'] },
  'uv/vis': { terms: ['uv/vis', 'uv-vis'] },
  uvvis: { terms: ['uvvis', 'uv-vis', 'uv/vis'] },
  'gc-ms': { terms: ['gc-ms', 'gc/ms'] },
  'gc/ms': { terms: ['gc/ms', 'gc-ms'] },
  gcms: { terms: ['gcms', 'gc-ms', 'gc/ms'] },
  'icp-oes': { terms: ['icp-oes', 'icp-aes'] },
  'icp-aes': { terms: ['icp-aes', 'icp-oes'] },
  'icp/oes': { terms: ['icp/oes', 'icp-oes', 'icp-aes'] },
  'icp/aes': { terms: ['icp/aes', 'icp-aes', 'icp-oes'] },
  'icp-ms': { terms: ['icp-ms', 'icp/ms'] },
  'icp/ms': { terms: ['icp/ms', 'icp-ms'] },
  'cl-': { terms: ['cl-', 'cl⁻', 'cloreto'] },
  'cl⁻': { terms: ['cl⁻', 'cl-', 'cloreto'] },
  'f-': { terms: ['f-', 'f⁻', 'fluoreto'] },
  'f⁻': { terms: ['f⁻', 'f-', 'fluoreto'] },
  no3: { terms: ['no3', 'no₃⁻', 'nitrato'] },
  'no3-': { terms: ['no3-', 'no₃⁻', 'nitrato'] },
  'no₃⁻': { terms: ['no₃⁻', 'no3-', 'nitrato'] },
  no2: { terms: ['no2', 'no₂⁻', 'nitrito'] },
  'no2-': { terms: ['no2-', 'no₂⁻', 'nitrito'] },
  'no₂⁻': { terms: ['no₂⁻', 'no2-', 'nitrito'] },
  so4: { terms: ['so4', 'so₄²⁻', 'sulfato'] },
  'so42-': { terms: ['so42-', 'so₄²⁻', 'sulfato'] },
  'so₄²⁻': { terms: ['so₄²⁻', 'so42-', 'sulfato'] },
  po4: { terms: ['po4', 'po₄³⁻', 'fosfato', 'fósforo'] },
  'po43-': { terms: ['po43-', 'po₄³⁻', 'fosfato', 'fósforo'] },
  'po₄³⁻': { terms: ['po₄³⁻', 'po43-', 'fosfato', 'fósforo'] },
  nh3: { terms: ['nh3', 'nh₃-n', 'amoniacal', 'amônia'] },
  'nh3-n': { terms: ['nh3-n', 'nh₃-n', 'amoniacal', 'amônia'] },
  'nh₃-n': { terms: ['nh₃-n', 'nh3-n', 'amoniacal', 'amônia'] },
  'cr(vi)': { terms: ['cr(vi)', 'cromo hexavalente'] },
  'cr6+': { terms: ['cr6+', 'cr(vi)', 'cromo hexavalente'] },
  voc: { terms: ['voc', 'compostos orgânicos voláteis', 'volatile organic compounds'] },
  vocs: { terms: ['vocs', 'compostos orgânicos voláteis', 'volatile organic compounds'] },
  cov: { terms: ['cov', 'compostos orgânicos voláteis'] },
  covs: { terms: ['covs', 'compostos orgânicos voláteis'] },
  pah: { terms: ['pah', 'hidrocarbonetos policíclicos aromáticos', 'polynuclear aromatic hydrocarbons'] },
  pahs: { terms: ['pahs', 'hidrocarbonetos policíclicos aromáticos', 'polynuclear aromatic hydrocarbons'] },
  hpa: { terms: ['hpa', 'hidrocarbonetos policíclicos aromáticos'] },
  hpas: { terms: ['hpas', 'hidrocarbonetos policíclicos aromáticos'] },
  dqo: { terms: ['dqo', 'demanda química de oxigênio'] },
  cod: { terms: ['cod', 'demanda química de oxigênio', 'chemical oxygen demand'] },
}

export function normalizeSearchWord(raw: string): string {
  let token = raw.replace(/^[,;]+|[,;]+$/g, '')
  if (token.startsWith('(') && token.endsWith(')') && token.length > 2 && !token.slice(1, -1).includes('(') && !token.slice(1, -1).includes(')')) {
    token = token.slice(1, -1)
  }
  return token || raw
}

export function resolveSearchToken(raw: string): TokenExpansion {
  const token = normalizeSearchWord(raw)
  const key = token.normalize('NFC').toLowerCase()
  return shortElementAliases[key] ?? domainSynonyms[key] ?? { terms: [token] }
}

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
  for (const rawWord of query.q ? query.q.split(' ') : []) {
    const { terms, symbol } = resolveSearchToken(rawWord)
    const symbolBoundary = symbol ? '(^|[^[:alnum:]])' + symbol + '([^[:alnum:]]|$)' : null
    const fields = ['v.title', 'v.free_summary', 'v.public_description']
    const matches: string[] = []
    for (const term of terms) {
      for (const field of fields) { params.push(literalPattern(term)); matches.push(like(field)) }
    }
    if (symbolBoundary) {
      for (const field of fields) { params.push(symbolBoundary); matches.push(standaloneSymbol(field)) }
    }
    for (const facet of facets) {
      const map = facetTables[facet]
      const termFields = ['t.label', 't.code', ...(facet === 'standards' ? ['t.issuer', 't.identifier', 't.edition_label'] : [])]
      const facetChecks: string[] = []
      for (const term of terms) {
        for (const field of termFields) { params.push(literalPattern(term)); facetChecks.push(like(field)) }
      }
      if (symbolBoundary) {
        params.push(symbolBoundary); facetChecks.push(standaloneSymbol('t.label'))
        params.push(symbol!.toLowerCase()); facetChecks.push('LOWER(t.code) = ?')
      }
      matches.push('EXISTS (SELECT 1 FROM ' + map.link + ' x JOIN ' + map.table + ' t ON t.id = x.' + map.column + ' AND t.active = TRUE WHERE x.version_id = v.id AND (' + facetChecks.join(' OR ') + '))')
    }
    const referenceFields = ['s.reference_text', 's.owner_credit', 's.edition_label', 'vs.locator']
    const refChecks: string[] = []
    for (const term of terms) {
      for (const field of referenceFields) { params.push(literalPattern(term)); refChecks.push(like(field)) }
    }
    matches.push("EXISTS (SELECT 1 FROM version_sources vs JOIN sources s ON s.id = vs.source_id WHERE vs.version_id = v.id AND vs.permission_status = 'APPROVED' AND (" + refChecks.join(' OR ') + '))')
    conditions.push('(' + matches.join(' OR ') + ')')
  }
  return { sql: conditions.join(' AND '), params }
}
