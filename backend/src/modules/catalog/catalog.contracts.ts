import { z } from 'zod'
import { id, revision } from '../../shared/identifiers.js'
export { id, revision } from '../../shared/identifiers.js'
import { offerSchema } from '../commerce/commerce.contracts.js'

export const facets = ['techniques', 'technologies', 'equipment', 'matrices', 'analytes', 'standards', 'segments'] as const
export type Facet = typeof facets[number]
export const facetSchema = z.enum(facets)
export const facetTables = {
  techniques: { table: 'techniques', link: 'version_techniques', column: 'technique_id' },
  technologies: { table: 'technologies', link: 'version_technologies', column: 'technology_id' },
  equipment: { table: 'equipment', link: 'version_equipment', column: 'equipment_id' },
  matrices: { table: 'matrices', link: 'version_matrices', column: 'matrix_id' },
  analytes: { table: 'analytes', link: 'version_analytes', column: 'analyte_id' },
  standards: { table: 'standards', link: 'version_standards', column: 'standard_id' },
  segments: { table: 'segments', link: 'version_segments', column: 'segment_id' },
} as const
export const idParams = z.strictObject({ id })
export const paging = z.strictObject({ page: z.coerce.number().int().min(1).max(1000000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) })
const text = (max: number) => z.string().max(max).default('')
const trimmed = (max: number) => z.string().trim().max(max).default('')
const url = trimmed(2000).refine(value => {
  if (!value) return true
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password } catch { return false }
}, 'URL HTTP(S) sem credenciais')
export const termInput = z.strictObject({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/),
  label: z.string().trim().min(1).max(160),
  active: z.boolean().default(true),
  issuer: trimmed(120), identifier: trimmed(120), editionLabel: trimmed(80),
  verifiedStatus: z.enum(['PENDING', 'VERIFIED']).default('PENDING'),
})
export const termPatch = termInput.extend({ expectedRevision: revision })
export type TermInput = z.infer<typeof termInput>
export const termSchema = z.strictObject({
  id, code: z.string(), label: z.string(), active: z.boolean(), revision,
  issuer: z.string().optional(), identifier: z.string().optional(), editionLabel: z.string().optional(),
  verifiedStatus: z.enum(['PENDING', 'VERIFIED']).optional(),
})
export type Term = z.infer<typeof termSchema>
export const classifications = z.strictObject({
  techniques: z.array(id).max(20), technologies: z.array(id).max(20), equipment: z.array(id).max(20),
  matrices: z.array(id).max(20), analytes: z.array(id).max(20), standards: z.array(id).max(20), segments: z.array(id).max(20),
})
export const classificationNotes = z.strictObject({
  techniques: trimmed(1000), technologies: trimmed(1000), equipment: trimmed(1000),
  matrices: trimmed(1000), analytes: trimmed(1000), standards: trimmed(1000), segments: trimmed(1000),
})
export const sourceInput = z.strictObject({
  referenceText: trimmed(4000), sourceType: z.enum(['ORIGINAL', 'REFERENCE']).default('REFERENCE'),
  canonicalUrl: url, ownerCredit: trimmed(300), editionLabel: trimmed(120), locator: trimmed(1000),
  usageConditions: trimmed(4000), permissionStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  permissionEvidence: trimmed(2000), permissionAcknowledged: z.boolean().default(false),
})
export const contributorInput = z.strictObject({
  displayName: z.string().trim().min(1).max(160), contributorType: z.enum(['PERSON', 'ORGANIZATION']),
  reference: trimmed(1000), role: z.enum(['AUTHOR', 'CURATOR']),
})
export const editorShape = {
  title: trimmed(200), freeSummary: trimmed(4000), publicDescription: trimmed(8000),
  fullDescription: text(16000), fullProcedure: text(64000), changelog: trimmed(2000),
  classifications, notApplicable: classificationNotes,
  sources: z.array(sourceInput).max(20), contributors: z.array(contributorInput).max(20),
}
export const editorInput = z.strictObject(editorShape)
export type Editor = z.infer<typeof editorInput>
export const versionPatch = editorInput.extend({ expectedRevision: revision }).superRefine((data, ctx) => {
  for (const facet of facets) if (new Set(data.classifications[facet]).size !== data.classifications[facet].length) {
    ctx.addIssue({ code: 'custom', path: ['classifications', facet], message: 'Classificação duplicada' })
  }
  const sources = data.sources.map(source => JSON.stringify([source.referenceText, source.sourceType, source.canonicalUrl, source.ownerCredit, source.editionLabel]))
  if (new Set(sources).size !== sources.length) ctx.addIssue({ code: 'custom', path: ['sources'], message: 'Fonte duplicada' })
  const authors = data.contributors.map(item => JSON.stringify([item.displayName, item.contributorType, item.reference, item.role]))
  if (new Set(authors).size !== authors.length) ctx.addIssue({ code: 'custom', path: ['contributors'], message: 'Contribuição duplicada' })
})
export const methodInput = z.strictObject({ slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{0,79}$/) })
export const methodPatch = z.strictObject({ expectedRevision: revision, slug: methodInput.shape.slug.optional(), retired: z.boolean().optional() })
  .refine(value => value.slug !== undefined || value.retired !== undefined)
export const newVersion = z.strictObject({
  versionLabel: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$/), basedOnVersionId: id.optional(),
})
export const publishInput = z.strictObject({ expectedRevision: revision, reviewAcknowledged: z.literal(true), reviewNote: z.string().trim().min(1).max(2000) })
export const expectedRevision = z.strictObject({ expectedRevision: revision })
export const methodSchema = z.strictObject({
  id, slug: z.string(), lifecycle: z.enum(['DRAFT', 'PUBLISHED', 'RETIRED']), revision, currentPublishedVersionId: id.nullable(),
})
export type Methodology = z.infer<typeof methodSchema>
export const versionSummarySchema = z.strictObject({
  id, methodologyId: id, versionLabel: z.string(), title: z.string(),
  editorialStatus: z.enum(['DRAFT', 'PUBLISHED', 'SUPERSEDED']), revision,
  publishedAt: z.string().nullable(), reviewedBy: id.nullable(), reviewedAt: z.string().nullable(), reviewedRevision: revision.nullable(), reviewNote: z.string().nullable(),
})
export const versionSchema = versionSummarySchema.extend(editorShape)
export type Version = z.infer<typeof versionSchema>
export const taxonomiesSchema = z.strictObject({
  techniques: z.array(termSchema), technologies: z.array(termSchema), equipment: z.array(termSchema),
  matrices: z.array(termSchema), analytes: z.array(termSchema), standards: z.array(termSchema), segments: z.array(termSchema),
})
export type Taxonomies = z.infer<typeof taxonomiesSchema>
export const previewSchema = z.strictObject({
  offer: offerSchema.nullable(), purchasable: z.boolean(),
  id, versionId: id, versionLabel: z.string(), title: z.string(), freeSummary: z.string(), publicDescription: z.string(),
  technicalMetadata: taxonomiesSchema,
  contributors: z.array(contributorInput),
  references: z.array(z.strictObject({ referenceText: z.string(), sourceType: z.enum(['ORIGINAL', 'REFERENCE']), canonicalUrl: z.string(), ownerCredit: z.string(), editionLabel: z.string(), locator: z.string() })),
})
export const paged = <T extends z.ZodType>(schema: T) => z.strictObject({ data: z.array(schema), page: z.number(), pageSize: z.number(), total: z.number() })
const filterIds = z.preprocess(value => typeof value === 'string' ? [value] : value,
  z.array(id).max(20).refine(values => new Set(values).size === values.length, 'Filtro duplicado').default([]))
export const searchQuery = paging.extend({
  q: z.string().max(200).default('').transform(value => value.normalize('NFC').trim().replace(/\s+/gu, ' '))
    .refine(value => !/[\p{Cc}]/u.test(value) && (!value || value.split(' ').length <= 12), 'Use até 12 palavras, sem caracteres de controle'),
  techniqueIds: filterIds, technologyIds: filterIds, equipmentIds: filterIds, matrixIds: filterIds,
  analyteIds: filterIds, standardIds: filterIds, segmentIds: filterIds,
  sort: z.enum(['title_asc', 'updated_desc']).default('title_asc'),
})
export type SearchQuery = z.infer<typeof searchQuery>
export type Preview = z.infer<typeof previewSchema>
