import { describe, expect, it } from 'vitest'
import { academicEditor, assertDemo, demoNotice } from '../demo/examples.js'
import {
  informativeEditor,
  resolveAcademicPriceCentavos,
  technicalCatalogEditor,
  technicalSheets,
  technicalTaxonomies,
  validateCommercialProductContent,
} from '../demo/technical-catalog.js'
import { facets, termInput } from '../../src/modules/catalog/catalog.contracts.js'
import type { Facet } from '../../src/modules/catalog/catalog.contracts.js'
import { validatePublication, validateTerm } from '../../src/modules/catalog/catalog.rules.js'

describe('isolamento, honestidade e catálogo comercial técnico do Wiki-Chem', () => {
  it.each([
    { NODE_ENV: 'production', MYSQL_TEST_ALLOW: 'true', DEMO_ALLOW: 'true', DB_NAME: 'wikichem_test_demo' },
    { NODE_ENV: 'test', MYSQL_TEST_ALLOW: 'true', DEMO_ALLOW: 'true', DB_NAME: 'wikichem' },
    { NODE_ENV: 'test', MYSQL_TEST_ALLOW: 'true', DB_NAME: 'wikichem_test_demo' },
  ])('recusa ambiente não explicitamente isolado', env => expect(() => assertDemo(env)).toThrow())

  it('mantém os cinco exemplos sintéticos legados íntegros para testes históricos', () => {
    const ids = Object.fromEntries(facets.map(facet => [facet, ['1', '2']])) as Record<typeof facets[number], string[]>
    for (let index = 0; index < 5; index++) {
      const classified = academicEditor(index, ids)
      expect(() => validatePublication(classified)).not.toThrow()
      expect(classified.fullProcedure).toContain(demoNotice)
      expect(classified.sources[0]!.canonicalUrl).toBe('')
      expect(classified.contributors.every(person => person.contributorType === 'ORGANIZATION')).toBe(true)
      expect(classified.changelog).toContain('sem revisão humana')

      const decoupled = academicEditor(index)
      expect(() => validatePublication(decoupled)).not.toThrow()
      for (const facet of facets) {
        expect(decoupled.classifications[facet]).toEqual([])
        expect(decoupled.notApplicable[facet].length).toBeGreaterThan(10)
      }
    }
  })

  it('valida taxonomias analíticas reais e 15 produtos digitais autorais do Wiki-Chem com fontes públicas verificáveis', () => {
    expect(technicalSheets).toHaveLength(15)

    const codeToId = {} as Record<Facet, Map<string, string>>
    let nextId = 1
    for (const facet of facets) {
      codeToId[facet] = new Map()
      expect(technicalTaxonomies[facet].length).toBeGreaterThan(0)
      const codes = new Set<string>()
      for (const def of technicalTaxonomies[facet]) {
        expect(def.code).not.toMatch(/^academic-demo-/)
        expect(def.label).not.toMatch(/^DEMO —/)
        expect(codes.has(def.code)).toBe(false)
        codes.add(def.code)
        const parsed = termInput.parse(facet === 'standards'
          ? { code: def.code, label: def.label, active: true, issuer: def.issuer, identifier: def.identifier, editionLabel: def.editionLabel, verifiedStatus: def.verifiedStatus }
          : { code: def.code, label: def.label, active: true })
        expect(() => validateTerm(facet, parsed)).not.toThrow()
        codeToId[facet].set(def.code, String(nextId++))
      }
    }

    const slugs = new Set<string>()
    const documentCodes = new Set<string>()
    for (const sheet of technicalSheets) {
      expect(slugs.has(sheet.slug)).toBe(false)
      slugs.add(sheet.slug)
      expect(documentCodes.has(sheet.documentCode)).toBe(false)
      documentCodes.add(sheet.documentCode)
      expect(sheet.documentCode).toMatch(/^WK-ANL-\d{3}$/)
      expect(sheet.slug.startsWith('info-')).toBe(true)
      expect(sheet.source.canonicalUrl).toMatch(/^https:\/\/(www\.epa\.gov|pubs\.usgs\.gov)\//)
      expect(resolveAcademicPriceCentavos(sheet, {})).toMatch(/^\d+$/)

      const commercialEditor = technicalCatalogEditor(sheet, codeToId, 'v1', true)
      expect(() => validatePublication(commercialEditor)).not.toThrow()
      expect(() => validateCommercialProductContent(commercialEditor)).not.toThrow()
      for (const facet of facets) {
        expect(commercialEditor.classifications[facet].length).toBeGreaterThan(0)
      }
      expect(commercialEditor.sources).toHaveLength(2)
      expect(commercialEditor.sources[0]!.sourceType).toBe('ORIGINAL')
      expect(commercialEditor.sources[0]!.ownerCredit).toContain('Wiki-Chem')
      expect(commercialEditor.sources[1]!.sourceType).toBe('REFERENCE')
      expect(commercialEditor.sources[1]!.canonicalUrl).toBe(sheet.source.canonicalUrl)
      expect(commercialEditor.fullDescription.length).toBeGreaterThanOrEqual(400)
      expect(commercialEditor.fullProcedure.length).toBeGreaterThanOrEqual(400)
      expect(commercialEditor.title).not.toMatch(/\b(DEMO|TESTE|fixture)\b/i)

      const fallbackInformative = informativeEditor(sheet, codeToId)
      expect(() => validatePublication(fallbackInformative)).not.toThrow()
      expect(fallbackInformative.sources).toHaveLength(1)
      expect(fallbackInformative.sources[0]!.sourceType).toBe('REFERENCE')
    }

    const standardCodes = technicalSheets.flatMap(sheet => sheet.classifications.standards)
    expect(standardCodes).toEqual(expect.arrayContaining(['usgs-tei-223', 'epa-200-7', 'epa-300-0', 'epa-8260d']))
    const ironUvVis = technicalSheets.find(sheet =>
      sheet.classifications.analytes.includes('ferro-fe') &&
      sheet.classifications.techniques.includes('espectrofotometria-uv-vis') &&
      sheet.classifications.technologies.includes('uv-vis'),
    )
    expect(ironUvVis?.title).toContain('1,10-fenantrolina')
    expect(ironUvVis?.defaultPriceCentavos).toBe('3900')
  })

  it('permite configurar preços BRL por ambiente e bloqueia conteúdo comercial vazio ou com rótulo sintético', () => {
    const sample = technicalSheets[0]!
    expect(resolveAcademicPriceCentavos(sample, { WIKICHEM_DEMO_DEFAULT_PRICE_CENTAVOS: '4500' })).toBe('4500')
    expect(resolveAcademicPriceCentavos(sample, {
      WIKICHEM_DEMO_DEFAULT_PRICE_CENTAVOS: '4500',
      WIKICHEM_DEMO_PRICES: `${sample.slug}:5190,info-epa-300-0- anions:4900`,
    })).toBe('5190')
    expect(resolveAcademicPriceCentavos({ ...sample, defaultPriceCentavos: null }, { WIKICHEM_DEMO_DEFAULT_PRICE_CENTAVOS: '4500' })).toBeNull()
    expect(() => resolveAcademicPriceCentavos(sample, { WIKICHEM_DEMO_DEFAULT_PRICE_CENTAVOS: '0' })).toThrow('DEMO_INVALID_PRICE_OVERRIDE')

    expect(() => validateCommercialProductContent({
      title: 'Título válido',
      freeSummary: 'Resumo válido.',
      publicDescription: 'Escopo válido.',
      fullDescription: 'Texto curto.',
      fullProcedure: 'Procedimento curto.',
    })).toThrow('COMMERCIAL_PRODUCT_REQUIRES_SUBSTANTIAL_CONTENT')

    expect(() => validateCommercialProductContent({
      title: 'DEMO — Guia inválido',
      freeSummary: 'Resumo válido.',
      publicDescription: 'Escopo válido.',
      fullDescription: 'A'.repeat(500),
      fullProcedure: 'B'.repeat(500),
    })).toThrow('COMMERCIAL_PRODUCT_CONTAINS_PLACEHOLDER_OR_SYNTHETIC_LABEL')
  })
})
