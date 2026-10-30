import type { Editor, TermInput, Facet } from './catalog.contracts.js'
import { facets } from './catalog.contracts.js'
import { AppError } from '../../shared/errors.js'

export function validateTerm(facet: Facet, term: TermInput) {
  if (facet === 'standards') {
    if (!term.issuer || !term.identifier || !term.editionLabel) throw new AppError(400, 'STANDARD_INCOMPLETE', 'Norma exige emissor, identificador e edição verificáveis.')
  } else if (term.issuer || term.identifier || term.editionLabel || term.verifiedStatus !== 'PENDING') {
    throw new AppError(400, 'INVALID_TAXONOMY_FIELDS', 'Campos de norma só são aceitos na classificação de normas.')
  }
}
export function validatePublication(editor: Editor) {
  const details: { field: string; reason: string }[] = []
  for (const key of ['title', 'freeSummary', 'publicDescription', 'fullDescription', 'fullProcedure', 'changelog'] as const) {
    if (!editor[key].trim()) details.push({ field: key, reason: 'Preenchimento obrigatório.' })
  }
  for (const facet of facets) {
    if (editor.classifications[facet].length === 0 && !editor.notApplicable[facet].trim()) details.push({ field: facet, reason: 'Selecione termos ou justifique a não aplicabilidade.' })
    if (editor.classifications[facet].length && editor.notApplicable[facet].trim()) details.push({ field: facet, reason: 'Classificação e não aplicabilidade não podem coexistir.' })
  }
  if (!editor.sources.length) details.push({ field: 'sources', reason: 'Registre a origem e as condições de uso.' })
  for (const [index, source] of editor.sources.entries()) {
    if (!source.referenceText || !source.ownerCredit || !source.locator || !source.usageConditions || !source.permissionEvidence ||
      source.permissionStatus !== 'APPROVED' || !source.permissionAcknowledged) {
      details.push({ field: 'sources.' + index, reason: 'Origem, localizador, condições e evidência verificados são obrigatórios.' })
    }
  }
  for (const role of ['AUTHOR', 'CURATOR'] as const) if (!editor.contributors.some(item => item.role === role)) {
    details.push({ field: 'contributors', reason: 'Registre autoria e curadoria identificáveis.' })
  }
  if (details.length) throw new AppError(409, 'PUBLICATION_INCOMPLETE', 'Publicação bloqueada: revise os campos obrigatórios, classificações e condições de uso.', details)
}
export const emptyEditor = (): Editor => ({
  title: '', freeSummary: '', publicDescription: '', fullDescription: '', fullProcedure: '', changelog: '',
  classifications: { techniques: [], technologies: [], equipment: [], matrices: [], analytes: [], standards: [], segments: [] },
  notApplicable: { techniques: '', technologies: '', equipment: '', matrices: '', analytes: '', standards: '', segments: '' },
  sources: [], contributors: [],
})
