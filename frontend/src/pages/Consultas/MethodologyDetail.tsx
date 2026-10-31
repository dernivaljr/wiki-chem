import { useCallback } from 'react'
import { ArrowLeft } from '../../components/icons'
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
  const load = useCallback(
    () => (validId(id) ? request<Preview>('/methodologies/' + id) : Promise.reject(new ApiError(404, 'NOT_FOUND', 'Metodologia indisponível.'))),
    [request, id],
  )
  const { result, retry } = useCatalogResource(load)

  return (
    <main className="consultas">
      <div className="consultas__container">
        <Link className="search-back" to={back}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar à pesquisa</span>
        </Link>

        {result.status === 'loading' && (
          <div className="search-card">
            <h1>Carregando metodologia</h1>
            <p role="status">Consultando metadados e disponibilidade…</p>
          </div>
        )}

        {result.status === 'error' && (
          <div className="search-card">
            <h1>{result.error instanceof ApiError && result.error.status === 404 ? 'Metodologia indisponível' : 'Falha ao carregar metodologia'}</h1>
            <p role="alert">{result.error instanceof Error ? result.error.message : 'Não foi possível carregar os detalhes da metodologia.'}</p>
            <button type="button" onClick={retry}>Tentar novamente</button>
          </div>
        )}

        {result.status === 'ready' && (
          <article className="method-detail">
            <PreviewContent preview={result.data} detail />
          </article>
        )}
      </div>
    </main>
  )
}

export default function MethodologyDetail() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const target = safeReturnTo(params.get('from'))
  const back = target.split('?')[0] === '/consultas' ? target : '/consultas'
  return <Detail key={id} id={id} back={back} />
}
