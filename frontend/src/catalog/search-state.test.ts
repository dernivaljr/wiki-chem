import { describe, expect, it } from 'vitest'
import { emptySearch, parseSearch, searchParams } from './search-state'
import { safeReturnTo } from '../auth/returnTo'
describe('estado da consulta na URL', () => {
  it('preserva múltiplos IDs e símbolos em ida e volta canônica', () => {
    const state = { ...emptySearch(), q: 'água Na+ Fe²⁺ 10%_!', analyteIds: ['1', '2'], matrixIds: ['3', '4'], page: 2, sort: 'updated_desc' as const }
    expect(parseSearch(searchParams(state))).toEqual(state)
    expect(searchParams(state).getAll('analyteIds')).toEqual(['1', '2'])
  })
  it.each(['q=x&q=y', 'analyteIds=1,2', 'analyteIds=1&analyteIds=1', 'page=0', 'pageSize=101', 'sort=price_asc', 'offer=1', 'standardIds=18446744073709551616'])('rejeita parâmetros inválidos: %s', value => {
    expect(parseSearch(new URLSearchParams(value))).toBeNull()
  })
  it('limita retorno a detalhe conhecido e protege contra travessia', () => {
    expect(safeReturnTo('/metodologias/10?from=%2Fconsultas%3Fq%3Dagua')).toContain('/metodologias/10?')
    expect(safeReturnTo('/metodologias/10/../../admin')).toBe('/consultas')
    expect(safeReturnTo('//evil.invalid/metodologias/10')).toBe('/consultas')
  })
})
