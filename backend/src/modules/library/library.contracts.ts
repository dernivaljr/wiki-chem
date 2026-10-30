import { z } from 'zod'
import { id } from '../../shared/identifiers.js'
import { contributorInput, previewSchema } from '../catalog/catalog.contracts.js'
export const libraryParams = z.strictObject({ methodologyId: id })
export const contentQuery = z.strictObject({ versionId: id.optional() })
export const accessState = z.enum(['AVAILABLE', 'CONTENT_SUSPENDED', 'CONTENT_UNAVAILABLE', 'ENTITLEMENT_REVOKED'])
export const libraryEntry = z.strictObject({
  methodologyId: id, entitlementStatus: z.enum(['ACTIVE','REVOKED']), grantedAt: z.string(), orderId: id,
  originalVersionId: id, originalVersionLabel: z.string(), title: z.string(), originalAmountCentavos: z.string(),
  currentVersionId: id.nullable(), currentVersionLabel: z.string().nullable(), accessState,
})
export const eligibleVersion = z.strictObject({ id, versionLabel: z.string(), title: z.string(), publishedAt: z.string(), original: z.boolean(), current: z.boolean() })
export const libraryContent = z.strictObject({
  methodologyId: id, selectedVersionId: id, versionLabel: z.string(), title: z.string(), publishedAt: z.string(),
  fullDescription: z.string(), fullProcedure: z.string(), contentFormat: z.literal('PLAIN_TEXT'),
  references: previewSchema.shape.references, contributors: z.array(contributorInput),
})
export type LibraryEntry = z.infer<typeof libraryEntry>
export type EligibleVersion = z.infer<typeof eligibleVersion>
export type LibraryContent = z.infer<typeof libraryContent>
