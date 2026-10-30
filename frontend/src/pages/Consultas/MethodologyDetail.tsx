import { useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../auth/api'
import { safeReturnTo } from '../../auth/returnTo'
import { validId } from '../../catalog/search-state'
import type { Preview } from '../../catalog/types'
import PreviewContent from '../../catalog/PreviewContent'
import { useCatalogResource } from '../../catalog/useCatalogResource'
import './Consultas.css'
function Detail({ id, back }: { id: string; back: string }) {
  const { request } = useAuth()
  const load = useCallback(() => validId(id) ? request<Preview>('/methodologies/' + id) : Promise.reject(new ApiError(404, 'NOT_FOUND', 'Metodologia indisponível.')), [request, id])
  const { result, retry } = useCatalogResource(load)
  return <main className="consultas"><div className="consultas__container"><Link className="search-back" to={back}>Voltar à pesquisa</Link>
    {result.status === 'loading' && <><h1>Prévia da metodologia</h1><p role="status">Carregando metodologia…</p></>}
    {result.status === 'error' && <><h1>{result.error instanceof ApiError && result.error.status === 404 ? 'Metodologia indisponível' : 'Falha ao carregar metodologia'}</h1><p role="alert">{result.error instanceof Error ? result.error.message : 'Não foi possível carregar a prévia.'}</p><button type="button" onClick={retry}>Tentar novamente</button></>}
    {result.status === 'ready' && <article className="search-card"><p className="consultas__eyebrow">PRÉVIA GRATUITA</p><h1>{result.data.title}</h1><PreviewContent preview={result.data} detail /></article>}
  </div></main>
}
export default function MethodologyDetail() {
  const { id = '' } = useParams(), [params] = useSearchParams()
  const target = safeReturnTo(params.get('from'))
  const back = target.split('?')[0] === '/consultas' ? target : '/consultas'
  return <Detail key={id} id={id} back={back} />
}
