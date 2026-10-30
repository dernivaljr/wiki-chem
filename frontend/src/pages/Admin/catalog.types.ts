import type { Facet, Contributor } from '../../catalog/types'
export { facets, labels } from '../../catalog/types'
export type { Facet, Term, Taxonomies, Contributor, Page } from '../../catalog/types'
export interface Methodology { id: string; slug: string; lifecycle: 'DRAFT' | 'PUBLISHED' | 'RETIRED'; revision: number; currentPublishedVersionId: string | null }
export interface Source {
  referenceText: string; sourceType: 'ORIGINAL' | 'REFERENCE'; canonicalUrl: string; ownerCredit: string; editionLabel: string; locator: string
  usageConditions: string; permissionStatus: 'PENDING' | 'APPROVED' | 'REJECTED'; permissionEvidence: string; permissionAcknowledged: boolean
}
export interface Editor {
  title: string; freeSummary: string; publicDescription: string; fullDescription: string; fullProcedure: string; changelog: string
  classifications: Record<Facet, string[]>; notApplicable: Record<Facet, string>; sources: Source[]; contributors: Contributor[]
}
export interface VersionSummary {
  id: string; methodologyId: string; versionLabel: string; title: string; editorialStatus: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED'; revision: number
  publishedAt: string | null; reviewedBy: string | null; reviewedAt: string | null; reviewedRevision: number | null; reviewNote: string | null
}
export type Version = VersionSummary & Editor
export const toEditor = (version: Version): Editor => ({
  title: version.title, freeSummary: version.freeSummary, publicDescription: version.publicDescription,
  fullDescription: version.fullDescription, fullProcedure: version.fullProcedure, changelog: version.changelog,
  classifications: structuredClone(version.classifications), notApplicable: { ...version.notApplicable },
  sources: version.sources.map(source => ({ ...source })), contributors: version.contributors.map(item => ({ ...item })),
})
