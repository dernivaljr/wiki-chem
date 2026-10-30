export const facets = ['techniques', 'technologies', 'equipment', 'matrices', 'analytes', 'standards', 'segments'] as const
export type Facet = typeof facets[number]
export const labels: Record<Facet, string> = { techniques: 'Técnicas', technologies: 'Tecnologias', equipment: 'Equipamentos', matrices: 'Matrizes', analytes: 'Analitos', standards: 'Normas', segments: 'Segmentos' }
export interface Term { id: string; code: string; label: string; active: boolean; revision: number; issuer?: string; identifier?: string; editionLabel?: string; verifiedStatus?: 'PENDING' | 'VERIFIED' }
export type Taxonomies = Record<Facet, Term[]>
export interface Methodology { id: string; slug: string; lifecycle: 'DRAFT' | 'PUBLISHED' | 'RETIRED'; revision: number; currentPublishedVersionId: string | null }
export interface Source {
  referenceText: string; sourceType: 'ORIGINAL' | 'REFERENCE'; canonicalUrl: string; ownerCredit: string; editionLabel: string; locator: string
  usageConditions: string; permissionStatus: 'PENDING' | 'APPROVED' | 'REJECTED'; permissionEvidence: string; permissionAcknowledged: boolean
}
export interface Contributor { displayName: string; contributorType: 'PERSON' | 'ORGANIZATION'; reference: string; role: 'AUTHOR' | 'CURATOR' }
export interface Editor {
  title: string; freeSummary: string; publicDescription: string; fullDescription: string; fullProcedure: string; changelog: string
  classifications: Record<Facet, string[]>; notApplicable: Record<Facet, string>; sources: Source[]; contributors: Contributor[]
}
export interface VersionSummary {
  id: string; methodologyId: string; versionLabel: string; title: string; editorialStatus: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED'; revision: number
  publishedAt: string | null; reviewedBy: string | null; reviewedAt: string | null; reviewedRevision: number | null; reviewNote: string | null
}
export type Version = VersionSummary & Editor
export interface Page<T> { data: T[]; page: number; pageSize: number; total: number }
export const toEditor = (version: Version): Editor => ({
  title: version.title, freeSummary: version.freeSummary, publicDescription: version.publicDescription,
  fullDescription: version.fullDescription, fullProcedure: version.fullProcedure, changelog: version.changelog,
  classifications: structuredClone(version.classifications), notApplicable: { ...version.notApplicable },
  sources: version.sources.map(source => ({ ...source })), contributors: version.contributors.map(item => ({ ...item })),
})
