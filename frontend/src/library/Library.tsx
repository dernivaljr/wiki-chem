import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCatalogResource } from '../catalog/useCatalogResource'
import type { Page } from '../catalog/types'
import { accessLabels } from './types'
import type { LibraryEntry } from './types'
import '../pages/Consultas/Consultas.css'

function Entries({ page, change }: { page: number; change: (page: number) => void }) {
  const { request } = useAuth()
  const load = useCallback(() => request<Page<LibraryEntry>>('/library?page=' + page, { includeMeta: true }), [request, page])
  const { result, retry } = useCatalogResource(load)

  return (
    <>
      {result.status === 'loading' && <p role="status">Carregando biblioteca…</p>}
      {result.status === 'error' && (
        <div className="search-empty" role="alert">
          <p>{result.error instanceof Error ? result.error.message : 'Não foi possível consultar a biblioteca.'}</p>
          <div className="search-empty__actions">
            <button type="button" onClick={retry}>Tentar novamente</button>
          </div>
        </div>
      )}
      {result.status === 'ready' && (
        <>
          {result.data.data.length ? (
            result.data.data.map(item => (
              <article className="search-card" key={item.methodologyId}>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem' }}>
                  <Link to={'/biblioteca/' + item.methodologyId}>{item.title}</Link>
                </h2>
                <p style={{ margin: '4px 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Versão adquirida: {item.originalVersionLabel} · Atual: {item.currentVersionLabel ?? 'indisponível'}
                </p>
                <p style={{ margin: '4px 0 10px', fontWeight: 550 }}>{accessLabels[item.accessState]}</p>
                <Link to={'/pedidos/' + item.orderId}>Consultar pedido original</Link>
              </article>
            ))
          ) : (
            <div className="search-empty">
              <p className="search-empty__title">
                {result.data.total ? 'Esta página não possui metodologias.' : 'Sua biblioteca está vazia.'}
              </p>
              {!result.data.total && (
                <p className="search-empty__hint">
                  Os guias técnicos adquiridos ficarão disponíveis aqui para leitura integral.
                </p>
              )}
            </div>
          )}

          <nav className="checkout-actions" aria-label="Paginação da biblioteca">
            <button type="button" disabled={page === 1} onClick={() => change(1)}>Primeira página</button>
            <button type="button" disabled={page === 1} onClick={() => change(page - 1)}>Anterior</button>
            <span>Página {page} · {result.data.total} metodologias</span>
            <button type="button" disabled={page * result.data.pageSize >= result.data.total} onClick={() => change(page + 1)}>
              Próxima
            </button>
          </nav>
        </>
      )}
    </>
  )
}

export default function Library() {
  const [params, setParams] = useSearchParams()
  const value = params.get('page') ?? '1'
  const valid =
    [...params.keys()].every(key => key === 'page') &&
    params.getAll('page').length <= 1 &&
    /^[1-9][0-9]{0,6}$/.test(value) &&
    Number(value) <= 1000000

  return (
    <main className="consultas">
      <div className="consultas__container">
        <header className="consultas__heading">
          <p className="consultas__eyebrow">ACERVO PESSOAL AUTORIZADO</p>
          <h1>Minha biblioteca</h1>
          <p>Acesse o conteúdo técnico integral e o histórico de versões das metodologias adquiridas.</p>
        </header>
        {valid ? (
          <Entries key={value} page={Number(value)} change={page => setParams(page === 1 ? {} : { page: String(page) })} />
        ) : (
          <div className="search-empty" role="alert">
            <p>Paginação inválida.</p>
            <div className="search-empty__actions">
              <button type="button" onClick={() => setParams({})}>Voltar à primeira página</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
