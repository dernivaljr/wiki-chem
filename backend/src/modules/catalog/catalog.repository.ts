import { loadOffers, lockProductForMethod, ownedMethods } from '../commerce/commerce.offers.js'
import { createHash } from 'node:crypto'
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import { withTransaction } from '../../database/pool.js'
import { AppError } from '../../shared/errors.js'
import { facets, facetTables } from './catalog.contracts.js'
import type { Editor, Facet, Methodology, Preview, SearchQuery, Taxonomies, Term, TermInput, Version } from './catalog.contracts.js'
import { filterKeys, placeholders, previewColumns, publishedFrom, publishedWhere, searchOrders, searchPredicate } from './catalog.search.js'
import { emptyEditor, validateTerm, validatePublication } from './catalog.rules.js'

type Db = Pool | PoolConnection
type Row = RowDataPacket
export interface Actor { userId: string; requestId: string }
const fingerprint = (values: unknown[]) => createHash('sha256').update(JSON.stringify(values)).digest('hex')
const records = async (db: Db, sql: string, values: (string | number | boolean | null)[] = []) => (await db.execute<Row[]>(sql, values))[0]
const missing = () => new AppError(404, 'NOT_FOUND', 'Registro não encontrado.')
const conflict = () => new AppError(409, 'REVISION_CONFLICT', 'O registro foi alterado. Recarregue antes de salvar.')
function sameRevision(row: Row, expected: number) { if (Number(row.revision) !== expected) throw conflict() }
const methodDto = (row: Row): Methodology => ({
  id: String(row.id), slug: row.slug, lifecycle: row.lifecycle, revision: Number(row.revision),
  currentPublishedVersionId: row.current_published_version_id === null ? null : String(row.current_published_version_id),
})
const iso = (value: string | null): string | null => value === null ? null : new Date(value.replace(' ', 'T') + (value.endsWith('Z') ? '' : 'Z')).toISOString()
const summary = (row: Row) => ({
  id: String(row.id), methodologyId: String(row.methodology_id), versionLabel: row.version_label, title: row.title,
  editorialStatus: row.editorial_status as Version['editorialStatus'], accessState: row.access_state as Version['accessState'], revision: Number(row.revision),
  publishedAt: iso(row.published_at), reviewedBy: row.reviewed_by === null ? null : String(row.reviewed_by),
  reviewedAt: iso(row.reviewed_at), reviewedRevision: row.reviewed_revision === null ? null : Number(row.reviewed_revision),
  reviewNote: row.review_note as string | null,
})
function termDto(row: Row, type: Facet): Term {
  return { id: String(row.id), code: row.code, label: row.label, active: Boolean(row.active), revision: Number(row.revision),
    ...(type === 'standards' ? { issuer: row.issuer, identifier: row.identifier, editionLabel: row.edition_label, verifiedStatus: row.verified_status } : {}) }
}
async function boundary<T>(work: () => Promise<T>): Promise<T> {
  try { return await work() } catch (error) {
    if (error instanceof AppError) throw error
    const code = (error as { code?: string }).code
    if (code === 'ER_DUP_ENTRY') throw new AppError(409, 'DUPLICATE_RECORD', 'Código, edição ou versão já cadastrados. Identidades não podem ser reutilizadas.')
    if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_ROW_IS_REFERENCED_2') throw new AppError(409, 'REFERENCE_CONFLICT', 'O vínculo informado não é válido.')
    if (code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT') throw new AppError(409, 'EDIT_CONFLICT', 'Edição concorrente. Recarregue e tente novamente.')
    throw new AppError(503, 'CATALOG_UNAVAILABLE', 'Catálogo temporariamente indisponível.')
  }
}
async function assertAdmin(db: Db, actor: Actor) {
  const [user] = await records(db, 'SELECT role, status FROM users WHERE id = ? FOR SHARE', [actor.userId])
  if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') throw new AppError(403, 'FORBIDDEN', 'Ação permitida somente a administradores.')
}
async function audit(db: Db, actor: Actor, action: string, type: string, id: string) {
  await db.execute('INSERT INTO audit_events (actor_user_id, action, target_type, target_id, request_id, occurred_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(6))',
    [actor.userId, action, type, id, actor.requestId])
}
async function methodRow(db: Db, id: string, lock = false) {
  if (lock) await lockProductForMethod(db, id)
  const [row] = await records(db, 'SELECT * FROM methodologies WHERE id = ? AND deleted_at IS NULL' + (lock ? ' FOR UPDATE' : ''), [id])
  if (!row) throw missing()
  return row
}
async function versionRow(db: Db, id: string, lock = false) {
  const [row] = await records(db, 'SELECT * FROM methodology_versions WHERE id = ? AND deleted_at IS NULL' + (lock ? ' FOR UPDATE' : ''), [id])
  if (!row) throw missing()
  await methodRow(db, String(row.methodology_id))
  return row
}
async function lockDraft(db: Db, id: string, expected: number) {
  const initial = await versionRow(db, id)
  const method = await methodRow(db, String(initial.methodology_id), true)
  const row = await versionRow(db, id, true)
  sameRevision(row, expected)
  if (row.editorial_status !== 'DRAFT') throw new AppError(409, 'VERSION_IMMUTABLE', 'Versão publicada não pode ser sobrescrita. Crie um novo rascunho.')
  return { row, method }
}
async function taxonomyCollections(db: Db, includeInactive: boolean) {
  const result = {} as Record<Facet, Term[]>
  for (const facet of facets) {
    const map = facetTables[facet]
    result[facet] = (await records(db, 'SELECT * FROM ' + map.table + (includeInactive ? '' : ' WHERE active = TRUE') + ' ORDER BY normalized_label, id'))
      .map(row => termDto(row, facet))
  }
  return result
}
// Uma consulta por coleção, independentemente da quantidade de resultados.
// A allowlist não lê conteúdo integral, evidência ou notas privadas.
async function readPreviews(db: Db, versions: Row[], userId?: string): Promise<Preview[]> {
  if (!versions.length) return []
  const ids = versions.map(row => String(row.id)), slots = placeholders(ids.length)
  const offers = await loadOffers(db, versions.map(row => String(row.methodology_id)))
  const owned = userId ? await ownedMethods(db, userId, versions.map(row => String(row.methodology_id))) : new Set<string>()
  const previews = versions.map(row => ({
    owned: owned.has(String(row.methodology_id)),
    offer: offers.get(String(row.methodology_id)) ?? null, purchasable: (offers.get(String(row.methodology_id))?.available ?? false) && !owned.has(String(row.methodology_id)), id: String(row.methodology_id), versionId: String(row.id), versionLabel: row.version_label as string,
    title: row.title as string, freeSummary: row.free_summary as string, publicDescription: row.public_description as string,
    technicalMetadata: { techniques: [], technologies: [], equipment: [], matrices: [], analytes: [], standards: [], segments: [] } as Taxonomies,
    references: [] as Preview['references'], contributors: [] as Preview['contributors'],
  }))
  const byVersion = new Map(previews.map(item => [item.versionId, item]))
  for (const facet of facets) {
    const map = facetTables[facet]
    const terms = await records(db, 'SELECT x.version_id, t.* FROM ' + map.link + ' x JOIN ' + map.table + ' t ON t.id = x.' + map.column + ' WHERE x.version_id IN (' + slots + ') ORDER BY x.version_id, t.id', ids)
    for (const row of terms) byVersion.get(String(row.version_id))!.technicalMetadata[facet].push(termDto(row, facet))
  }
  const references = await records(db, "SELECT vs.version_id, s.reference_text, s.source_type, s.canonical_url, s.owner_credit, s.edition_label, vs.locator FROM version_sources vs JOIN sources s ON s.id = vs.source_id WHERE vs.permission_status = 'APPROVED' AND vs.version_id IN (" + slots + ') ORDER BY vs.version_id, s.id', ids)
  for (const row of references) byVersion.get(String(row.version_id))!.references.push({ referenceText: row.reference_text, sourceType: row.source_type, canonicalUrl: row.canonical_url, ownerCredit: row.owner_credit, editionLabel: row.edition_label, locator: row.locator })
  const contributors = await records(db, 'SELECT vc.version_id, c.display_name, c.contributor_type, c.reference, vc.contribution_role FROM version_contributions vc JOIN contributors c ON c.id = vc.contributor_id WHERE vc.version_id IN (' + slots + ') ORDER BY vc.version_id, c.id, vc.contribution_role', ids)
  for (const row of contributors) byVersion.get(String(row.version_id))!.contributors.push({ displayName: row.display_name, contributorType: row.contributor_type, reference: row.reference, role: row.contribution_role })
  return previews
}
async function readEditor(db: Db, row: Row): Promise<Editor> {
  const result = emptyEditor()
  result.title = row.title; result.freeSummary = row.free_summary; result.publicDescription = row.public_description; result.changelog = row.changelog
  const [content] = await records(db, 'SELECT full_description, full_procedure FROM methodology_contents WHERE version_id = ? FOR SHARE', [String(row.id)])
  result.fullDescription = content?.full_description ?? ''; result.fullProcedure = content?.full_procedure ?? ''
  for (const facet of facets) {
    const map = facetTables[facet]
    const links = await records(db, 'SELECT ' + map.column + ' AS term_id FROM ' + map.link + ' WHERE version_id = ? ORDER BY ' + map.column + ' FOR SHARE', [String(row.id)])
    result.classifications[facet] = links.map(link => String(link.term_id))
  }
  const notes = await records(db, 'SELECT facet, reason FROM version_classification_notes WHERE version_id = ? FOR SHARE', [String(row.id)])
  for (const note of notes) result.notApplicable[note.facet as Facet] = note.reason
  const sources = await records(db, 'SELECT s.*, vs.locator, vs.usage_conditions_snapshot, vs.permission_status, vs.permission_evidence_ref, vs.checked_by FROM version_sources vs JOIN sources s ON s.id = vs.source_id WHERE vs.version_id = ? ORDER BY s.id FOR SHARE', [String(row.id)])
  result.sources = sources.map(source => ({
    referenceText: source.reference_text, sourceType: source.source_type, canonicalUrl: source.canonical_url, ownerCredit: source.owner_credit, editionLabel: source.edition_label,
    locator: source.locator, usageConditions: source.usage_conditions_snapshot, permissionStatus: source.permission_status,
    permissionEvidence: source.permission_evidence_ref, permissionAcknowledged: source.checked_by !== null,
  }))
  const contributors = await records(db, 'SELECT c.*, vc.contribution_role FROM version_contributions vc JOIN contributors c ON c.id = vc.contributor_id WHERE vc.version_id = ? ORDER BY c.id, vc.contribution_role FOR SHARE', [String(row.id)])
  result.contributors = contributors.map(item => ({ displayName: item.display_name, contributorType: item.contributor_type, reference: item.reference, role: item.contribution_role }))
  return result
}
async function validateReferences(db: Db, editor: Editor, publishing: boolean) {
  for (const facet of facets) {
    const ids = editor.classifications[facet]
    if (!ids.length) continue
    const terms = await records(db, 'SELECT id, active' + (facet === 'standards' ? ', verified_status' : '') + ' FROM ' + facetTables[facet].table + ' WHERE id IN (' + ids.map(() => '?').join(',') + ') ORDER BY id FOR SHARE', ids)
    if (terms.length !== ids.length || terms.some(term => !term.active)) {
      throw new AppError(publishing ? 409 : 400, 'TAXONOMY_UNAVAILABLE', 'Há termos desconhecidos ou inativos. Revise a classificação.', [{ field: facet, reason: 'Selecione termos ativos.' }])
    }
    if (publishing && facet === 'standards' && terms.some(term => term.verified_status !== 'VERIFIED')) {
      throw new AppError(409, 'STANDARD_NOT_VERIFIED', 'Publicação bloqueada: confirme identificação e edição das normas.')
    }
  }
}
async function writeEditor(db: Db, versionId: string, editor: Editor, actor: Actor) {
  await db.execute('UPDATE methodology_versions SET title = ?, free_summary = ?, public_description = ?, changelog = ? WHERE id = ?',
    [editor.title, editor.freeSummary, editor.publicDescription, editor.changelog, versionId])
  await db.execute("INSERT INTO methodology_contents (version_id, full_description, full_procedure, content_format) VALUES (?, ?, ?, 'PLAIN_TEXT') ON DUPLICATE KEY UPDATE full_description = ?, full_procedure = ?",
    [versionId, editor.fullDescription, editor.fullProcedure, editor.fullDescription, editor.fullProcedure])
  for (const facet of facets) {
    const map = facetTables[facet]
    await db.execute('DELETE FROM ' + map.link + ' WHERE version_id = ?', [versionId])
    for (const term of editor.classifications[facet]) await db.execute('INSERT INTO ' + map.link + ' (version_id, ' + map.column + ') VALUES (?, ?)', [versionId, term])
  }
  await db.execute('DELETE FROM version_classification_notes WHERE version_id = ?', [versionId])
  for (const facet of facets) if (editor.notApplicable[facet]) await db.execute('INSERT INTO version_classification_notes (version_id, facet, reason) VALUES (?, ?, ?)', [versionId, facet, editor.notApplicable[facet]])
  await db.execute('DELETE FROM version_sources WHERE version_id = ?', [versionId])
  for (const source of editor.sources) {
    if (source.permissionStatus !== 'PENDING' && (!source.permissionAcknowledged || !source.permissionEvidence || !source.usageConditions)) {
      throw new AppError(400, 'SOURCE_VERIFICATION_REQUIRED', 'Registre a verificação explícita, as condições e a evidência da fonte.')
    }
    const key = fingerprint([source.referenceText, source.sourceType, source.canonicalUrl, source.ownerCredit, source.editionLabel])
    await db.execute('INSERT INTO sources (fingerprint, reference_text, source_type, canonical_url, owner_credit, edition_label) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE fingerprint = fingerprint',
      [key, source.referenceText, source.sourceType, source.canonicalUrl, source.ownerCredit, source.editionLabel])
    const [stored] = await records(db, 'SELECT id FROM sources WHERE fingerprint = ? FOR SHARE', [key])
    if (!stored) throw new Error('SOURCE_MISSING')
    const checked = source.permissionStatus !== 'PENDING'
    await db.execute('INSERT INTO version_sources (version_id, source_id, locator, usage_conditions_snapshot, permission_status, permission_evidence_ref, checked_by, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ' + (checked ? 'UTC_TIMESTAMP(6)' : 'NULL') + ')',
      [versionId, stored.id, source.locator, source.usageConditions, source.permissionStatus, source.permissionEvidence, checked ? actor.userId : null])
  }
  await db.execute('DELETE FROM version_contributions WHERE version_id = ?', [versionId])
  for (const item of editor.contributors) {
    const key = fingerprint([item.displayName, item.contributorType, item.reference])
    await db.execute('INSERT INTO contributors (fingerprint, display_name, contributor_type, reference) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE fingerprint = fingerprint',
      [key, item.displayName, item.contributorType, item.reference])
    const [stored] = await records(db, 'SELECT id FROM contributors WHERE fingerprint = ? FOR SHARE', [key])
    if (!stored) throw new Error('CONTRIBUTOR_MISSING')
    await db.execute('INSERT INTO version_contributions (version_id, contributor_id, contribution_role, recorded_at) VALUES (?, ?, ?, UTC_TIMESTAMP(6))', [versionId, stored.id, item.role])
  }
}

export function createCatalogRepository(pool: Pool) {
  const write = <T>(actor: Actor, work: (db: PoolConnection) => Promise<T>) => boundary(() => withTransaction(pool, async db => { await assertAdmin(db, actor); return work(db) }))
  return {
    taxonomies: (includeInactive = false) => boundary(() => taxonomyCollections(pool, includeInactive)),
    async createTerm(type: Facet, input: TermInput, actor: Actor) {
      validateTerm(type, input)
      return write(actor, async db => {
        const map = facetTables[type], standard = type === 'standards'
        await db.execute('INSERT INTO ' + map.table + ' (code, label, normalized_label, active' + (standard ? ', issuer, identifier, edition_label, verified_status' : '') + ', created_at, updated_at) VALUES (?, ?, ?, ?' + (standard ? ', ?, ?, ?, ?' : '') + ', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))',
          [input.code, input.label, input.label.toLowerCase(), input.active, ...(standard ? [input.issuer, input.identifier, input.editionLabel, input.verifiedStatus] : [])])
        const [row] = await records(db, 'SELECT * FROM ' + map.table + ' WHERE code = ?', [input.code])
        if (!row) throw new Error('TERM_WRITE_MISSING')
        await audit(db, actor, 'TAXONOMY_CREATED', type, String(row.id))
        return termDto(row, type)
      })
    },
    async updateTerm(type: Facet, id: string, input: TermInput & { expectedRevision: number }, actor: Actor) {
      validateTerm(type, input)
      return write(actor, async db => {
        const map = facetTables[type]
        const [row] = await records(db, 'SELECT * FROM ' + map.table + ' WHERE id = ? FOR UPDATE', [id])
        if (!row) throw missing()
        sameRevision(row, input.expectedRevision)
        const [used] = await records(db, 'SELECT COUNT(*) AS count FROM ' + map.link + ' WHERE ' + map.column + ' = ?', [id])
        const changed = row.code !== input.code || row.label !== input.label || (type === 'standards' && (row.issuer !== input.issuer || row.identifier !== input.identifier || row.edition_label !== input.editionLabel))
        if (Number(used?.count) && changed) throw new AppError(409, 'TAXONOMY_IMMUTABLE', 'Termo vinculado não pode mudar de significado. Cadastre uma nova identidade.')
        if (type === 'standards' && row.verified_status !== input.verifiedStatus) {
          const [published] = await records(db, 'SELECT COUNT(*) AS count FROM version_standards x JOIN methodology_versions v ON v.id = x.version_id WHERE x.standard_id = ? AND v.published_at IS NOT NULL', [id])
          if (Number(published?.count)) throw new AppError(409, 'TAXONOMY_IMMUTABLE', 'A verificação histórica da norma publicada não pode ser sobrescrita.')
        }
        await db.execute('UPDATE ' + map.table + ' SET code = ?, label = ?, normalized_label = ?, active = ?, revision = revision + 1, updated_at = UTC_TIMESTAMP(6)' + (type === 'standards' ? ', issuer = ?, identifier = ?, edition_label = ?, verified_status = ?' : '') + ' WHERE id = ?',
          [input.code, input.label, input.label.toLowerCase(), input.active, ...(type === 'standards' ? [input.issuer, input.identifier, input.editionLabel, input.verifiedStatus] : []), id])
        await audit(db, actor, 'TAXONOMY_UPDATED', type, id)
        const [updated] = await records(db, 'SELECT * FROM ' + map.table + ' WHERE id = ?', [id])
        if (!updated) throw missing()
        return termDto(updated, type)
      })
    },
    async listMethods(page: number, pageSize: number) {
      return boundary(async () => {
        const [count] = await records(pool, 'SELECT COUNT(*) AS total FROM methodologies WHERE deleted_at IS NULL')
        const items = await records(pool, 'SELECT * FROM methodologies WHERE deleted_at IS NULL ORDER BY id DESC LIMIT ? OFFSET ?', [pageSize, (page - 1) * pageSize])
        return { data: items.map(methodDto), page, pageSize, total: Number(count?.total ?? 0) }
      })
    },
    getMethod: (id: string) => boundary(async () => methodDto(await methodRow(pool, id))),
    async createMethod(slug: string, actor: Actor) {
      return write(actor, async db => {
        await db.execute("INSERT INTO methodologies (slug, created_by, created_at) VALUES (?, ?, UTC_TIMESTAMP(6))", [slug, actor.userId])
        const [row] = await records(db, 'SELECT * FROM methodologies WHERE slug = ?', [slug])
        if (!row) throw missing()
        await audit(db, actor, 'METHODOLOGY_CREATED', 'methodology', String(row.id))
        return methodDto(row)
      })
    },
    async updateMethod(id: string, input: { expectedRevision: number; slug?: string | undefined; retired?: boolean | undefined }, actor: Actor) {
      return write(actor, async db => {
        const row = await methodRow(db, id, true)
        sameRevision(row, input.expectedRevision)
        const [history] = await records(db, 'SELECT COUNT(*) AS count FROM methodology_versions WHERE methodology_id = ? AND published_at IS NOT NULL', [id])
        if (input.slug && input.slug !== row.slug && Number(history?.count)) throw new AppError(409, 'METHODOLOGY_IMMUTABLE', 'Identificador de metodologia publicada não pode ser substituído.')
        const lifecycle = input.retired === undefined ? row.lifecycle : input.retired ? 'RETIRED' : row.current_published_version_id ? 'PUBLISHED' : 'DRAFT'
        await db.execute('UPDATE methodologies SET slug = ?, lifecycle = ?, revision = revision + 1 WHERE id = ?', [input.slug ?? row.slug, lifecycle, id])
        if (input.retired !== undefined) await db.execute('UPDATE products SET active = IF(?, FALSE, active), revision = revision + 1, updated_at = UTC_TIMESTAMP(6) WHERE methodology_id = ?', [input.retired, id])
        await audit(db, actor, 'METHODOLOGY_UPDATED', 'methodology', id)
        return methodDto(await methodRow(db, id))
      })
    },
    async deleteMethod(id: string, expected: number, actor: Actor) {
      return write(actor, async db => {
        const row = await methodRow(db, id, true); sameRevision(row, expected)
        const [history] = await records(db, 'SELECT COUNT(*) AS count FROM methodology_versions WHERE methodology_id = ? AND published_at IS NOT NULL', [id])
        if (Number(history?.count)) throw new AppError(409, 'PUBLISHED_HISTORY_EXISTS', 'Metodologia com histórico publicado pode ser arquivada, não excluída.')
        await db.execute('UPDATE methodology_versions SET deleted_at = UTC_TIMESTAMP(6), revision = revision + 1 WHERE methodology_id = ? AND deleted_at IS NULL', [id])
        await db.execute('UPDATE methodologies SET deleted_at = UTC_TIMESTAMP(6), revision = revision + 1 WHERE id = ?', [id])
        await db.execute('UPDATE products SET active = FALSE, revision = revision + 1, updated_at = UTC_TIMESTAMP(6) WHERE methodology_id = ?', [id])
        await audit(db, actor, 'METHODOLOGY_DELETED', 'methodology', id)
      })
    },
    async listVersions(methodologyId: string, page: number, pageSize: number) {
      return boundary(async () => {
        await methodRow(pool, methodologyId)
        const [count] = await records(pool, 'SELECT COUNT(*) AS total FROM methodology_versions WHERE methodology_id = ? AND deleted_at IS NULL', [methodologyId])
        const items = await records(pool, 'SELECT * FROM methodology_versions WHERE methodology_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT ? OFFSET ?', [methodologyId, pageSize, (page - 1) * pageSize])
        return { data: items.map(summary), page, pageSize, total: Number(count?.total ?? 0) }
      })
    },
    async getVersion(id: string, actor: Actor): Promise<Version> {
      return write(actor, async db => {
        const initial = await versionRow(db, id)
        await methodRow(db, String(initial.methodology_id), true)
        const row = await versionRow(db, id, true)
        await audit(db, actor, 'ADMIN_CONTENT_READ', 'version', id)
        return { ...summary(row), ...await readEditor(db, row) }
      })
    },
    async createVersion(methodologyId: string, input: { versionLabel: string; basedOnVersionId?: string | undefined }, actor: Actor): Promise<Version> {
      return write(actor, async db => {
        await methodRow(db, methodologyId, true)
        let editor = emptyEditor()
        if (input.basedOnVersionId) {
          const based = await versionRow(db, input.basedOnVersionId)
          if (String(based.methodology_id) !== methodologyId) throw new AppError(400, 'VERSION_OWNERSHIP_INVALID', 'A versão de origem deve pertencer à mesma metodologia.')
          editor = await readEditor(db, based)
          editor.sources = editor.sources.map(source => ({ ...source, permissionStatus: 'PENDING', permissionAcknowledged: false, permissionEvidence: '' }))
        }
        await db.execute("INSERT INTO methodology_versions (methodology_id, version_label, free_summary, public_description, changelog, created_by, created_at) VALUES (?, ?, '', '', '', ?, UTC_TIMESTAMP(6))",
          [methodologyId, input.versionLabel, actor.userId])
        const [row] = await records(db, 'SELECT * FROM methodology_versions WHERE methodology_id = ? AND version_label = ?', [methodologyId, input.versionLabel])
        if (!row) throw missing()
        await writeEditor(db, String(row.id), editor, actor)
        await audit(db, actor, 'DRAFT_CREATED', 'version', String(row.id))
        return { ...summary({ ...row, title: editor.title }), ...editor }
      })
    },
    async saveVersion(id: string, input: Editor & { expectedRevision: number }, actor: Actor): Promise<Version> {
      return write(actor, async db => {
        await lockDraft(db, id, input.expectedRevision)
        await validateReferences(db, input, false)
        await writeEditor(db, id, input, actor)
        await db.execute('UPDATE methodology_versions SET revision = revision + 1 WHERE id = ?', [id])
        await audit(db, actor, 'DRAFT_SAVED', 'version', id)
        const row = await versionRow(db, id)
        return { ...summary(row), ...await readEditor(db, row) }
      })
    },
    async deleteVersion(id: string, expected: number, actor: Actor) {
      return write(actor, async db => {
        await lockDraft(db, id, expected)
        await db.execute('UPDATE methodology_versions SET deleted_at = UTC_TIMESTAMP(6), revision = revision + 1 WHERE id = ?', [id])
        await audit(db, actor, 'DRAFT_DELETED', 'version', id)
      })
    },
    async publish(id: string, input: { expectedRevision: number; reviewNote: string }, actor: Actor): Promise<Version> {
      return write(actor, async db => {
        const { row, method } = await lockDraft(db, id, input.expectedRevision)
        if (method.lifecycle === 'RETIRED') throw new AppError(409, 'METHODOLOGY_RETIRED', 'Restaure a metodologia antes de publicar.')
        const editor = await readEditor(db, row)
        validatePublication(editor)
        await validateReferences(db, editor, true)
        if (method.current_published_version_id) await db.execute("UPDATE methodology_versions SET editorial_status = 'SUPERSEDED' WHERE id = ?", [method.current_published_version_id])
        await db.execute("UPDATE methodology_versions SET editorial_status = 'PUBLISHED', reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(6), reviewed_revision = revision, review_note = ?, published_at = UTC_TIMESTAMP(6), revision = revision + 1 WHERE id = ?", [actor.userId, input.reviewNote, id])
        await db.execute('INSERT INTO version_reviews (version_id, reviewed_revision, reviewed_by, reviewed_at, review_note) SELECT id, reviewed_revision, reviewed_by, reviewed_at, review_note FROM methodology_versions WHERE id = ?', [id])
        await db.execute("UPDATE methodologies SET current_published_version_id = ?, lifecycle = 'PUBLISHED', revision = revision + 1 WHERE id = ?", [id, method.id])
        await db.execute('UPDATE products SET revision = revision + 1, updated_at = UTC_TIMESTAMP(6) WHERE methodology_id = ?', [String(method.id)])
        await audit(db, actor, 'VERSION_PUBLISHED', 'version', id)
        return { ...summary(await versionRow(db, id)), ...editor }
      })
    },
    async setVersionAccess(id: string, input: { expectedRevision: number; accessState: 'ALLOWED' | 'SUSPENDED'; reason: string }, actor: Actor): Promise<Version> {
      return write(actor, async db => {
        const initial = await versionRow(db, id)
        await methodRow(db, String(initial.methodology_id), true)
        const row = await versionRow(db, id, true)
        sameRevision(row, input.expectedRevision)
        if (row.editorial_status === 'DRAFT' || !row.published_at) throw new AppError(409, 'VERSION_NOT_PUBLISHED', 'O controle de acesso se aplica somente a versões publicadas.')
        if (row.access_state === input.accessState) throw new AppError(409, 'ACCESS_STATE_UNCHANGED', 'A versão já possui esse estado. Recarregue antes de continuar.')
        if (Number(row.revision) >= 2147483647) throw new AppError(409, 'REVISION_LIMIT', 'Limite técnico de revisões atingido.')
        // Restaurar não altera permissões de fontes nem equivale a revisão nova.
        await db.execute('UPDATE methodology_versions SET access_state = ?, revision = revision + 1 WHERE id = ?', [input.accessState, id])
        await db.execute('UPDATE products SET revision = revision + 1, updated_at = UTC_TIMESTAMP(6) WHERE methodology_id = ?', [String(row.methodology_id)])
        await db.execute('INSERT INTO version_access_events (version_id, actor_user_id, previous_state, access_state, reason, resulting_revision, request_id, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6))', [id, actor.userId, row.access_state, input.accessState, input.reason, Number(row.revision) + 1, actor.requestId])
        await audit(db, actor, input.accessState === 'SUSPENDED' ? 'VERSION_SUSPENDED' : 'VERSION_RESTORED', 'version', id)
        const updated = await versionRow(db, id)
        return { ...summary(updated), ...await readEditor(db, updated) }
      })
    },
    async search(query: SearchQuery, userId?: string) {
      return boundary(() => withTransaction(pool, async db => {
        for (const facet of facets) {
          const ids = query[filterKeys[facet]]
          if (!ids.length) continue
          const terms = await records(db, 'SELECT id FROM ' + facetTables[facet].table + ' WHERE active = TRUE AND id IN (' + placeholders(ids.length) + ')', ids)
          if (terms.length !== ids.length) throw new AppError(400, 'INVALID_FILTER', 'Selecione classificações ativas e existentes.', [{ field: filterKeys[facet], reason: 'Filtro desconhecido ou inativo.' }])
        }
        const predicate = searchPredicate(query)
        const [count] = await records(db, 'SELECT COUNT(*) AS total' + publishedFrom + ' WHERE ' + predicate.sql, predicate.params)
        const versions = await records(db, 'SELECT ' + previewColumns + publishedFrom + ' WHERE ' + predicate.sql + ' ORDER BY ' + searchOrders[query.sort] + ' LIMIT ? OFFSET ?', [...predicate.params, query.pageSize, (query.page - 1) * query.pageSize])
        return { data: await readPreviews(db, versions, userId), total: Number(count?.total ?? 0), page: query.page, pageSize: query.pageSize }
      }, true))
    },
    async preview(methodologyId: string, userId?: string) {
      return boundary(() => withTransaction(pool, async db => {
        const versions = await records(db, 'SELECT ' + previewColumns + publishedFrom + ' WHERE m.id = ? AND ' + publishedWhere, [methodologyId])
        const [preview] = await readPreviews(db, versions, userId)
        if (!preview) throw missing()
        return preview
      }, true))
    },
  }
}
export type CatalogRepository = ReturnType<typeof createCatalogRepository>
