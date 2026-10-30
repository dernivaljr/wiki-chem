import { facets } from './types'
export const filterKeys = { techniques: 'techniqueIds', technologies: 'technologyIds', equipment: 'equipmentIds', matrices: 'matrixIds', analytes: 'analyteIds', standards: 'standardIds', segments: 'segmentIds' } as const
export interface SearchState { q: string; techniqueIds: string[]; technologyIds: string[]; equipmentIds: string[]; matrixIds: string[]; analyteIds: string[]; standardIds: string[]; segmentIds: string[]; page: number; pageSize: number; sort: 'title_asc' | 'updated_desc' }
export const emptySearch = (): SearchState => ({ q: '', techniqueIds: [], technologyIds: [], equipmentIds: [], matrixIds: [], analyteIds: [], standardIds: [], segmentIds: [], page: 1, pageSize: 20, sort: 'title_asc' })
export const validId = (id: string) => /^[1-9][0-9]{0,19}$/.test(id) && BigInt(id) <= 18446744073709551615n
export function parseSearch(params: URLSearchParams): SearchState | null {
  const state = emptySearch(), repeated = Object.values(filterKeys)
  const keys = new Set(['q', 'page', 'pageSize', 'sort', ...repeated])
  for (const key of params.keys()) if (!keys.has(key) || (!repeated.some(item => item === key) && params.getAll(key).length !== 1)) return null
  const raw = params.get('q') ?? ''
  state.q = raw.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if (raw.length > 200 || /[\p{Cc}]/u.test(state.q) || (state.q && state.q.split(' ').length > 12)) return null
  for (const facet of facets) {
    const key = filterKeys[facet], values = params.getAll(key)
    if (values.length > 20 || values.some(value => !validId(value)) || new Set(values).size !== values.length) return null
    state[key] = values
  }
  for (const key of ['page', 'pageSize'] as const) {
    const value = params.get(key)
    if (value !== null) {
      if (!/^[1-9][0-9]*$/.test(value) || Number(value) > (key === 'page' ? 1000000 : 100)) return null
      state[key] = Number(value)
    }
  }
  const sort = params.get('sort') ?? 'title_asc'
  if (sort !== 'title_asc' && sort !== 'updated_desc') return null
  state.sort = sort
  return state
}
export function searchParams(state: SearchState) {
  const params = new URLSearchParams()
  if (state.q.trim()) params.set('q', state.q.normalize('NFC').trim().replace(/\s+/gu, ' '))
  for (const facet of facets) for (const id of state[filterKeys[facet]]) params.append(filterKeys[facet], id)
  if (state.page !== 1) params.set('page', String(state.page))
  if (state.pageSize !== 20) params.set('pageSize', String(state.pageSize))
  if (state.sort !== 'title_asc') params.set('sort', state.sort)
  return params
}
