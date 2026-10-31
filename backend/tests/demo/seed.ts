import { randomBytes, randomUUID } from 'node:crypto'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import type { Config } from '../../src/config/env.js'
import { provisionInitialAdmin } from '../../src/modules/identity/admin-bootstrap.js'
import { createCatalogRepository } from '../../src/modules/catalog/catalog.repository.js'
import { facets } from '../../src/modules/catalog/catalog.contracts.js'
import type { Facet, TermInput } from '../../src/modules/catalog/catalog.contracts.js'
import { createCommerceRepository } from '../../src/modules/commerce/commerce.repository.js'
import { academicEditor, assertDemo, demoNotice } from './examples.js'
import {
  resolveAcademicPriceCentavos,
  technicalCatalogEditor,
  technicalSheets,
  technicalTaxonomies,
  validateCommercialProductContent,
} from './technical-catalog.js'

export interface DemoCommercialMethod {
  id: string
  versionId: string
  slug: string
  title: string
  productId: string
  priceCentavos: string
}

export interface DemoInformativeMethod {
  id: string
  versionId: string
  slug: string
  title: string
}

export interface DemoRetiredMethod {
  id: string
  versionId: string
  slug: string
  title: string
  productId: string
}

export interface DemoCatalog {
  notice: string
  ids: Record<Facet, string[]>
  methods: DemoCommercialMethod[]
  informativeMethods: DemoInformativeMethod[]
  retiredLegacyMethods: DemoRetiredMethod[]
}

export const demoOperator = 'DEMO_TEST_AUTOMATION_ONLY'
const legacyDemoAmounts = ['1000', '1750', '2500', '3250', '3500'] as const

async function nextReconciledLabel(pool: Pool, methodologyId: string): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT version_label FROM methodology_versions WHERE methodology_id = ?', [methodologyId])
  const used = new Set(rows.map(row => String(row.version_label)))
  for (let major = 1; major <= 100; major++) {
    const candidate = `v${major}`
    if (!used.has(candidate)) return candidate
  }
  return 'v-' + randomUUID().slice(0, 8)
}

async function versionMatchesEditor(
  pool: Pool,
  versionId: string,
  expected: { title: string; freeSummary: string; publicDescription: string; fullDescription: string; fullProcedure: string; sourceCount: number },
): Promise<boolean> {
  const [vRows] = await pool.execute<RowDataPacket[]>(
    'SELECT v.title, v.free_summary, v.public_description, c.full_description, c.full_procedure, (SELECT COUNT(*) FROM version_sources vs WHERE vs.version_id = v.id) AS source_count FROM methodology_versions v LEFT JOIN methodology_contents c ON c.version_id = v.id WHERE v.id = ? LIMIT 1',
    [versionId],
  )
  const row = vRows[0]
  if (!row) return false
  return (
    String(row.title) === expected.title &&
    String(row.free_summary) === expected.freeSummary &&
    String(row.public_description) === expected.publicDescription &&
    String(row.full_description ?? '') === expected.fullDescription &&
    String(row.full_procedure ?? '') === expected.fullProcedure &&
    Number(row.source_count) === expected.sourceCount
  )
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
    retiredLegacyMethods: [],
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

  // Preserva os 5 registros sintéticos legados no banco (sem apagar pedidos, direitos ou histórico),
  // arquivando-os (RETIRED) para retirá-los da vitrine/pesquisa principal.
  for (let index = 0; index < 5; index++) {
    const slug = 'academic-demo-' + (index + 1)
    const [existingMethod] = await pool.execute<RowDataPacket[]>(
      'SELECT id, lifecycle, revision, current_published_version_id FROM methodologies WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
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
        reviewNote: 'Registro sintético legado preservado fora da vitrine ativa. ' + demoNotice,
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
        if (existingMethod[0]!.lifecycle === 'RETIRED') {
          await catalog.updateMethod(methodId, { expectedRevision: Number(existingMethod[0]!.revision), retired: false }, actor())
        }
        const label = await nextReconciledLabel(pool, methodId)
        const draft = await catalog.createVersion(methodId, { versionLabel: label }, actor())
        const editor = academicEditor(index, undefined, label)
        const saved = await catalog.saveVersion(draft.id, { ...editor, expectedRevision: draft.revision }, actor())
        const published = await catalog.publish(draft.id, {
          expectedRevision: saved.revision,
          reviewNote: 'Reconciliação de registro sintético legado preservado para histórico. ' + demoNotice,
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
      product = await commerce.createPrice(product.id, { expectedRevision: product.revision, amountCentavos: legacyDemoAmounts[index]!, currency: 'BRL' }, actor())
    }

    const latestMethod = await catalog.getMethod(methodId)
    if (latestMethod.lifecycle !== 'RETIRED') {
      await catalog.updateMethod(methodId, { expectedRevision: latestMethod.revision, retired: true }, actor())
    }
    result.retiredLegacyMethods.push({ id: methodId, versionId, slug, title, productId: product.id })
  }

  // Reconcilia as 15 metodologias técnicas reais com conteúdo autoral original do Wiki-Chem e preços BRL configuráveis.
  for (const sheet of technicalSheets) {
    const priceCentavos = resolveAcademicPriceCentavos(sheet, env)
    const commercial = priceCentavos !== null

    const [existingMethod] = await pool.execute<RowDataPacket[]>(
      'SELECT id, lifecycle, revision, current_published_version_id FROM methodologies WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
      [sheet.slug],
    )
    let methodId: string
    let versionId: string
    let title: string

    if (existingMethod.length === 0) {
      const created = await catalog.createMethod(sheet.slug, actor())
      const draft = await catalog.createVersion(created.id, { versionLabel: 'v1' }, actor())
      const editor = technicalCatalogEditor(sheet, codeToId, 'v1', commercial)
      const saved = await catalog.saveVersion(draft.id, { ...editor, expectedRevision: draft.revision }, actor())
      const published = await catalog.publish(draft.id, {
        expectedRevision: saved.revision,
        reviewNote: commercial
          ? 'Conferência estrutural de produto digital interpretativo original do Wiki-Chem com referência pública verificada (sem revisão científica humana).'
          : 'Catalogação referencial de metadados públicos verificados; produto autoral pendente, sem oferta comercial.',
      }, actor())
      methodId = created.id
      versionId = published.id
      title = published.title
    } else {
      methodId = String(existingMethod[0]!.id)
      if (existingMethod[0]!.lifecycle === 'RETIRED') {
        await catalog.updateMethod(methodId, { expectedRevision: Number(existingMethod[0]!.revision), retired: false }, actor())
      }
      const currentVersionId = existingMethod[0]!.current_published_version_id === null
        ? null
        : String(existingMethod[0]!.current_published_version_id)

      let matchesCurrent = false
      if (currentVersionId) {
        const [labelRow] = await pool.execute<RowDataPacket[]>('SELECT version_label, title FROM methodology_versions WHERE id = ? LIMIT 1', [currentVersionId])
        if (labelRow[0]) {
          const checkEditor = technicalCatalogEditor(sheet, codeToId, String(labelRow[0].version_label), commercial)
          matchesCurrent = await versionMatchesEditor(pool, currentVersionId, {
            title: checkEditor.title,
            freeSummary: checkEditor.freeSummary,
            publicDescription: checkEditor.publicDescription,
            fullDescription: checkEditor.fullDescription,
            fullProcedure: checkEditor.fullProcedure,
            sourceCount: checkEditor.sources.length,
          })
          if (matchesCurrent) {
            versionId = currentVersionId
            title = String(labelRow[0].title)
          }
        }
      }

      if (!matchesCurrent) {
        const label = await nextReconciledLabel(pool, methodId)
        const draft = await catalog.createVersion(methodId, { versionLabel: label }, actor())
        const editor = technicalCatalogEditor(sheet, codeToId, label, commercial)
        const saved = await catalog.saveVersion(draft.id, { ...editor, expectedRevision: draft.revision }, actor())
        const published = await catalog.publish(draft.id, {
          expectedRevision: saved.revision,
          reviewNote: commercial
            ? `Reconciliação editorial ${label}: guia técnico interpretativo original do Wiki-Chem com referência pública verificada.`
            : `Reconciliação referencial ${label}: metadados públicos verificados sem comercialização.`,
        }, actor())
        versionId = published.id
        title = published.title
      }
    }

    if (commercial) {
      const checkEditor = technicalCatalogEditor(sheet, codeToId, 'v1', true)
      validateCommercialProductContent(checkEditor)
      const products = await commerce.listProducts(1, 5, methodId)
      let product = products.data[0]
      if (!product) {
        product = await commerce.createProduct(methodId, actor())
      }
      if (product.offer.amountCentavos !== priceCentavos) {
        product = await commerce.createPrice(product.id, { expectedRevision: product.revision, amountCentavos: priceCentavos, currency: 'BRL' }, actor())
      }
      if (!product.active) {
        product = await commerce.updateProduct(product.id, { expectedRevision: product.revision, active: true }, actor())
      }
      result.methods.push({ id: methodId, versionId: versionId!, slug: sheet.slug, title: title!, productId: product.id, priceCentavos })
    } else {
      const products = await commerce.listProducts(1, 5, methodId)
      const existingProduct = products.data[0]
      if (existingProduct?.active) {
        await commerce.updateProduct(existingProduct.id, { expectedRevision: existingProduct.revision, active: false }, actor())
      }
      result.informativeMethods.push({ id: methodId, versionId: versionId!, slug: sheet.slug, title: title! })
    }
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
