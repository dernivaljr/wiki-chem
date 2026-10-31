import { describe, expect, it } from 'vitest'
import { academicEditor, assertDemo, demoNotice } from '../demo/examples.js'
import { informativeEditor, technicalSheets, technicalTaxonomies } from '../demo/technical-catalog.js'
import { facets, termInput } from '../../src/modules/catalog/catalog.contracts.js'
import type { Facet } from '../../src/modules/catalog/catalog.contracts.js'
import { validatePublication, validateTerm } from '../../src/modules/catalog/catalog.rules.js'

describe('isolamento e honestidade das fixtures acadêmicas', () => {
  it.each([
    { NODE_ENV: 'production', MYSQL_TEST_ALLOW: 'true', DEMO_ALLOW: 'true', DB_NAME: 'wikichem_test_demo' },
    { NODE_ENV: 'test', MYSQL_TEST_ALLOW: 'true', DEMO_ALLOW: 'true', DB_NAME: 'wikichem' },
    { NODE_ENV: 'test', MYSQL_TEST_ALLOW: 'true', DB_NAME: 'wikichem_test_demo' },
  ])('recusa ambiente não explicitamente isolado', env => expect(() => assertDemo(env)).toThrow())

  it('cobre os cinco exemplos sintéticos comerciais com ou sem classificação explícita', () => {
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

  it('valida taxonomias analíticas reais e 15 fichas técnicas informativas verificáveis sem reproduzir procedimentos', () => {
    expect(technicalSheets.length).toBeGreaterThanOrEqual(12)
    expect(technicalSheets.length).toBeLessThanOrEqual(15)

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
    for (const sheet of technicalSheets) {
      expect(slugs.has(sheet.slug)).toBe(false)
      slugs.add(sheet.slug)
      expect(sheet.slug.startsWith('info-')).toBe(true)
      expect(sheet.limitations.trim().length).toBeGreaterThan(30)
      expect(sheet.source.canonicalUrl).toMatch(/^https:\/\/(www\.epa\.gov|pubs\.usgs\.gov)\//)

      const editor = informativeEditor(sheet, codeToId)
      expect(() => validatePublication(editor)).not.toThrow()
      for (const facet of facets) {
        expect(editor.classifications[facet].length).toBeGreaterThan(0)
      }
      expect(editor.sources).toHaveLength(1)
      expect(editor.sources[0]!.sourceType).toBe('REFERENCE')
      expect(editor.publicDescription).toContain('Limitações e interferências documentadas:')
      expect(editor.fullProcedure).toContain('Procedimento operacional integral não reproduzido')
      expect(editor.changelog).toContain('sem revisão científica humana')
    }

    const standardCodes = technicalSheets.flatMap(sheet => sheet.classifications.standards)
    expect(standardCodes).toEqual(expect.arrayContaining(['usgs-tei-223', 'epa-200-7', 'epa-300-0', 'epa-8260d']))
    const ironUvVis = technicalSheets.find(sheet =>
      sheet.classifications.analytes.includes('ferro-fe') &&
      sheet.classifications.techniques.includes('espectrofotometria-uv-vis') &&
      sheet.classifications.technologies.includes('uv-vis'),
    )
    expect(ironUvVis?.title).toContain('1,10-fenantrolina')
  })
})
