import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../auth/api'
import { validId } from '../catalog/search-state'
import { useCatalogResource } from '../catalog/useCatalogResource'
import { brl } from '../commerce/types'
import DemoBanner from './DemoBanner'
import { confirmIntent, releaseCompleted } from './intent'
import type { OrderDetail } from './types'
import { statusLabels } from './types'
import '../pages/Consultas/Consultas.css'
function OrderBody({ initial, review, reload }: { initial: OrderDetail; review: boolean; reload: () => void }) {
  const { request, user } = useAuth(), navigate = useNavigate()
  const [order, setOrder] = useState(initial), [ack, setAck] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState(''), [stale, setStale] = useState(false)
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((Date.parse(initial.expiresAt) - Date.parse(initial.serverTime)) / 1000)))
  useEffect(() => {
    if (order.status !== 'PENDING_CONFIRMATION') return
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [order.status])
  async function mutate(confirm: boolean) {
    if (!user) return
    setPending(true); setError('')
    try {
      const result = confirm ? await confirmIntent(request, user.id, order.id) : await request<OrderDetail>('/orders/' + order.id + '/cancel', { method: 'POST', body: {} })
      setOrder(result); setAck(false)
    } catch (error) {
      const changed = error instanceof ApiError && ['OFFER_CHANGED','PRODUCT_UNAVAILABLE','ALREADY_OWNED'].includes(error.code)
      setStale(changed)
      if (error instanceof ApiError && error.code === 'ORDER_EXPIRED') setRemaining(0)
      const uncertain = !(error instanceof ApiError) || error.status === 0 || error.status >= 500
      setError((uncertain ? 'Resultado ainda não confirmado no navegador. Consulte o estado do pedido ou repita a mesma intenção. ' : '') + (error instanceof Error ? error.message : 'Não foi possível concluir a operação.'))
    } finally { setPending(false) }
  }
  function anotherReview() {
    if (!user) return
    try { releaseCompleted(user.id, order.id); navigate('/carrinho') }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível recuperar a intenção anterior.') }
  }
  return <>
    <h2>{statusLabels[order.status]}</h2>
    <dl className="order-metadata"><div><dt>Pedido</dt><dd>{order.id}</dd></div><div><dt>Criado em</dt><dd>{new Date(order.createdAt).toLocaleString('pt-BR')}</dd></div><div><dt>Prazo de confirmação</dt><dd>{new Date(order.expiresAt).toLocaleString('pt-BR')}</dd></div></dl>
    <section aria-label="Itens do pedido">{order.items.map(item => <article className="search-card" key={item.id}><h3>{item.titleSnapshot}</h3><p>Versão {item.versionLabelSnapshot} · Quantidade 1</p><p>{brl(item.unitAmountCentavos)}</p></article>)}</section>
    <p>Total da revisão: <strong>{brl(order.totalCentavos)}</strong></p>
    {error && <p role="alert">{error}</p>}{pending && <p role="status">Processando demonstração…</p>}
    <div className="checkout-actions"><button type="button" disabled={pending} onClick={reload}>Consultar estado do pedido</button><Link to="/pedidos">Meus pedidos</Link></div>
    {order.status === 'PENDING_CONFIRMATION' ? review ? <section aria-label="Confirmação demonstrativa">
      <p>Tempo informativo restante: {Math.floor(remaining / 60)} min {remaining % 60} s. O prazo é validado pelo servidor.</p>
      {(stale || remaining === 0) && <p>Esta revisão não pode ser confirmada agora. Consulte seu estado; cancele a revisão ainda pendente para criar outra com os valores atuais.</p>}
      <label className="checkout-ack"><input type="checkbox" checked={ack} disabled={pending || stale || remaining === 0} onChange={event => setAck(event.target.checked)} /><span>Entendo que esta aquisição é uma demonstração, sem cobrança, e confirmo os itens e valores desta revisão.</span></label>
      <div className="checkout-actions"><button type="button" disabled={pending || !ack || stale || remaining === 0} onClick={() => { void mutate(true) }}>Confirmar aquisição de demonstração</button><button type="button" disabled={pending} onClick={() => { void mutate(false) }}>Cancelar revisão</button></div>
    </section> : <p><Link to={'/checkout/' + order.id}>Revisar aquisição demonstrativa</Link></p> : <section aria-label="Resultado da demonstração">
      {order.status === 'COMPLETED_SIMULATED' ? <p>Aquisição simulada registrada, sem cobrança. Os direitos de demonstração foram registrados. A leitura pela biblioteca ainda não está disponível.</p> : <p>Nenhuma aquisição foi concluída por este pedido. Os itens não foram removidos do carrinho.</p>}
      <div className="checkout-actions"><button type="button" onClick={anotherReview}>Voltar ao carrinho para nova revisão</button><Link to={'/pedidos/' + order.id}>Ver pedido persistido</Link></div>
    </section>}
  </>
}
function OrderResource({ id, review }: { id: string; review: boolean }) {
  const { request } = useAuth()
  const load = useCallback(() => validId(id) ? request<OrderDetail>('/orders/' + id) : Promise.reject(new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.')), [request, id])
  const { result, retry } = useCatalogResource(load)
  return <main className="consultas"><div className="consultas__container"><h1>{review ? 'Revisar aquisição demonstrativa' : 'Detalhes do pedido'}</h1><DemoBanner />
    {result.status === 'loading' && <p role="status">Carregando pedido…</p>}
    {result.status === 'error' && <div role="alert"><p>{result.error instanceof Error ? result.error.message : 'Não foi possível consultar o pedido.'}</p><button type="button" onClick={retry}>Tentar novamente</button><p><Link to="/pedidos">Consultar meus pedidos</Link></p></div>}
    {result.status === 'ready' && <OrderBody key={result.data.id + ':' + result.data.status + ':' + result.data.serverTime} initial={result.data} review={review} reload={retry} />}
  </div></main>
}
export default function OrderPage({ review = false }: { review?: boolean }) {
  const { id = '' } = useParams()
  return <OrderResource key={id + ':' + review} id={id} review={review} />
}
