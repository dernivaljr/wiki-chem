import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../auth/api'
import { emptySearch, filterKeys, parseSearch, searchParams } from '../../catalog/search-state'
import type { SearchState } from '../../catalog/search-state'
import { facets, labels } from '../../catalog/types'
import type { Page, Preview, Taxonomies } from '../../catalog/types'
import PreviewContent from '../../catalog/PreviewContent'
import { useCatalogResource } from '../../catalog/useCatalogResource'
import './Consultas.css'

function SearchPanel({ query, navigate }: { query: SearchState; navigate: (state: SearchState) => void }) {
  const { request } = useAuth()
  const [draft, setDraft] = useState(query)
  const queryString = searchParams(query).toString()
  const load = useCallback(async () => {
    const [terms, page] = await Promise.all([request<Taxonomies>('/taxonomies'), request<Page<Preview>>('/methodologies?' + queryString, { includeMeta: true })])
    return { terms, page }
  }, [request, queryString])
  const { result, retry } = useCatalogResource(load)
  const terms = result.status === 'ready' ? result.data.terms : null
  const page = result.status === 'ready' ? result.data.page : null
  const applied = facets.flatMap(facet => query[filterKeys[facet]].map(id => ({ facet, id, name: terms?.[facet].find(term => term.id === id)?.label ?? 'ID ' + id })))
  const remove = (facet: typeof facets[number], id: string) => navigate({ ...query, page: 1, [filterKeys[facet]]: query[filterKeys[facet]].filter(value => value !== id) })
  return <>
    <form className="consultas__search-panel" onSubmit={event => { event.preventDefault(); navigate({ ...draft, page: 1 }) }} aria-label="Pesquisa de metodologias">
      <label htmlFor="search-q">Termo de consulta</label>
      <div className="consultas__input">
        <input id="search-q" type="search" maxLength={200} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} aria-describedby="search-help" placeholder="Ex.: ferro fenantrolina, Fe, EPA 300.0, GC-MS" />
        <button type="submit">Pesquisar</button>
      </div>
      <p id="search-help" className="consultas__suggestions">Combine até 12 palavras (incluindo símbolos e siglas como Fe, NO3-, UV-Vis, ICP-OES, GC-MS). No mesmo filtro vale qualquer item marcado; entre categorias diferentes, todas são exigidas.</p>
      <div className="search-filters">{facets.map(facet => <fieldset key={facet}><legend>{labels[facet]}</legend>
        {terms ? terms[facet].length ? terms[facet].map(term => {
          const checked = draft[filterKeys[facet]].includes(term.id)
          const disabled = !checked && draft[filterKeys[facet]].length >= 20
          const hasNormDetails = facet === 'standards' && Boolean(term.issuer || term.identifier || term.editionLabel)
          return <div className="search-term-row" key={term.id}>
            <label className="search-check">
              <input type="checkbox" checked={checked} disabled={disabled} onChange={event => {
                const key = filterKeys[facet]
                setDraft({ ...draft, [key]: event.target.checked ? [...draft[key], term.id] : draft[key].filter(id => id !== term.id) })
              }} />
              <span>{term.label}</span>
            </label>
            {hasNormDetails && <details className="search-norm-detail">
              <summary aria-label={'Detalhes normativos de ' + term.label}>Edição</summary>
              <p>{[term.issuer, term.identifier, term.editionLabel].filter(Boolean).join(' · ')}</p>
            </details>}
          </div>
        }) : <p>Nenhum termo ativo cadastrado.</p> : <p>Classificações aguardando carregamento.</p>}
      </fieldset>)}</div>
      <div className="search-controls">
        <div><label htmlFor="search-sort">Ordenação</label><select id="search-sort" value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value as SearchState['sort'] })}><option value="title_asc">Título (A–Z)</option><option value="updated_desc">Publicação mais recente</option></select></div>
        <div><label htmlFor="search-size">Resultados por página</label><select id="search-size" value={draft.pageSize} onChange={event => setDraft({ ...draft, pageSize: Number(event.target.value) })}>{[...new Set([10, 20, 50, 100, query.pageSize])].sort((a, b) => a - b).map(size => <option key={size} value={size}>{size}</option>)}</select></div>
        <button type="submit">Aplicar filtros</button>
        <button type="button" onClick={() => navigate(emptySearch())}>Limpar pesquisa e filtros</button>
      </div>
    </form>
    {applied.length > 0 && <section className="search-selected" aria-label="Filtros aplicados">{applied.map(({ facet, id, name }) => <button type="button" key={facet + id} onClick={() => remove(facet, id)}>Remover {labels[facet]}: {name} ×</button>)}</section>}
    <section aria-labelledby="search-results" className="search-results" aria-busy={result.status === 'loading'}><h2 id="search-results">Resultados</h2>
      {result.status === 'loading' && <p role="status">Carregando metodologias…</p>}
      {result.status === 'error' && <div role="alert"><p>{result.error instanceof ApiError ? result.error.message : 'Não foi possível carregar a pesquisa.'}</p><button type="button" onClick={retry}>Tentar novamente</button></div>}
      {page && <>
        <p role="status">{page.total} {page.total === 1 ? 'metodologia encontrada' : 'metodologias encontradas'} · Página {page.page} de {Math.max(1, Math.ceil(page.total / page.pageSize))}</p>
        {page.data.length === 0 && (page.total ? (
          <div className="search-empty">
            <p className="search-empty__title">Esta página não possui resultados. Volte à primeira página.</p>
            <div className="search-empty__actions">
              <button type="button" onClick={() => navigate({ ...query, page: 1 })}>Ir para a primeira página</button>
            </div>
          </div>
        ) : (
          <div className="search-empty">
            <p className="search-empty__title">Nenhuma metodologia encontrada para os critérios selecionados.</p>
            <p className="search-empty__hint">Experimente pesquisar pelo nome do analito ou símbolo químico (ex.: ferro ou Fe), método documental (ex.: EPA 200.7, EPA 300.0, EPA 8260D) ou reduza a combinação simultânea entre categorias.</p>
            <div className="search-empty__actions">
              {query.q && <button type="button" onClick={() => navigate({ ...query, q: '', page: 1 })}>Limpar apenas termo</button>}
              {applied.length > 0 && <button type="button" onClick={() => navigate({ ...emptySearch(), q: query.q, sort: query.sort, pageSize: query.pageSize })}>Limpar apenas filtros</button>}
              {(query.q || applied.length > 0) && <button type="button" onClick={() => navigate(emptySearch())}>Redefinir consulta</button>}
            </div>
          </div>
        ))}
        {page.data.map(preview => <article className="search-card" key={preview.id}><h3><Link to={'/metodologias/' + preview.id + '?from=' + encodeURIComponent('/consultas' + (queryString ? '?' + queryString : ''))}>{preview.title}</Link></h3><PreviewContent preview={preview} /></article>)}
        {(page.total > 0 || page.page > 1) && <nav className="search-pagination" aria-label="Paginação de resultados"><button type="button" disabled={page.page === 1} onClick={() => navigate({ ...query, page: 1 })}>Primeira página</button><button type="button" disabled={page.page === 1} onClick={() => navigate({ ...query, page: page.page - 1 })}>Anterior</button><button type="button" disabled={page.page * page.pageSize >= page.total} onClick={() => navigate({ ...query, page: page.page + 1 })}>Próxima</button></nav>}
      </>}
    </section>
  </>
}

export default function Consultas() {
  const [params, setParams] = useSearchParams()
  const [attempt, setAttempt] = useState(0)
  const key = params.toString(), query = parseSearch(params)
  return <main className="consultas"><div className="consultas__container"><header className="consultas__heading"><p className="consultas__eyebrow">ÁREA DE CONSULTA</p><h1>Pesquisar metodologias</h1><p>Consulte fichas técnicas analíticas, classificações laboratoriais e referências documentais verificadas do catálogo publicado.</p></header>
    {query ? <SearchPanel key={key + ':' + attempt} query={query} navigate={state => {
      const next = searchParams(state)
      if (next.toString() === key) setAttempt(value => value + 1)
      else setParams(next)
    }} /> : <div role="alert"><p>Parâmetros de pesquisa inválidos. Use até 200 caracteres, 12 palavras e 20 valores por filtro.</p><button type="button" onClick={() => setParams({})}>Limpar pesquisa e filtros</button></div>}
  </div></main>
}
