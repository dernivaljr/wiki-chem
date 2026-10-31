import { describe, expect, it } from 'vitest'
import { searchQuery } from '../../src/modules/catalog/catalog.contracts.js'
import { literalPattern, normalizeSearchWord, resolveSearchToken, searchPredicate } from '../../src/modules/catalog/catalog.search.js'

describe('contrato da pesquisa gratuita', () => {
  it('normaliza NFC e espaços, preservando termos curtos e símbolos', () => {
    const query = searchQuery.parse({ q: '  a\u0301gua   Fe²⁺  %_! ', analyteIds: '1' })
    expect(query.q).toBe('água Fe²⁺ %_!')
    expect(query.analyteIds).toEqual(['1'])
    expect(query).toMatchObject({ sort: 'title_asc', page: 1, pageSize: 20 })
    expect(literalPattern('1%_!\\')).toBe('%1!%!_!!\\%')
  })
  it.each([
    { q: 'x'.repeat(201) }, { q: Array(13).fill('a').join(' ') }, { q: 'x\0y' }, { q: ['a', 'b'] },
    { sort: 'price_asc' }, { page: 0 }, { pageSize: 101 }, { fullProcedure: 'private' },
    { techniqueIds: '1,2' }, { analyteIds: ['1', '1'] }, { matrixIds: Array.from({ length: 21 }, (_, i) => String(i + 1)) },
    { segmentIds: '18446744073709551616' }, { equipmentIds: '1 OR 1=1' },
  ])('rejeita parâmetros fora do contrato: %j', input => {
    expect(searchQuery.safeParse(input).success).toBe(false)
  })
  it('mantém texto e IDs fora do SQL e pesquisa somente campos gratuitos', () => {
    const input = "DEMO' OR %_!"
    const { sql, params } = searchPredicate(searchQuery.parse({ q: input, analyteIds: ['10', '11'], matrixIds: ['20'] }))
    expect(sql).not.toContain(input)
    expect(sql).toContain('f.analyte_id IN (?, ?)')
    expect(sql).toContain('f.matrix_id IN (?)')
    expect(params.slice(0, 3)).toEqual(['20', '10', '11'])
    expect(params).toContain("%DEMO'%")
    expect(params).toContain('%!%!_!!%')
    expect(sql).not.toMatch(/methodology_contents|full_procedure|full_description|permission_evidence|review_note/)
    expect(sql).toContain("v.access_state = 'ALLOWED'")
  })
  it('expande aliases químicos controlados (ferro/Fe, UV-Vis, GC-MS, ICP-OES) sem abrir falso positivo em palavras curtas', () => {
    expect(normalizeSearchWord('(Fe),')).toBe('Fe')
    const fe = resolveSearchToken('Fe')
    expect(fe.symbol).toBe('Fe')
    expect(fe.terms).toContain('ferro')
    expect(fe.terms).not.toContain('fe')
    const ferro = resolveSearchToken('ferro')
    expect(ferro.symbol).toBe('Fe')
    expect(ferro.terms).toEqual(expect.arrayContaining(['ferro', 'fe²⁺', 'fe(ii)']))
    expect(resolveSearchToken('UV/Vis').terms).toEqual(expect.arrayContaining(['uv/vis', 'uv-vis']))
    expect(resolveSearchToken('GC/MS').terms).toEqual(expect.arrayContaining(['gc/ms', 'gc-ms']))
    expect(resolveSearchToken('ICP-AES').terms).toEqual(expect.arrayContaining(['icp-aes', 'icp-oes']))
    expect(resolveSearchToken('as')).toEqual({ terms: ['as'] })
    expect(resolveSearchToken('p')).toEqual({ terms: ['p'] })

    const { sql, params } = searchPredicate(searchQuery.parse({ q: 'Fe' }))
    expect(sql).toContain('REGEXP_LIKE')
    expect(params).toContain('(^|[^[:alnum:]])Fe([^[:alnum:]]|$)')
    expect(params).not.toContain('%Fe%')
    expect(params).not.toContain('%fe%')
  })
})
