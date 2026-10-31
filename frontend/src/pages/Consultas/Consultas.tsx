import { useCallback, useRef, useState } from 'react'
import { Search, SlidersHorizontal } from '../../components/icons'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../auth/api'
import { CompactResultCard } from '../../catalog/PreviewContent'
import { emptySearch, filterKeys, parseSearch, searchParams } from '../../catalog/search-state'
import type { SearchState } from '../../catalog/search-state'
import { facets, labels } from '../../catalog/types'
import type { Page, Preview, Taxonomies } from '../../catalog/types'
import { useCatalogResource } from '../../catalog/useCatalogResource'
import './Consultas.css'

const quickExamples = ['ferro', 'EPA 200.7', 'EPA 300.0', 'EPA 8260D', 'GC-MS', 'Cr(VI)'] as const

function SearchPanel({
  query,
  filtersOpen,
  setFiltersOpen,
  missingTermPrompt,
  setMissingTermPrompt,
  navigate,
}: {
  query: SearchState
  filtersOpen: boolean
  setFiltersOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  missingTermPrompt: boolean
  setMissingTermPrompt: (value: boolean) => void
  navigate: (state: SearchState) => void
}) {
  const { request } = useAuth()
  const [draft, setDraft] = useState(query)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const hasSearchTerm = query.q.trim().length > 0
  const hasAppliedFilters = facets.some(facet => query[filterKeys[facet]].length > 0)
  const shouldLoadTaxonomies = hasSearchTerm || filtersOpen || hasAppliedFilters
  const queryString = searchParams(query).toString()

  const loadTaxonomies = useCallback(async () => {
    if (!shouldLoadTaxonomies) return null
    return request<Taxonomies>('/taxonomies')
  }, [request, shouldLoadTaxonomies])

  const loadResults = useCallback(async () => {
    if (!hasSearchTerm) return null
    return request<Page<Preview>>('/methodologies?' + queryString, { includeMeta: true })
  }, [request, hasSearchTerm, queryString])

  const taxonomiesRes = useCatalogResource(loadTaxonomies)
  const resultsRes = useCatalogResource(loadResults)

  const terms = taxonomiesRes.result.status === 'ready' ? taxonomiesRes.result.data : null
  const page = hasSearchTerm && resultsRes.result.status === 'ready' ? resultsRes.result.data : null

  const draftFilterCount = facets.reduce((sum, facet) => sum + draft[filterKeys[facet]].length, 0)
  const applied = facets.flatMap(facet =>
    query[filterKeys[facet]].map(id => ({
      facet,
      id,
      name: terms?.[facet].find(term => term.id === id)?.label ?? 'ID ' + id,
    })),
  )

  function submitSearch(nextState: SearchState) {
    if (nextState.q.trim().length === 0) {
      setMissingTermPrompt(true)
      navigate({ ...nextState, q: '', page: 1 })
      searchInputRef.current?.focus()
      return
    }
    setMissingTermPrompt(false)
    navigate({ ...nextState, page: 1 })
  }

  function clearAll() {
    setMissingTermPrompt(false)
    setDraft(emptySearch())
    navigate(emptySearch())
  }

  const removeApplied = (facet: typeof facets[number], id: string) => {
    navigate({
      ...query,
      page: 1,
      [filterKeys[facet]]: query[filterKeys[facet]].filter(value => value !== id),
    })
  }

  const retryAll = () => {
    if (taxonomiesRes.result.status === 'error') taxonomiesRes.retry()
    if (resultsRes.result.status === 'error') resultsRes.retry()
  }

  const detailBaseFrom = '/consultas' + (queryString ? '?' + queryString : '')

  return (
    <>
      <form
        className="consultas__search-panel"
        onSubmit={event => {
          event.preventDefault()
          submitSearch(draft)
        }}
        aria-label="Pesquisa de metodologias"
      >
        <label htmlFor="search-q">Termo de consulta</label>
        <div className="consultas__input">
          <div className="consultas__input-field">
            <Search size={18} className="consultas__input-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              id="search-q"
              type="search"
              maxLength={200}
              value={draft.q}
              onChange={event => {
                if (missingTermPrompt && event.target.value.trim().length > 0) setMissingTermPrompt(false)
                setDraft({ ...draft, q: event.target.value })
              }}
              aria-describedby="search-help"
              placeholder="Analito, símbolo químico, técnica ou código (ex.: ferro, EPA 300.0, GC-MS)"
            />
          </div>
          <button className="consultas__submit-btn" type="submit">Pesquisar</button>
          <button
            className={`consultas__filters-toggle${filtersOpen ? ' consultas__filters-toggle--open' : ''}`}
            type="button"
            aria-label="Filtros avançados"
            aria-expanded={filtersOpen}
            aria-controls="advanced-filters-panel"
            onClick={() => setFiltersOpen(open => !open)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>Filtros avançados</span>
            {draftFilterCount > 0 && (
              <span className="consultas__filter-badge" aria-hidden="true">{draftFilterCount}</span>
            )}
          </button>
        </div>

        <p id="search-help" className="consultas__suggestions">
          Pesquise por nome ou fórmula do analito, técnica instrumental ou referência normativa (até 12 palavras).
        </p>

        {filtersOpen && (
          <div id="advanced-filters-panel" className="consultas__advanced">
            {taxonomiesRes.result.status === 'error' && (
              <div className="consultas__inline-error" role="alert">
                <p>
                  {taxonomiesRes.result.error instanceof ApiError
                    ? taxonomiesRes.result.error.message
                    : 'Não foi possível carregar as classificações de filtro.'}
                </p>
                <button type="button" onClick={taxonomiesRes.retry}>Tentar novamente</button>
              </div>
            )}

            <div className="search-filters">
              {facets.map(facet => (
                <fieldset key={facet}>
                  <legend>{labels[facet]}</legend>
                  {terms ? (
                    terms[facet].length ? (
                      terms[facet].map(term => {
                        const checked = draft[filterKeys[facet]].includes(term.id)
                        const disabled = !checked && draft[filterKeys[facet]].length >= 20
                        const hasNormDetails =
                          facet === 'standards' && Boolean(term.issuer || term.identifier || term.editionLabel)
                        return (
                          <div className="search-term-row" key={term.id}>
                            <label className="search-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={event => {
                                  const key = filterKeys[facet]
                                  setDraft({
                                    ...draft,
                                    [key]: event.target.checked
                                      ? [...draft[key], term.id]
                                      : draft[key].filter(id => id !== term.id),
                                  })
                                }}
                              />
                              <span>{term.label}</span>
                            </label>
                            {hasNormDetails && (
                              <details className="search-norm-detail">
                                <summary aria-label={'Detalhes normativos de ' + term.label}>Edição</summary>
                                <p>{[term.issuer, term.identifier, term.editionLabel].filter(Boolean).join(' · ')}</p>
                              </details>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p>Nenhum termo ativo cadastrado.</p>
                    )
                  ) : (
                    <p>Carregando classificações…</p>
                  )}
                </fieldset>
              ))}
            </div>

            <div className="search-controls">
              <div>
                <label htmlFor="search-sort">Ordenação</label>
                <select
                  id="search-sort"
                  value={draft.sort}
                  onChange={event => setDraft({ ...draft, sort: event.target.value as SearchState['sort'] })}
                >
                  <option value="title_asc">Título (A–Z)</option>
                  <option value="updated_desc">Publicação mais recente</option>
                </select>
              </div>
              <div>
                <label htmlFor="search-size">Resultados por página</label>
                <select
                  id="search-size"
                  value={draft.pageSize}
                  onChange={event => setDraft({ ...draft, pageSize: Number(event.target.value) })}
                >
                  {[...new Set([10, 20, 50, 100, query.pageSize])]
                    .sort((a, b) => a - b)
                    .map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                </select>
              </div>
              <button type="submit">Aplicar filtros</button>
              <button className="consultas__secondary-btn" type="button" onClick={clearAll}>
                Limpar pesquisa e filtros
              </button>
            </div>
          </div>
        )}
      </form>

      {applied.length > 0 && (
        <section className="search-selected" aria-label="Filtros aplicados">
          {applied.map(({ facet, id, name }) => (
            <button type="button" key={facet + id} onClick={() => removeApplied(facet, id)}>
              Remover {labels[facet]}: {name} ×
            </button>
          ))}
          {!filtersOpen && (
            <button type="button" onClick={clearAll}>
              Limpar pesquisa e filtros
            </button>
          )}
        </section>
      )}

      {!hasSearchTerm ? (
        <section className="search-guidance" aria-label="Orientação de pesquisa">
          {missingTermPrompt || applied.length > 0 ? (
            <p className="search-guidance__notice" role="status">
              Informe um termo de pesquisa para consultar o catálogo técnico.
              {applied.length > 0 ? ' Os filtros selecionados serão combinados automaticamente à sua busca.' : ''}
            </p>
          ) : (
            <p className="search-guidance__title">
              Digite um termo de consulta para pesquisar metodologias analíticas no acervo Wiki-Chem.
            </p>
          )}
          <p className="search-guidance__hint">
            Você pode buscar por elemento ou espécie química, técnica instrumental ou método de referência, e refinar sob demanda em <strong>Filtros avançados</strong>.
          </p>
          <div className="search-guidance__chips" aria-label="Sugestões rápidas de pesquisa">
            {quickExamples.map(example => (
              <button
                key={example}
                type="button"
                className="search-guidance__chip"
                onClick={() => {
                  setMissingTermPrompt(false)
                  navigate({ ...draft, q: example, page: 1 })
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section aria-labelledby="search-results" className="search-results" aria-busy={resultsRes.result.status === 'loading'}>
          <div className="search-results__header">
            <h2 id="search-results">Resultados da pesquisa</h2>
            {!filtersOpen && applied.length === 0 && (
              <button className="consultas__clear-inline" type="button" onClick={clearAll}>
                Limpar pesquisa e filtros
              </button>
            )}
          </div>

          {resultsRes.result.status === 'loading' && <p role="status">Carregando metodologias…</p>}

          {resultsRes.result.status === 'error' && (
            <div className="search-empty" role="alert">
              <p>
                {resultsRes.result.error instanceof ApiError
                  ? resultsRes.result.error.message
                  : 'Não foi possível carregar a pesquisa.'}
              </p>
              <div className="search-empty__actions">
                <button type="button" onClick={retryAll}>Tentar novamente</button>
              </div>
            </div>
          )}

          {page && (
            <>
              <p className="search-results__count" role="status">
                {page.total} {page.total === 1 ? 'metodologia encontrada' : 'metodologias encontradas'} · Página {page.page} de{' '}
                {Math.max(1, Math.ceil(page.total / page.pageSize))}
              </p>

              {page.data.length === 0 && (
                page.total ? (
                  <div className="search-empty">
                    <p className="search-empty__title">Esta página não possui resultados. Volte à primeira página.</p>
                    <div className="search-empty__actions">
                      <button type="button" onClick={() => navigate({ ...query, page: 1 })}>Ir para a primeira página</button>
                    </div>
                  </div>
                ) : (
                  <div className="search-empty">
                    <p className="search-empty__title">Nenhuma metodologia encontrada para os critérios selecionados.</p>
                    <p className="search-empty__hint">
                      Verifique a grafia do analito ou símbolo químico (ex.: ferro ou Fe), consulte pelo código documental (ex.: EPA 200.7, EPA 300.0, EPA 8260D) ou reduza os filtros ativos.
                    </p>
                    <div className="search-empty__actions">
                      {applied.length > 0 && (
                        <button
                          type="button"
                          onClick={() => navigate({ ...emptySearch(), q: query.q, sort: query.sort, pageSize: query.pageSize })}
                        >
                          Limpar apenas filtros
                        </button>
                      )}
                      <button type="button" onClick={clearAll}>Redefinir consulta</button>
                    </div>
                  </div>
                )
              )}

              <div className="search-results__list">
                {page.data.map(preview => (
                  <CompactResultCard
                    key={preview.id}
                    preview={preview}
                    detailHref={'/metodologias/' + preview.id + '?from=' + encodeURIComponent(detailBaseFrom)}
                  />
                ))}
              </div>

              {(page.total > 0 || page.page > 1) && (
                <nav className="search-pagination" aria-label="Paginação de resultados">
                  <button type="button" disabled={page.page === 1} onClick={() => navigate({ ...query, page: 1 })}>
                    Primeira página
                  </button>
                  <button type="button" disabled={page.page === 1} onClick={() => navigate({ ...query, page: page.page - 1 })}>
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page.page * page.pageSize >= page.total}
                    onClick={() => navigate({ ...query, page: page.page + 1 })}
                  >
                    Próxima
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      )}
    </>
  )
}

export default function Consultas() {
  const [params, setParams] = useSearchParams()
  const [attempt, setAttempt] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [missingTermPrompt, setMissingTermPrompt] = useState(false)
  const key = params.toString()
  const query = parseSearch(params)

  return (
    <main className="consultas">
      <div className="consultas__container">
        <header className="consultas__heading">
          <p className="consultas__eyebrow">CATÁLOGO TÉCNICO DIGITAL</p>
          <h1>Pesquisar metodologias</h1>
          <p>
            Localize guias técnicos analíticos do Wiki-Chem por analito, técnica instrumental, matriz ou referência normativa e acesse a prévia técnica antes da aquisição.
          </p>
        </header>

        {query ? (
          <SearchPanel
            key={key + ':' + attempt}
            query={query}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
            missingTermPrompt={missingTermPrompt}
            setMissingTermPrompt={setMissingTermPrompt}
            navigate={state => {
              const next = searchParams(state)
              if (next.toString() === key) setAttempt(value => value + 1)
              else setParams(next)
            }}
          />
        ) : (
          <div className="search-empty" role="alert">
            <p>Parâmetros de pesquisa inválidos. Use até 200 caracteres, 12 palavras e 20 valores por filtro.</p>
            <div className="search-empty__actions">
              <button type="button" onClick={() => setParams({})}>Limpar pesquisa e filtros</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
