import { describe, expect, it } from 'vitest'
import { facets, id, methodPatch, sourceInput, versionPatch } from '../../src/modules/catalog/catalog.contracts.js'
import { emptyEditor, validatePublication, validateTerm } from '../../src/modules/catalog/catalog.rules.js'
import { demoEditor } from '../catalog-fixtures.js'

const ids = { techniques: ['1', '2'], technologies: ['1', '2'], equipment: ['1', '2'], matrices: ['1', '2'], analytes: ['1', '2'], standards: ['1', '2'], segments: ['1', '2'] }
describe('contratos e regras editoriais', () => {
  it('permite rascunho incompleto, sem permitir publicação', () => {
    expect(versionPatch.safeParse({ ...emptyEditor(), expectedRevision: 1 }).success).toBe(true)
    expect(() => validatePublication(emptyEditor())).toThrow('Publicação bloqueada')
  })
  it('reconhece fixture original completa, sem referência de terceiros', () => {
    const fixture = demoEditor(ids)
    expect(() => validatePublication(fixture)).not.toThrow()
    expect(versionPatch.safeParse({ ...fixture, expectedRevision: 1 }).success).toBe(true)
  })
  it.each(facets)('rejeita IDs duplicados e falta de classificação em %s', facet => {
    const data = demoEditor(ids)
    data.classifications[facet] = ['1', '1']
    expect(versionPatch.safeParse({ ...data, expectedRevision: 1 }).success).toBe(false)
    data.classifications[facet] = []
    expect(() => validatePublication(data)).toThrow()
    data.notApplicable[facet] = 'Não aplicável a esta fixture, conforme revisão de teste.'
    expect(() => validatePublication(data)).not.toThrow()
    data.classifications[facet] = ['1']
    expect(() => validatePublication(data)).toThrow()
  })
  it.each(['PENDING', 'REJECTED'] as const)('condição %s bloqueia publicação', state => {
    const data = demoEditor(ids)
    data.sources[0]!.permissionStatus = state
    expect(() => validatePublication(data)).toThrow()
  })
  it.each(['fullProcedure', 'freeSummary', 'title'] as const)('campo %s vazio bloqueia publicação', key => {
    const data = demoEditor(ids); data[key] = ' '
    expect(() => validatePublication(data)).toThrow()
  })
  it('exige autoria e curadoria, evidência e revisão da fonte', () => {
    const data = demoEditor(ids)
    data.contributors = data.contributors.filter(item => item.role !== 'CURATOR')
    expect(() => validatePublication(data)).toThrow()
    const source = demoEditor(ids).sources[0]!
    expect(sourceInput.safeParse({ ...source, canonicalUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(sourceInput.safeParse({ ...source, canonicalUrl: 'https://user:password@example.test/source' }).success).toBe(false)
  })
  it('rejeita identidades, revisão ou tipo de dados forjados', () => {
    expect(id.safeParse('18446744073709551616').success).toBe(false)
    expect(id.safeParse('1 OR 1=1').success).toBe(false)
    expect(versionPatch.safeParse({ ...demoEditor(ids), expectedRevision: 1, reviewedBy: '2' }).success).toBe(false)
    expect(methodPatch.safeParse({ expectedRevision: 1 }).success).toBe(false)
  })
  it('não admite norma sem edição identificável ou campos normativos em outra faceta', () => {
    const term = { code: 'demo', label: 'DEMO', active: true, issuer: '', identifier: '', editionLabel: '', verifiedStatus: 'PENDING' as const }
    expect(() => validateTerm('standards', term)).toThrow()
    expect(() => validateTerm('techniques', { ...term, issuer: 'DEMO' })).toThrow()
  })
})
