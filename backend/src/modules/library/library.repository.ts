import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import { withTransaction } from '../../database/pool.js'
import { AppError } from '../../shared/errors.js'
import type { Actor } from '../identity/access.js'
import { rows } from '../commerce/commerce.offers.js'
import type { EligibleVersion, LibraryContent, LibraryEntry } from './library.contracts.js'
type Row = RowDataPacket
const iso = (value: string) => new Date(value.replace(' ', 'T') + 'Z').toISOString()
const published = (row: Row | undefined) => Boolean(row && row.deleted_at === null && row.published_at && ['PUBLISHED','SUPERSEDED'].includes(row.editorial_status))
const permitted = (sources: Row[]) => sources.length > 0 && sources.every(row => row.permission_status === 'APPROVED')
const denied = () => new AppError(403, 'PURCHASE_REQUIRED', 'Não há direito de aquisição para esta metodologia.')
const missing = () => new AppError(404, 'NOT_FOUND', 'Versão publicada não encontrada.')
const versionColumns = 'id, methodology_id, version_label, title, editorial_status, access_state, published_at, deleted_at'
export function createLibraryRepository(pool: Pool) {
  async function read<T>(actor: Actor, work: (db: PoolConnection) => Promise<T>): Promise<T> {
    try {
      return await withTransaction(pool, async db => {
        const [user] = await rows(db, 'SELECT status FROM users WHERE id = ? FOR SHARE', [actor.userId])
        if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'SESSION_REQUIRED', 'Entre novamente.')
        return work(db)
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(503, 'LIBRARY_UNAVAILABLE', 'Biblioteca temporariamente indisponível.')
    }
  }
  async function right(db: PoolConnection, actor: Actor, methodologyId: string) {
    const [entry] = await rows(db, 'SELECT e.status, e.granted_at, oi.order_id, oi.methodology_version_id, oi.version_label_snapshot, oi.title_snapshot, oi.unit_amount_centavos FROM entitlements e JOIN order_items oi ON oi.id = e.order_item_id AND oi.user_id = e.user_id AND oi.methodology_id = e.methodology_id JOIN orders o ON o.id = oi.order_id AND o.user_id = oi.user_id WHERE e.user_id = ? AND e.methodology_id = ? AND o.status = \'COMPLETED_SIMULATED\' FOR SHARE', [actor.userId, methodologyId])
    if (!entry) throw denied()
    return entry
  }
  async function context(db: PoolConnection, actor: Actor, methodologyId: string, active: boolean) {
    const entry = await right(db, actor, methodologyId)
    if (active && entry.status !== 'ACTIVE') throw new AppError(403, 'ENTITLEMENT_REVOKED', 'O direito de acesso está revogado.')
    const [method] = await rows(db, 'SELECT id, deleted_at, current_published_version_id FROM methodologies WHERE id = ? FOR SHARE', [methodologyId])
    return { entry, method }
  }
  async function version(db: PoolConnection, methodologyId: string, versionId: string) {
    const [value] = await rows(db, 'SELECT ' + versionColumns + ' FROM methodology_versions WHERE id = ? AND methodology_id = ? FOR SHARE', [versionId, methodologyId])
    return value
  }
  const sources = (db: PoolConnection, versionId: string) => rows(db, 'SELECT source_id, permission_status FROM version_sources WHERE version_id = ? ORDER BY source_id FOR SHARE', [versionId])
  async function entryDto(db: PoolConnection, actor: Actor, methodologyId: string): Promise<LibraryEntry> {
    const { entry, method } = await context(db, actor, methodologyId, false)
    const current = method?.current_published_version_id ? await version(db, methodologyId, String(method.current_published_version_id)) : undefined
    const valid = method?.deleted_at === null && published(current)
    let state: LibraryEntry['accessState'] = entry.status !== 'ACTIVE' ? 'ENTITLEMENT_REVOKED' : !valid ? 'CONTENT_UNAVAILABLE' : current?.access_state !== 'ALLOWED' ? 'CONTENT_SUSPENDED' : 'AVAILABLE'
    if (state === 'AVAILABLE' && !permitted(await sources(db, String(current!.id)))) state = 'CONTENT_UNAVAILABLE'
    return { methodologyId, entitlementStatus: entry.status, grantedAt: iso(entry.granted_at), orderId: String(entry.order_id), originalVersionId: String(entry.methodology_version_id), originalVersionLabel: entry.version_label_snapshot, title: entry.title_snapshot, originalAmountCentavos: String(entry.unit_amount_centavos), currentVersionId: valid ? String(current!.id) : null, currentVersionLabel: valid ? current!.version_label : null, accessState: state }
  }
  return {
    list: (actor: Actor, page: number, pageSize: number) => read(actor, async db => {
      // O bloqueio compartilhado do usuário exclui novas aquisições concorrentes.
      const [count] = await rows(db, 'SELECT COUNT(*) AS total FROM entitlements WHERE user_id = ?', [actor.userId])
      const found = await rows(db, 'SELECT methodology_id FROM entitlements WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?', [actor.userId, pageSize, (page - 1) * pageSize])
      const data: LibraryEntry[] = []
      for (const row of found) data.push(await entryDto(db, actor, String(row.methodology_id)))
      return { data, total: Number(count?.total ?? 0), page, pageSize }
    }),
    detail: (actor: Actor, methodologyId: string) => read(actor, db => entryDto(db, actor, methodologyId)),
    versions: (actor: Actor, methodologyId: string, page: number, pageSize: number) => read(actor, async db => {
      const { entry, method } = await context(db, actor, methodologyId, true)
      if (!method || method.deleted_at !== null) throw new AppError(403, 'CONTENT_UNAVAILABLE', 'Conteúdo indisponível.')
      // Paginação SQL, somente metadados elegíveis, sem ler o procedimento.
      const predicate = "methodology_id = ? AND deleted_at IS NULL AND published_at IS NOT NULL AND editorial_status IN ('PUBLISHED','SUPERSEDED') AND access_state = 'ALLOWED' AND EXISTS (SELECT 1 FROM version_sources s WHERE s.version_id = methodology_versions.id AND s.permission_status = 'APPROVED') AND NOT EXISTS (SELECT 1 FROM version_sources s WHERE s.version_id = methodology_versions.id AND s.permission_status <> 'APPROVED')"
      const [count] = await rows(db, 'SELECT COUNT(*) AS total FROM methodology_versions WHERE ' + predicate, [methodologyId])
      const found = await rows(db, 'SELECT ' + versionColumns + ' FROM methodology_versions WHERE ' + predicate + ' ORDER BY id DESC LIMIT ? OFFSET ? FOR SHARE', [methodologyId, pageSize, (page - 1) * pageSize])
      const data: EligibleVersion[] = found.map(item => ({ id: String(item.id), versionLabel: item.version_label, title: item.title, publishedAt: iso(item.published_at), original: String(item.id) === String(entry.methodology_version_id), current: String(item.id) === String(method.current_published_version_id) }))
      return { data, total: Number(count?.total ?? 0), page, pageSize }
    }),
    content: (actor: Actor, methodologyId: string, versionId?: string): Promise<LibraryContent> => read(actor, async db => {
      const { method } = await context(db, actor, methodologyId, true)
      if (!method || method.deleted_at !== null) throw new AppError(403, 'CONTENT_UNAVAILABLE', 'Conteúdo indisponível.')
      const selected = versionId ?? (method.current_published_version_id === null ? undefined : String(method.current_published_version_id))
      if (!selected) throw missing()
      const value = await version(db, methodologyId, selected)
      if (!published(value)) throw missing()
      if (value!.access_state !== 'ALLOWED') throw new AppError(403, 'CONTENT_SUSPENDED', 'Esta versão está suspensa. Escolha explicitamente outra versão elegível, se disponível.')
      if (!permitted(await sources(db, selected))) throw new AppError(403, 'CONTENT_UNAVAILABLE', 'As condições de acesso desta versão estão indisponíveis.')
      // Somente após todas as verificações, ler a representação integral separada.
      const [content] = await rows(db, 'SELECT full_description, full_procedure, content_format FROM methodology_contents WHERE version_id = ? FOR SHARE', [selected])
      if (!content || content.content_format !== 'PLAIN_TEXT' || !content.full_procedure) throw new AppError(403, 'CONTENT_UNAVAILABLE', 'Conteúdo indisponível.')
      const refs = await rows(db, 'SELECT s.reference_text, s.source_type, s.canonical_url, s.owner_credit, s.edition_label, vs.locator FROM version_sources vs JOIN sources s ON s.id = vs.source_id WHERE vs.version_id = ? ORDER BY s.id FOR SHARE', [selected])
      const people = await rows(db, 'SELECT c.display_name, c.contributor_type, c.reference, vc.contribution_role FROM version_contributions vc JOIN contributors c ON c.id = vc.contributor_id WHERE vc.version_id = ? ORDER BY c.id, vc.contribution_role FOR SHARE', [selected])
      return { methodologyId, selectedVersionId: selected, versionLabel: value!.version_label, title: value!.title, publishedAt: iso(value!.published_at), fullDescription: content.full_description, fullProcedure: content.full_procedure, contentFormat: 'PLAIN_TEXT', references: refs.map(row => ({ referenceText: row.reference_text, sourceType: row.source_type, canonicalUrl: row.canonical_url, ownerCredit: row.owner_credit, editionLabel: row.edition_label, locator: row.locator })), contributors: people.map(row => ({ displayName: row.display_name, contributorType: row.contributor_type, reference: row.reference, role: row.contribution_role })) }
    }),
  }
}
export type LibraryRepository = ReturnType<typeof createLibraryRepository>
