import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../auth/api'
import { validId } from '../catalog/search-state'
import { useCatalogResource } from '../catalog/useCatalogResource'
import { useCartSummary } from '../commerce/CartContext'
import { brl } from '../commerce/types'
import CheckoutNotice from './DemoBanner'
import { confirmIntent, releaseCompleted } from './intent'
import type { OrderDetail } from './types'
import { statusLabels } from './types'
import '../pages/Consultas/Consultas.css'

function OrderBody({ initial, review, reload }: { initial: OrderDetail; review: boolean; reload: () => void }) {
  const { request, user } = useAuth()
  const { refreshCart } = useCartSummary()
  const navigate = useNavigate()
  const [order, setOrder] = useState(initial)
  const [ack, setAck] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [stale, setStale] = useState(false)
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((Date.parse(initial.expiresAt) - Date.parse(initial.serverTime)) / 1000)),
  )

  useEffect(() => {
    if (order.status === 'COMPLETED_SIMULATED') {
      void refreshCart()
    }
  }, [order.status, refreshCart])

  useEffect(() => {
    if (order.status !== 'PENDING_CONFIRMATION') return
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [order.status])

  async function mutate(confirm: boolean) {
    if (!user) return
    setPending(true)
    setError('')
    try {
      const result = confirm
        ? await confirmIntent(request, user.id, order.id)
        : await request<OrderDetail>('/orders/' + order.id + '/cancel', { method: 'POST', body: {} })
      setOrder(result)
      setAck(false)
      if (result.status === 'COMPLETED_SIMULATED') {
        void refreshCart()
      }
    } catch (err) {
      const changed = err instanceof ApiError && ['OFFER_CHANGED', 'PRODUCT_UNAVAILABLE', 'ALREADY_OWNED'].includes(err.code)
      setStale(changed)
      if (err instanceof ApiError && err.code === 'ORDER_EXPIRED') setRemaining(0)
      const uncertain = !(err instanceof ApiError) || err.status === 0 || err.status >= 500
      setError(
        (uncertain ? 'Resultado ainda não confirmado no navegador. Consulte o estado do pedido ou repita a mesma intenção. ' : '') +
          (err instanceof Error ? err.message : 'Não foi possível concluir a operação.'),
      )
    } finally {
      setPending(false)
    }
  }

  function anotherReview() {
    if (!user) return
    try {
      releaseCompleted(user.id, order.id)
      navigate('/carrinho')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível recuperar a intenção anterior.')
    }
  }

  return (
    <>
      <h2 style={{ marginTop: 18 }}>{statusLabels[order.status]}</h2>
      <dl className="order-metadata">
        <div>
          <dt>Pedido</dt>
          <dd>#{order.id}</dd>
        </div>
        <div>
          <dt>Criado em</dt>
          <dd>{new Date(order.createdAt).toLocaleString('pt-BR')}</dd>
        </div>
        <div>
          <dt>Prazo de confirmação</dt>
          <dd>{new Date(order.expiresAt).toLocaleString('pt-BR')}</dd>
        </div>
      </dl>

      <section aria-label="Itens do pedido">
        {order.items.map(item => (
          <article className="search-card" key={item.id}>
            <h3 style={{ margin: '0 0 6px' }}>{item.titleSnapshot}</h3>
            <p style={{ margin: '4px 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Versão {item.versionLabelSnapshot} · Quantidade 1
            </p>
            <p style={{ margin: '4px 0', fontWeight: 700 }}>{brl(item.unitAmountCentavos)}</p>
          </article>
        ))}
      </section>

      <p style={{ marginTop: 18, fontSize: '1.12rem' }}>
        Total do pedido: <strong>{brl(order.totalCentavos)}</strong>
      </p>

      {error && <p role="alert">{error}</p>}
      {pending && <p role="status">Processando pedido…</p>}

      <div className="checkout-actions">
        <button className="consultas__secondary-btn" type="button" disabled={pending} onClick={reload}>
          Consultar estado do pedido
        </button>
        <Link to="/pedidos">Meus pedidos</Link>
      </div>

      {order.status === 'PENDING_CONFIRMATION' ? (
        review ? (
          <section className="search-card" aria-label="Confirmação do pedido">
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Tempo restante para confirmação: {Math.floor(remaining / 60)} min {remaining % 60} s (validado pelo servidor).
            </p>
            {(stale || remaining === 0) && (
              <p style={{ color: '#9e1f1f', fontWeight: 600 }}>
                Esta revisão não pode ser confirmada agora. Consulte seu estado ou cancele a revisão pendente para gerar outra com os valores atuais.
              </p>
            )}
            <label className="checkout-ack">
              <input
                type="checkbox"
                checked={ack}
                disabled={pending || stale || remaining === 0}
                onChange={event => setAck(event.target.checked)}
              />
              <span>
                Estou ciente de que esta transação não realiza cobrança financeira e confirmo os itens e valores deste pedido.
              </span>
            </label>
            <div className="checkout-actions">
              <button
                type="button"
                disabled={pending || !ack || stale || remaining === 0}
                onClick={() => { void mutate(true) }}
              >
                Confirmar pedido
              </button>
              <button
                className="consultas__secondary-btn"
                type="button"
                disabled={pending}
                onClick={() => { void mutate(false) }}
              >
                Cancelar revisão
              </button>
            </div>
          </section>
        ) : (
          <p style={{ marginTop: 16 }}>
            <Link to={'/checkout/' + order.id}>Abrir revisão para confirmar o pedido</Link>
          </p>
        )
      ) : (
        <section className="search-card" aria-label="Resultado do pedido">
          {order.status === 'COMPLETED_SIMULATED' ? (
            <>
              <p style={{ marginTop: 0, fontWeight: 600, color: '#165b33' }}>
                Pedido concluído sem cobrança financeira. Os conteúdos adquiridos já estão liberados na sua biblioteca digital.
              </p>
              <ul>
                {order.items.map(item => (
                  <li key={item.id}>
                    <Link to={'/biblioteca/' + item.methodologyId}>
                      Ler {item.titleSnapshot} na minha biblioteca
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ marginTop: 0 }}>
              Nenhuma aquisição foi concluída neste pedido. Os itens permanecem disponíveis no carrinho.
            </p>
          )}
          <div className="checkout-actions">
            <button className="consultas__secondary-btn" type="button" onClick={anotherReview}>
              Voltar ao carrinho para nova revisão
            </button>
            <Link to={'/pedidos/' + order.id}>Ver pedido persistido</Link>
          </div>
        </section>
      )}
    </>
  )
}

function OrderResource({ id, review }: { id: string; review: boolean }) {
  const { request } = useAuth()
  const load = useCallback(
    () => (validId(id) ? request<OrderDetail>('/orders/' + id) : Promise.reject(new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.'))),
    [request, id],
  )
  const { result, retry } = useCatalogResource(load)

  return (
    <main className="consultas">
      <div className="consultas__container">
        <header className="consultas__heading">
          <p className="consultas__eyebrow">{review ? 'CHECKOUT' : 'HISTÓRICO DE AQUISIÇÕES'}</p>
          <h1>{review ? 'Revisão do pedido' : 'Detalhes do pedido'}</h1>
        </header>
        <CheckoutNotice />
        {result.status === 'loading' && <p role="status">Carregando pedido…</p>}
        {result.status === 'error' && (
          <div className="search-empty" role="alert">
            <p>{result.error instanceof Error ? result.error.message : 'Não foi possível consultar o pedido.'}</p>
            <div className="search-empty__actions">
              <button type="button" onClick={retry}>Tentar novamente</button>
              <Link to="/pedidos">Consultar meus pedidos</Link>
            </div>
          </div>
        )}
        {result.status === 'ready' && (
          <OrderBody
            key={result.data.id + ':' + result.data.status + ':' + result.data.serverTime}
            initial={result.data}
            review={review}
            reload={retry}
          />
        )}
      </div>
    </main>
  )
}

export default function OrderPage({ review = false }: { review?: boolean }) {
  const { id = '' } = useParams()
  return <OrderResource key={id + ':' + review} id={id} review={review} />
}
