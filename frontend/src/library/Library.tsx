import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCatalogResource } from '../catalog/useCatalogResource'
import type { Page } from '../catalog/types'
import DemoBanner from '../checkout/DemoBanner'
import { accessLabels } from './types'
import type { LibraryEntry } from './types'
import '../pages/Consultas/Consultas.css'
function Entries({ page, change }: { page: number; change: (page: number) => void }) {
  const { request } = useAuth()
  const load = useCallback(() => request<Page<LibraryEntry>>('/library?page=' + page, { includeMeta: true }), [request, page])
  const { result, retry } = useCatalogResource(load)
  return <>{result.status === 'loading' && <p role="status">Carregando biblioteca…</p>}
    {result.status === 'error' && <div role="alert"><p>{result.error instanceof Error ? result.error.message : 'Não foi possível consultar a biblioteca.'}</p><button onClick={retry}>Tentar novamente</button></div>}
    {result.status === 'ready' && <>{result.data.data.length ? result.data.data.map(item => <article className="search-card" key={item.methodologyId}><h2><Link to={'/biblioteca/' + item.methodologyId}>{item.title}</Link></h2><p>Versão adquirida: {item.originalVersionLabel} · Atual: {item.currentVersionLabel ?? 'indisponível'}</p><p>{accessLabels[item.accessState]}</p><Link to={'/pedidos/' + item.orderId}>Consultar pedido original</Link></article>) : <p>{result.data.total ? 'Esta página não possui metodologias.' : 'Sua biblioteca está vazia. As aquisições demonstrativas concluídas aparecerão aqui.'}</p>}
      <nav className="checkout-actions" aria-label="Paginação da biblioteca"><button disabled={page === 1} onClick={() => change(1)}>Primeira página</button><button disabled={page === 1} onClick={() => change(page - 1)}>Anterior</button><span>Página {page} · {result.data.total} metodologias</span><button disabled={page * result.data.pageSize >= result.data.total} onClick={() => change(page + 1)}>Próxima</button></nav>
    </>}
  </>
}
export default function Library() {
  const [params, setParams] = useSearchParams(), value = params.get('page') ?? '1'
  const valid = [...params.keys()].every(key => key === 'page') && params.getAll('page').length <= 1 && /^[1-9][0-9]{0,6}$/.test(value) && Number(value) <= 1000000
  return <main className="consultas"><div className="consultas__container"><h1>Minha biblioteca</h1><DemoBanner /><p>Acesso aos conteúdos adquiridos na demonstração, condicionado à autorização de cada versão.</p>
    {valid ? <Entries key={value} page={Number(value)} change={page => setParams(page === 1 ? {} : { page: String(page) })} /> : <div role="alert"><p>Paginação inválida.</p><button onClick={() => setParams({})}>Voltar à primeira página</button></div>}
  </div></main>
}
