import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCatalogResource } from '../catalog/useCatalogResource'
import type { Page } from '../catalog/types'
import { brl } from '../commerce/types'
import DemoBanner from './DemoBanner'
import type { OrderSummary } from './types'
import { statusLabels } from './types'
import '../pages/Consultas/Consultas.css'
function History({ page, navigate }: { page: number; navigate: (page: number) => void }) {
  const { request } = useAuth()
  const load = useCallback(() => request<Page<OrderSummary>>('/orders?page=' + page, { includeMeta: true }), [request, page])
  const { result, retry } = useCatalogResource(load)
  return <>{result.status === 'loading' && <p role="status">Carregando pedidos…</p>}
    {result.status === 'error' && <div role="alert"><p>{result.error instanceof Error ? result.error.message : 'Falha ao carregar pedidos.'}</p><button type="button" onClick={retry}>Tentar novamente</button></div>}
    {result.status === 'ready' && <>{result.data.data.length ? result.data.data.map(order => <article className="search-card" key={order.id}><h2><Link to={'/pedidos/' + order.id}>Pedido {order.id}</Link></h2><p>{statusLabels[order.status]} · {new Date(order.createdAt).toLocaleString('pt-BR')}</p><p>{order.itemCount} {order.itemCount === 1 ? 'metodologia' : 'metodologias'} · {brl(order.totalCentavos)}</p></article>) : <p>{result.data.total ? 'Esta página não possui pedidos.' : 'Nenhum pedido demonstrativo registrado.'}</p>}
      <nav className="checkout-actions" aria-label="Paginação dos pedidos"><button type="button" disabled={page === 1} onClick={() => navigate(1)}>Primeira página</button><button type="button" disabled={page === 1} onClick={() => navigate(page - 1)}>Anterior</button><span>Página {page} · {result.data.total} pedidos</span><button type="button" disabled={page * result.data.pageSize >= result.data.total} onClick={() => navigate(page + 1)}>Próxima</button></nav>
    </>}
  </>
}
export default function Orders() {
  const [params, setParams] = useSearchParams(), value = params.get('page') ?? '1'
  const valid = [...params.keys()].every(key => key === 'page') && params.getAll('page').length <= 1 && /^[1-9][0-9]{0,6}$/.test(value) && Number(value) <= 1000000
  return <main className="consultas"><div className="consultas__container"><h1>Meus pedidos</h1><DemoBanner /><p>Histórico de aquisições simuladas e revisões persistidas. Nenhum pagamento é processado.</p>
    {valid ? <History key={value} page={Number(value)} navigate={page => setParams(page === 1 ? {} : { page: String(page) })} /> : <div role="alert"><p>Paginação inválida.</p><button type="button" onClick={() => setParams({})}>Voltar à primeira página</button></div>}
  </div></main>
}
