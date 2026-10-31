import { createHash } from 'node:crypto'
import type { Editor, Facet } from '../../src/modules/catalog/catalog.contracts.js'
import { facets } from '../../src/modules/catalog/catalog.contracts.js'
import { emptyEditor } from '../../src/modules/catalog/catalog.rules.js'

export const demoNotice = 'MATERIAL ACADÊMICO DEMONSTRATIVO — SEM VALIDADE ANALÍTICA OU COMERCIAL'
export const syntheticFacetReason = 'Fixture sintética de demonstração comercial de software; classificação analítica real reservada às fichas técnicas informativas.'

export function assertDemo(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== 'test' || env.MYSQL_TEST_ALLOW !== 'true' || env.DEMO_ALLOW !== 'true' || !/^wikichem_test_[a-z0-9_]+$/.test(env.DB_NAME ?? '')) throw new Error('DEMO_ISOLATION_REQUIRED')
}

export const vocabulary: Record<Facet, string[]> = {
  techniques: ['Espectrofotometria', 'Cromatografia'], technologies: ['UV-Vis', 'Separação instrumental'],
  equipment: ['Instrumento óptico genérico', 'Separador genérico'], matrices: ['Água sintética', 'Extrato sintético'],
  analytes: ['Marcador A', 'Marcador B'], standards: ['Documento de software A — não é norma analítica', 'Documento de software B — não é norma analítica'],
  segments: ['Ensino', 'Simulação de laboratório'],
}

export const demoTitles = [
  'Absorbância de marcador em água sintética',
  'Separação de marcadores em extrato sintético',
  'Comparação óptica de amostras simuladas',
  'Classificação de sinais cromatográficos fictícios',
  'Comparação multimatiz e multianalito sintética',
]

export function academicEditor(index: number, ids?: Record<Facet, string[]>, version = 'v1'): Editor {
  const base = emptyEditor()
  const classifications = ids
    ? Object.fromEntries(facets.map(facet => [facet, index === 4 && ['matrices', 'analytes'].includes(facet) ? ids[facet].slice(0, 2) : [ids[facet][index % 2]!]])) as Record<Facet, string[]>
    : base.classifications
  const notApplicable = ids
    ? base.notApplicable
    : Object.fromEntries(facets.map(facet => [facet, syntheticFacetReason])) as Record<Facet, string>
  const fullProcedure = `${demoNotice}\nPercurso de software ${version}: leia os metadados sintéticos; compare os rótulos fictícios; observe a autorização da versão; encerre a simulação. Não executar análises, preparar amostras, operar equipamento ou interpretar concentrações. Este texto original não é um procedimento laboratorial. Exemplo ${index + 1}.`
  return {
    ...base,
    classifications,
    notApplicable,
    title: `DEMO ${String(index + 1).padStart(2, '0')} — ${demoTitles[index % 5]}`,
    freeSummary: `${demoNotice}. Cenário original de teste de pesquisa e aquisição. Não contém instruções laboratoriais.`,
    publicDescription: `${demoNotice}. Os rótulos técnicos ilustram a classificação do software, sem afirmar aplicabilidade científica ou normativa.`,
    fullDescription: `${demoNotice}. Conteúdo integral original de fixture para verificar autorização. Nenhuma fonte técnica de terceiros é reproduzida.`,
    fullProcedure,
    changelog: `Fixture original ${version}; conferência automatizada estrutural, sem revisão humana científica.`,
    contributors: [
      { displayName: 'Projeto Wiki-Chem — geração de fixture de software', contributorType: 'ORGANIZATION', reference: 'backend/tests/demo/examples.ts; texto gerado para teste', role: 'AUTHOR' },
      { displayName: 'Automação de testes do Wiki-Chem', contributorType: 'ORGANIZATION', reference: 'Validação estrutural automatizada; não representa pessoa ou curadoria científica humana', role: 'CURATOR' },
    ],
    sources: [{
      referenceText: 'Texto original da fixture de software do projeto Wiki-Chem.',
      sourceType: 'ORIGINAL',
      canonicalUrl: '',
      ownerCredit: 'Projeto Wiki-Chem — material sintético gerado por software',
      editionLabel: 'DEMO-SOFTWARE-' + version,
      locator: 'backend/tests/demo/examples.ts',
      usageConditions: demoNotice + '. Exclusivo de testes isolados; não licencia nem reproduz conteúdo de terceiros.',
      permissionStatus: 'APPROVED',
      permissionEvidence: 'Origem no arquivo da fixture; integridade SHA-256 do texto original: ' + createHash('sha256').update(fullProcedure).digest('hex'),
      permissionAcknowledged: true,
    }],
  }
}
