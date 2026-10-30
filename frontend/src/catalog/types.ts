import type { Offer } from '../commerce/types'
export const facets = ['techniques', 'technologies', 'equipment', 'matrices', 'analytes', 'standards', 'segments'] as const
export type Facet = typeof facets[number]
export const labels: Record<Facet, string> = { techniques: 'Técnicas', technologies: 'Tecnologias', equipment: 'Equipamentos', matrices: 'Matrizes', analytes: 'Analitos', standards: 'Normas', segments: 'Segmentos' }
export interface Term { id: string; code: string; label: string; active: boolean; revision: number; issuer?: string; identifier?: string; editionLabel?: string; verifiedStatus?: 'PENDING' | 'VERIFIED' }
export type Taxonomies = Record<Facet, Term[]>
export interface Contributor { displayName: string; contributorType: 'PERSON' | 'ORGANIZATION'; reference: string; role: 'AUTHOR' | 'CURATOR' }
export interface Page<T> { data: T[]; page: number; pageSize: number; total: number }
export interface Reference { referenceText: string; sourceType: 'ORIGINAL' | 'REFERENCE'; canonicalUrl: string; ownerCredit: string; editionLabel: string; locator: string }
export interface Preview { owned: boolean; offer: Offer | null; purchasable: boolean; id: string; versionId: string; versionLabel: string; title: string; freeSummary: string; publicDescription: string; technicalMetadata: Taxonomies; contributors: Contributor[]; references: Reference[] }
