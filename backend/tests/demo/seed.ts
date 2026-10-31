import { randomBytes, randomUUID } from 'node:crypto'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import type { Config } from '../../src/config/env.js'
import { provisionInitialAdmin } from '../../src/modules/identity/admin-bootstrap.js'
import { createCatalogRepository } from '../../src/modules/catalog/catalog.repository.js'
import { facets, facetTables } from '../../src/modules/catalog/catalog.contracts.js'
import type { Facet, TermInput } from '../../src/modules/catalog/catalog.contracts.js'
import { createCommerceRepository } from '../../src/modules/commerce/commerce.repository.js'
import { academicEditor, assertDemo, demoNotice } from './examples.js'
import { informativeEditor, technicalSheets, technicalTaxonomies } from './technical-catalog.js'

export interface DemoCatalog {
  notice: string
  ids: Record<Facet, string[]>
  methods: { id: string; versionId: string; slug: string; title: string; productId: string }[]
  informativeMethods: { id: string; versionId: string; slug: string; title: string }[]
}

export const demoOperator = 'DEMO_TEST_AUTOMATION_ONLY'
const demoAmounts = ['1000', '1750', '2500', '3250', '3500'] as const

async function hasLegacySyntheticLinks(pool: Pool, versionId: string): Promise<boolean> {
  for (const facet of facets) {
    const map = facetTables[facet]
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM ' + map.link + ' x JOIN ' + map.table + " t ON t.id = x." + map.column + " WHERE x.version_id = ? AND t.code LIKE 'academic-demo-%' LIMIT 1",
      [versionId],
    )
    if (rows.length > 0) return true
  }
  return false
}

async function nextReconciledLabel(pool: Pool, methodologyId: string): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT version_label FROM methodology_versions WHERE methodology_id = ?', [methodologyId])
  const used = new Set(rows.map(row => String(row.version_label)))
  if (!used.has('v1')) return 'v1'
  for (let suffix = 1; suffix < 100; suffix++) {
    const candidate = `v1.${suffix}`
    if (!used.has(candidate)) return candidate
  }
  return 'v1-' + randomUUID().slice(0, 8)
}

export async function seedAcademic(config: Config, pool: Pool, env = process.env): Promise<DemoCatalog> {
  assertDemo(env)
  if (config.NODE_ENV !== 'test' || config.DB_NAME !== env.DB_NAME) throw new Error('DEMO_DATABASE_MISMATCH')
  const [database] = await pool.execute<RowDataPacket[]>('SELECT DATABASE() AS name')
  if (database[0]?.name !== config.DB_NAME) throw new Error('DEMO_DATABASE_MISMATCH')

  const [admins] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' AND provisioned_by = ? ORDER BY id LIMIT 1",
    [demoOperator],
  )
  let adminId: string
  if (admins.length > 0) {
    adminId = String(admins[0]!.id)
  } else {
    const [existing] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS count FROM users')
    if (Number(existing[0]?.count)) throw new Error('DEMO_REQUIRES_EMPTY_DATABASE_OR_COMPLETED_SEED')
    const email = 'demo-automation-' + randomUUID() + '@example.invalid'
    const password = randomBytes(32).toString('base64url')
    const admin = await provisionInitialAdmin(pool, config.DB_NAME, { displayName: 'Automação demonstrativa — não pessoa', email, password }, demoOperator)
    adminId = admin.id
  }

  const catalog = createCatalogRepository(pool)
  const commerce = createCommerceRepository(pool)
  const actor = () => ({ userId: adminId, requestId: randomUUID() })

  const allTaxonomies = await catalog.taxonomies(true)
  const codeToId = {} as Record<Facet, Map<string, string>>
  const result: DemoCatalog = {
    notice: demoNotice,
    ids: {} as Record<Facet, string[]>,
    methods: [],
    informativeMethods: [],
  }

  for (const facet of facets) {
    codeToId[facet] = new Map()
    result.ids[facet] = []
    const byCode = new Map(allTaxonomies[facet].map(term => [term.code, term]))

    for (const term of allTaxonomies[facet]) {
      if (term.code.startsWith('academic-demo-') && term.active) {
        await catalog.updateTerm(facet, term.id, {
          code: term.code,
          label: term.label,
          active: false,
          expectedRevision: term.revision,
          issuer: term.issuer ?? '',
          identifier: term.identifier ?? '',
          editionLabel: term.editionLabel ?? '',
          verifiedStatus: term.verifiedStatus ?? 'PENDING',
        }, actor())
      }
    }

    for (const def of technicalTaxonomies[facet]) {
      const existing = byCode.get(def.code)
      const input: TermInput = facet === 'standards'
        ? {
          code: def.code,
          label: def.label,
          active: true,
          issuer: def.issuer ?? '',
          identifier: def.identifier ?? '',
          editionLabel: def.editionLabel ?? '',
          verifiedStatus: def.verifiedStatus ?? 'VERIFIED',
        }
        : {
          code: def.code,
          label: def.label,
          active: true,
          issuer: '',
          identifier: '',
          editionLabel: '',
          verifiedStatus: 'PENDING',
        }

      if (!existing) {
        const created = await catalog.createTerm(facet, input, actor())
        codeToId[facet].set(def.code, created.id)
        result.ids[facet].push(created.id)
      } else {
        const ensured = existing.active
          ? existing
          : await catalog.updateTerm(facet, existing.id, {
            code: existing.code,
            label: existing.label,
            active: true,
            expectedRevision: existing.revision,
            issuer: existing.issuer ?? '',
            identifier: existing.identifier ?? '',
            editionLabel: existing.editionLabel ?? '',
            verifiedStatus: existing.verifiedStatus ?? 'PENDING',
          }, actor())
        codeToId[facet].set(def.code, ensured.id)
        result.ids[facet].push(ensured.id)
      }
    }
  }

  for (let index = 0; index < 5; index++) {
    const slug = 'academic-demo-' + (index + 1)
    const [existingMethod] = await pool.execute<RowDataPacket[]>(
      'SELECT id, current_published_version_id FROM methodologies WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
      [slug],
    )
    let methodId: string
    let versionId: string
    let title: string

    if (existingMethod.length === 0) {
      const created = await catalog.createMethod(slug, actor())
      const draft = await catalog.createVersion(created.id, { versionLabel: 'v1' }, actor())
      const editor = academicEditor(index)
      const saved = await catalog.saveVersion(draft.id, { ...editor, expectedRevision: draft.revision }, actor())
      const published = await catalog.publish(draft.id, {
        expectedRevision: saved.revision,
        reviewNote: 'Conferência automatizada de fixture original de software. Não representa revisão humana, validade científica, licença externa ou autorização comercial. ' + demoNotice,
      }, actor())
      methodId = created.id
      versionId = published.id
      title = published.title
    } else {
      methodId = String(existingMethod[0]!.id)
      const currentVersionId = existingMethod[0]!.current_published_version_id === null
        ? null
        : String(existingMethod[0]!.current_published_version_id)
      const needsReconcile = !currentVersionId || await hasLegacySyntheticLinks(pool, currentVersionId)
      if (needsReconcile) {
        const label = await nextReconciledLabel(pool, methodId)
        const draft = await catalog.createVersion(methodId, { versionLabel: label }, actor())
        const editor = academicEditor(index, undefined, label)
        const saved = await catalog.saveVersion(draft.id, { ...editor, expectedRevision: draft.revision }, actor())
        const published = await catalog.publish(draft.id, {
          expectedRevision: saved.revision,
          reviewNote: 'Reconciliação automatizada de fixture sintética sem termos artificiais na taxonomia ativa. ' + demoNotice,
        }, actor())
        versionId = published.id
        title = published.title
      } else {
        const [vRows] = await pool.execute<RowDataPacket[]>('SELECT id, title FROM methodology_versions WHERE id = ? LIMIT 1', [currentVersionId])
        versionId = String(vRows[0]!.id)
        title = String(vRows[0]!.title)
      }
    }

    const products = await commerce.listProducts(1, 5, methodId)
    let product = products.data[0]
    if (!product) {
      product = await commerce.createProduct(methodId, actor())
    }
    if (!product.offer.priceId) {
      product = await commerce.createPrice(product.id, { expectedRevision: product.revision, amountCentavos: demoAmounts[index]!, currency: 'BRL' }, actor())
    }
    if (!product.active) {
      product = await commerce.updateProduct(product.id, { expectedRevision: product.revision, active: true }, actor())
    }
    result.methods.push({ id: methodId, versionId, slug, title, productId: product.id })
  }

  for (const sheet of technicalSheets) {
    const [existingMethod] = await pool.execute<RowDataPacket[]>(
      'SELECT id, current_published_version_id FROM methodologies WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
      [sheet.slug],
    )
    let methodId: string
    let versionId: string
    let title: string

    if (existingMethod.length === 0) {
      const created = await catalog.createMethod(sheet.slug, actor())
      const draft = await catalog.createVersion(created.id, { versionLabel: 'v1' }, actor())
      const editor = informativeEditor(sheet, codeToId)
      const saved = await catalog.saveVersion(draft.id, { ...editor, expectedRevision: draft.revision }, actor())
      const published = await catalog.publish(draft.id, {
        expectedRevision: saved.revision,
        reviewNote: 'Conferência automatizada estrutural de ficha técnica informativa com referência pública verificada. Não representa revisão humana científica nem habilita oferta comercial.',
      }, actor())
      methodId = created.id
      versionId = published.id
      title = published.title
    } else {
      methodId = String(existingMethod[0]!.id)
      const currentVersionId = existingMethod[0]!.current_published_version_id === null
        ? null
        : String(existingMethod[0]!.current_published_version_id)
      if (!currentVersionId) {
        const label = await nextReconciledLabel(pool, methodId)
        const draft = await catalog.createVersion(methodId, { versionLabel: label }, actor())
        const editor = informativeEditor(sheet, codeToId)
        const saved = await catalog.saveVersion(draft.id, { ...editor, expectedRevision: draft.revision }, actor())
        const published = await catalog.publish(draft.id, {
          expectedRevision: saved.revision,
          reviewNote: 'Conferência automatizada estrutural de ficha técnica informativa com referência pública verificada. Não representa revisão humana científica nem habilita oferta comercial.',
        }, actor())
        versionId = published.id
        title = published.title
      } else {
        const [vRows] = await pool.execute<RowDataPacket[]>('SELECT id, title FROM methodology_versions WHERE id = ? LIMIT 1', [currentVersionId])
        versionId = String(vRows[0]!.id)
        title = String(vRows[0]!.title)
      }
    }

    const [unexpectedProducts] = await pool.execute<RowDataPacket[]>('SELECT id FROM products WHERE methodology_id = ? LIMIT 1', [methodId])
    if (unexpectedProducts.length > 0) throw new Error('INFORMATIVE_SHEET_MUST_NOT_HAVE_COMMERCIAL_PRODUCT')

    result.informativeMethods.push({ id: methodId, versionId, slug: sheet.slug, title })
  }

  const [done] = await pool.execute<RowDataPacket[]>("SELECT id FROM audit_events WHERE action = 'ACADEMIC_DEMO_PREPARED' LIMIT 1")
  if (done.length === 0) {
    await pool.execute(
      "INSERT INTO audit_events (actor_user_id, action, target_type, target_id, request_id, occurred_at) VALUES (?, 'ACADEMIC_DEMO_PREPARED', 'demo', 'isolated-test', ?, UTC_TIMESTAMP(6))",
      [adminId, randomUUID()],
    )
  }

  return result
}
