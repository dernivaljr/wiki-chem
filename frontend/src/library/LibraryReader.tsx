import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink } from '../components/icons'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../auth/api'
import { validId } from '../catalog/search-state'
import { useCatalogResource } from '../catalog/useCatalogResource'
import type { Page } from '../catalog/types'
import { accessLabels } from './types'
import type { EligibleVersion, LibraryContent, LibraryEntry } from './types'
import { useProtectedResource } from './useProtectedResource'
import './library.css'
import '../pages/Consultas/Consultas.css'

function StructuredTechnicalText({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let bulletItems: string[] = []
  let keyCounter = 0

  function flushBullets() {
    if (bulletItems.length === 0) return
    const items = bulletItems
    bulletItems = []
    blocks.push(
      <ul className="library-bullets" key={`ul-${keyCounter++}`}>
        {items.map((item, idx) => <li key={idx}>{item}</li>)}
      </ul>,
    )
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushBullets()
      continue
    }
    if (line.startsWith('- ')) {
      bulletItems.push(line.slice(2))
      continue
    }
    flushBullets()
    if (/^\d+\.\s+\S/.test(line)) {
      blocks.push(<h4 className="library-section-heading" key={`h-${keyCounter++}`}>{line}</h4>)
    } else if (/^Equação:\s+/i.test(line)) {
      blocks.push(<p className="library-equation" key={`eq-${keyCounter++}`}>{line}</p>)
    } else if (/^Nota:\s+/i.test(line)) {
      blocks.push(<p className="library-note" key={`nt-${keyCounter++}`}>{line}</p>)
    } else {
      blocks.push(<p className="library-paragraph" key={`p-${keyCounter++}`}>{rawLine}</p>)
    }
  }
  flushBullets()

  return <div className="library-procedure">{blocks}</div>
}

function Content({ methodologyId, versionId }: { methodologyId: string; versionId: string }) {
  const { request } = useAuth()
  const load = useCallback(
    () => request<LibraryContent>('/library/' + methodologyId + '/content' + (versionId ? '?versionId=' + versionId : '')),
    [request, methodologyId, versionId],
  )
  const { result, retry } = useProtectedResource(load)

  return (
    <section className="library-reader-card" aria-label="Leitura autorizada">
      {result.status === 'loading' && <p role="status">Verificando autorização e carregando conteúdo…</p>}
      {result.status === 'error' && (
        <div role="alert">
          <p>{result.error instanceof Error ? result.error.message : 'Conteúdo indisponível.'}</p>
          <button type="button" onClick={retry}>Verificar acesso novamente</button>
        </div>
      )}
      {result.status === 'ready' && (
        <>
          <header className="library-reader-card__header">
            <span className="search-badge">Versão {result.data.versionLabel}</span>
            <span className="library-reader-card__date">
              Publicada em {new Date(result.data.publishedAt).toLocaleString('pt-BR')}
            </span>
          </header>
          <h2 className="library-reader-card__title">{result.data.title}</h2>

          <section className="library-reader-section">
            <h3>Fundamentação, matrizes e interferências</h3>
            <StructuredTechnicalText text={result.data.fullDescription} />
          </section>

          <section className="library-reader-section">
            <h3>Estrutura operacional, cálculos e controle de qualidade</h3>
            <StructuredTechnicalText text={result.data.fullProcedure} />
          </section>

          <section className="library-reader-section">
            <h3>Referências e rastreabilidade documental</h3>
            <ul className="library-references">
              {result.data.references.map((ref, index) => (
                <li key={index}>
                  <span className="search-source-tag">
                    {ref.sourceType === 'REFERENCE' ? '[Fonte pública de referência] ' : '[Produto autoral Wiki-Chem] '}
                  </span>
                  <span>{ref.referenceText}</span>
                  {ref.ownerCredit && <span> · {ref.ownerCredit}</span>}
                  {ref.editionLabel && <span> · {ref.editionLabel}</span>}
                  {ref.locator && <span> · {ref.locator}</span>}
                  {/^https?:\/\//.test(ref.canonicalUrl) && (
                    <>
                      {' · '}
                      <a className="search-ext-link" href={ref.canonicalUrl} target="_blank" rel="noreferrer">
                        <span>Consultar fonte {index + 1}</span>
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="library-reader-section">
            <h3>Responsabilidade editorial</h3>
            <ul className="library-contributors">
              {result.data.contributors.map((person, index) => (
                <li key={index}>
                  <strong>{person.displayName}</strong> · {person.role === 'AUTHOR' ? 'Autoria' : 'Curadoria'}
                  {person.reference && ' · ' + person.reference}
                </li>
              ))}
            </ul>
          </section>

          <div className="checkout-actions">
            <button className="consultas__secondary-btn" type="button" onClick={retry}>
              Verificar acesso novamente
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function History({ methodologyId, selected, change }: { methodologyId: string; selected: string; change: (value: string) => void }) {
  const { request } = useAuth()
  const [page, setPage] = useState(1)
  const load = useCallback(
    () => request<Page<EligibleVersion>>('/library/' + methodologyId + '/versions?page=' + page, { includeMeta: true }),
    [request, methodologyId, page],
  )
  const { result, retry } = useCatalogResource(load)

  return (
    <section className="search-card" aria-label="Histórico publicado elegível">
      <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Versões publicadas elegíveis</h2>
      <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
        A versão vigente é exibida por padrão. Em caso de indisponibilidade, escolha explicitamente outra versão autorizada.
      </p>
      <button className="consultas__secondary-btn" type="button" onClick={() => change('')} disabled={!selected}>
        Consultar versão atual
      </button>
      {result.status === 'loading' && <p role="status">Carregando versões…</p>}
      {result.status === 'error' && (
        <div role="alert">
          <p>Não foi possível consultar as versões autorizadas.</p>
          <button type="button" onClick={retry}>Atualizar versões</button>
        </div>
      )}
      {result.status === 'ready' && (
        <>
          <div className="library-selection">
            <label htmlFor="library-version">Selecionar versão histórica</label>
            <select
              id="library-version"
              value={result.data.data.some(item => item.id === selected) ? selected : ''}
              onChange={event => {
                if (event.target.value) change(event.target.value)
              }}
            >
              <option value="">Escolha explicitamente uma versão</option>
              {result.data.data.map(item => (
                <option value={item.id} key={item.id}>
                  {item.versionLabel}{item.original ? ' — adquirida' : ''}{item.current ? ' — atual' : ''}
                </option>
              ))}
            </select>
          </div>
          {!result.data.data.length && <p>Nenhuma versão elegível nesta página.</p>}
          <nav className="checkout-actions" aria-label="Paginação das versões">
            <button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Versões anteriores</button>
            <span>Página {page} · {result.data.total} versões</span>
            <button type="button" disabled={page * result.data.pageSize >= result.data.total} onClick={() => setPage(value => value + 1)}>
              Mais versões
            </button>
          </nav>
        </>
      )}
    </section>
  )
}

function Reader({ id, selected, change }: { id: string; selected: string; change: (value: string) => void }) {
  const { request } = useAuth()
  const [visible, setVisible] = useState(document.visibilityState !== 'hidden')
  const [epoch, setEpoch] = useState(0)
  const load = useCallback(
    () => (validId(id) ? request<LibraryEntry>('/library/' + id) : Promise.reject(new ApiError(404, 'NOT_FOUND', 'Metodologia não encontrada.'))),
    [request, id],
  )
  const { result, retry } = useCatalogResource(load)

  useEffect(() => {
    const visibility = () => {
      setVisible(document.visibilityState !== 'hidden')
      setEpoch(value => value + 1)
    }
    const refresh = () => setEpoch(value => value + 1)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pageshow', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return (
    <>
      {result.status === 'loading' && <p role="status">Carregando direito adquirido…</p>}
      {result.status === 'error' && (
        <div className="search-empty" role="alert">
          <p>{result.error instanceof Error ? result.error.message : 'Não foi possível verificar seu direito.'}</p>
          <div className="search-empty__actions">
            <button type="button" onClick={retry}>Tentar novamente</button>
          </div>
        </div>
      )}
      {result.status === 'ready' && (
        <>
          <div className="search-card">
            <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem' }}>{result.data.title}</h2>
            <p style={{ margin: '4px 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Versão adquirida: {result.data.originalVersionLabel} · Atual: {result.data.currentVersionLabel ?? 'indisponível'}
            </p>
            <p style={{ margin: '4px 0 10px', fontWeight: 600 }}>{accessLabels[result.data.accessState]}</p>
            <Link to={'/pedidos/' + result.data.orderId}>Consultar pedido original</Link>
          </div>
          {result.data.entitlementStatus === 'ACTIVE' && (
            <>
              <History methodologyId={id} selected={selected} change={change} />
              {visible ? (
                <Content key={id + ':' + selected + ':' + epoch} methodologyId={id} versionId={selected} />
              ) : (
                <p>Leitura ocultada enquanto esta página está em segundo plano. O acesso será verificado ao retornar.</p>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

export default function LibraryReader() {
  const { methodologyId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const selected = params.get('versionId') ?? ''
  const valid =
    [...params.keys()].every(key => key === 'versionId') &&
    params.getAll('versionId').length <= 1 &&
    (!params.has('versionId') || validId(selected))

  return (
    <main className="consultas">
      <div className="consultas__container">
        <Link className="search-back" to="/biblioteca">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar à minha biblioteca</span>
        </Link>
        <header className="consultas__heading" style={{ marginTop: 14 }}>
          <p className="consultas__eyebrow">CONTEÚDO TÉCNICO INTEGRAL</p>
          <h1>Leitura na minha biblioteca</h1>
        </header>
        {valid ? (
          <Reader key={methodologyId} id={methodologyId} selected={selected} change={value => setParams(value ? { versionId: value } : {})} />
        ) : (
          <div className="search-empty" role="alert">
            <p>Seleção de versão inválida.</p>
            <div className="search-empty__actions">
              <button type="button" onClick={() => setParams({})}>Consultar versão atual</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
