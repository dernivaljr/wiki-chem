import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCatalogResource } from '../catalog/useCatalogResource'
import type { Page } from '../catalog/types'
import { brl } from '../commerce/types'
import type { OrderSummary } from './types'
import { statusLabels } from './types'
import '../pages/Consultas/Consultas.css'

function History({ page, navigate }: { page: number; navigate: (page: number) => void }) {
  const { request } = useAuth()
  const load = useCallback(() => request<Page<OrderSummary>>('/orders?page=' + page, { includeMeta: true }), [request, page])
  const { result, retry } = useCatalogResource(load)

  return (
    <>
      {result.status === 'loading' && <p role="status">Carregando pedidos…</p>}
      {result.status === 'error' && (
        <div className="search-empty" role="alert">
          <p>{result.error instanceof Error ? result.error.message : 'Falha ao carregar pedidos.'}</p>
          <div className="search-empty__actions">
            <button type="button" onClick={retry}>Tentar novamente</button>
          </div>
        </div>
      )}
      {result.status === 'ready' && (
        <>
          {result.data.data.length ? (
            result.data.data.map(order => (
              <article className="search-card" key={order.id}>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem' }}>
                  <Link to={'/pedidos/' + order.id}>Pedido {order.id}</Link>
                </h2>
                <p style={{ margin: '4px 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {statusLabels[order.status]} · {new Date(order.createdAt).toLocaleString('pt-BR')}
                </p>
                <p style={{ margin: '4px 0', fontWeight: 650 }}>
                  {order.itemCount} {order.itemCount === 1 ? 'metodologia' : 'metodologias'} · {brl(order.totalCentavos)}
                </p>
              </article>
            ))
          ) : (
            <div className="search-empty">
              <p className="search-empty__title">
                {result.data.total ? 'Esta página não possui pedidos.' : 'Nenhum pedido registrado na sua conta.'}
              </p>
            </div>
          )}

          <nav className="checkout-actions" aria-label="Paginação dos pedidos">
            <button type="button" disabled={page === 1} onClick={() => navigate(1)}>Primeira página</button>
            <button type="button" disabled={page === 1} onClick={() => navigate(page - 1)}>Anterior</button>
            <span>Página {page} · {result.data.total} pedidos</span>
            <button type="button" disabled={page * result.data.pageSize >= result.data.total} onClick={() => navigate(page + 1)}>
              Próxima
            </button>
          </nav>
        </>
      )}
    </>
  )
}

export default function Orders() {
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
          <p className="consultas__eyebrow">CONTA E AQUISIÇÕES</p>
          <h1>Meus pedidos</h1>
          <p>Consulte os pedidos registrados, os valores consolidados e o acesso aos conteúdos liberados.</p>
        </header>
        {valid ? (
          <History key={value} page={Number(value)} navigate={page => setParams(page === 1 ? {} : { page: String(page) })} />
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
