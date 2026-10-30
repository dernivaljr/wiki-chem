import { describe, expect, it } from 'vitest'
import { academicEditor, assertDemo, demoNotice } from '../demo/examples.js'
import { facets } from '../../src/modules/catalog/catalog.contracts.js'
import { validatePublication } from '../../src/modules/catalog/catalog.rules.js'
describe('isolamento e honestidade das fixtures acadêmicas', () => {
  it.each([{ NODE_ENV: 'production', MYSQL_TEST_ALLOW: 'true', DEMO_ALLOW: 'true', DB_NAME: 'wikichem_test_demo' }, { NODE_ENV: 'test', MYSQL_TEST_ALLOW: 'true', DEMO_ALLOW: 'true', DB_NAME: 'wikichem' }, { NODE_ENV: 'test', MYSQL_TEST_ALLOW: 'true', DB_NAME: 'wikichem_test_demo' }])('recusa ambiente não explicitamente isolado', env => expect(() => assertDemo(env)).toThrow())
  it('cobre os sete filtros sem autores humanos ou referência normativa/externa presumida', () => {
    const ids = Object.fromEntries(facets.map(facet => [facet, ['1','2']])) as Record<typeof facets[number], string[]>
    for (let index = 0; index < 5; index++) {
      const value = academicEditor(index, ids)
      expect(() => validatePublication(value)).not.toThrow()
      expect(value.fullProcedure).toContain(demoNotice)
      expect(value.sources[0]!.canonicalUrl).toBe('')
      expect(value.contributors.every(person => person.contributorType === 'ORGANIZATION')).toBe(true)
      expect(value.changelog).toContain('sem revisão humana')
    }
  })
})
