import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../auth/api'
import { validId } from '../catalog/search-state'
import { useCatalogResource } from '../catalog/useCatalogResource'
import { useProtectedResource } from './useProtectedResource'
import type { Page } from '../catalog/types'
import DemoBanner from '../checkout/DemoBanner'
import type { EligibleVersion, LibraryContent, LibraryEntry } from './types'
import { accessLabels } from './types'
import './library.css'
import '../pages/Consultas/Consultas.css'
function Content({ methodologyId, versionId }: { methodologyId: string; versionId: string }) {
  const { request } = useAuth()
  const load = useCallback(() => request<LibraryContent>('/library/' + methodologyId + '/content' + (versionId ? '?versionId=' + versionId : '')), [request, methodologyId, versionId])
  const { result, retry } = useProtectedResource(load)
  return <section aria-label="Leitura autorizada">{result.status === 'loading' && <p role="status">Verificando autorização e carregando conteúdo…</p>}
    {result.status === 'error' && <div role="alert"><p>{result.error instanceof Error ? result.error.message : 'Conteúdo indisponível.'}</p><button onClick={retry}>Verificar acesso novamente</button></div>}
    {result.status === 'ready' && <><h2>{result.data.title}</h2><p>Versão consultada: {result.data.versionLabel} · Publicada em {new Date(result.data.publishedAt).toLocaleString('pt-BR')}</p>
      <h3>Descrição técnica completa</h3><div className="library-procedure">{result.data.fullDescription}</div>
      <h3>Procedimento completo</h3><div className="library-procedure">{result.data.fullProcedure}</div>
      <h3>Autoria e curadoria</h3><ul>{result.data.contributors.map((person, index) => <li key={index}>{person.displayName} · {person.role === 'AUTHOR' ? 'Autoria' : 'Curadoria'}{person.reference && ' · ' + person.reference}</li>)}</ul>
      <h3>Referências</h3><ul className="library-references">{result.data.references.map((ref, index) => <li key={index}>{ref.referenceText} · {ref.ownerCredit} · {ref.editionLabel} · {ref.locator}{/^https?:\/\//.test(ref.canonicalUrl) && <> · <a href={ref.canonicalUrl} target="_blank" rel="noreferrer">Consultar fonte {index + 1}</a></>}</li>)}</ul>
      <button onClick={retry}>Verificar acesso novamente</button>
    </>}
  </section>
}
function History({ methodologyId, selected, change }: { methodologyId: string; selected: string; change: (value: string) => void }) {
  const { request } = useAuth(), [page, setPage] = useState(1)
  const load = useCallback(() => request<Page<EligibleVersion>>('/library/' + methodologyId + '/versions?page=' + page, { includeMeta: true }), [request, methodologyId, page])
  const { result, retry } = useCatalogResource(load)
  return <section aria-label="Histórico publicado elegível"><h2>Versões publicadas elegíveis</h2><p>A versão atual é o padrão. Uma indisponibilidade não seleciona outra versão automaticamente.</p>
    <button onClick={() => change('')} disabled={!selected}>Consultar versão atual</button>
    {result.status === 'loading' && <p role="status">Carregando versões…</p>}
    {result.status === 'error' && <div role="alert"><p>Não foi possível consultar as versões autorizadas.</p><button onClick={retry}>Atualizar versões</button></div>}
    {result.status === 'ready' && <><div className="library-selection"><label htmlFor="library-version">Selecionar versão histórica</label><select id="library-version" value={result.data.data.some(item => item.id === selected) ? selected : ''} onChange={event => { if (event.target.value) change(event.target.value) }}><option value="">Escolha explicitamente uma versão</option>{result.data.data.map(item => <option value={item.id} key={item.id}>{item.versionLabel}{item.original ? ' — adquirida' : ''}{item.current ? ' — atual' : ''}</option>)}</select></div>
      {!result.data.data.length && <p>Nenhuma versão elegível nesta página.</p>}
      <nav className="checkout-actions" aria-label="Paginação das versões"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Versões anteriores</button><span>Página {page} · {result.data.total} versões</span><button disabled={page * result.data.pageSize >= result.data.total} onClick={() => setPage(value => value + 1)}>Mais versões</button></nav>
    </>}
  </section>
}
function Reader({ id, selected, change }: { id: string; selected: string; change: (value: string) => void }) {
  const { request } = useAuth(), [visible, setVisible] = useState(document.visibilityState !== 'hidden'), [epoch, setEpoch] = useState(0)
  const load = useCallback(() => validId(id) ? request<LibraryEntry>('/library/' + id) : Promise.reject(new ApiError(404, 'NOT_FOUND', 'Metodologia não encontrada.')), [request, id])
  const { result, retry } = useCatalogResource(load)
  useEffect(() => {
    const visibility = () => { setVisible(document.visibilityState !== 'hidden'); setEpoch(value => value + 1) }
    const refresh = () => setEpoch(value => value + 1)
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pageshow', refresh); window.addEventListener('focus', refresh)
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pageshow', refresh); window.removeEventListener('focus', refresh) }
  }, [])
  return <>{result.status === 'loading' && <p role="status">Carregando direito adquirido…</p>}
    {result.status === 'error' && <div role="alert"><p>{result.error instanceof Error ? result.error.message : 'Não foi possível verificar seu direito.'}</p><button onClick={retry}>Tentar novamente</button></div>}
    {result.status === 'ready' && <><h2>{result.data.title}</h2><p>Versão adquirida: {result.data.originalVersionLabel} · Atual: {result.data.currentVersionLabel ?? 'indisponível'}</p><p>{accessLabels[result.data.accessState]}</p><Link to={'/pedidos/' + result.data.orderId}>Consultar pedido original</Link>
      {result.data.entitlementStatus === 'ACTIVE' && <><History methodologyId={id} selected={selected} change={change} />{visible ? <Content key={id + ':' + selected + ':' + epoch} methodologyId={id} versionId={selected} /> : <p>Leitura ocultada enquanto esta página está em segundo plano. O acesso será verificado ao retornar.</p>}</>}
    </>}
  </>
}
export default function LibraryReader() {
  const { methodologyId = '' } = useParams(), [params, setParams] = useSearchParams(), selected = params.get('versionId') ?? ''
  const valid = [...params.keys()].every(key => key === 'versionId') && params.getAll('versionId').length <= 1 && (!params.has('versionId') || validId(selected))
  return <main className="consultas"><div className="consultas__container"><h1>Leitura na minha biblioteca</h1><DemoBanner /><Link to="/biblioteca">Voltar à minha biblioteca</Link>
    {valid ? <Reader key={methodologyId} id={methodologyId} selected={selected} change={value => setParams(value ? { versionId: value } : {})} /> : <div role="alert"><p>Seleção de versão inválida.</p><button onClick={() => setParams({})}>Consultar versão atual</button></div>}
  </div></main>
}
