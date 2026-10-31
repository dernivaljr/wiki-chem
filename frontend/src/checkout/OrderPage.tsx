import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../auth/api'
import { validId } from '../catalog/search-state'
import { useCatalogResource } from '../catalog/useCatalogResource'
import { useCartSummary } from '../commerce/CartContext'
import { brl } from '../commerce/types'
import { Barcode, CheckCircle2, CreditCard, QrCode } from '../components/icons'
import CheckoutNotice from './DemoBanner'
import { confirmIntent, readConfirmIntent, releaseCompleted } from './intent'
import type { ConfirmIntent } from './intent'
import type { OrderDetail, PaymentMethod } from './types'
import {
  paymentCompletionMessages,
  paymentMethodDescriptions,
  paymentMethodLabels,
  paymentMethods,
  statusLabels,
} from './types'
import '../pages/Consultas/Consultas.css'

function inspectConfirm(userId: string | undefined, orderId: string): { locked: ConfirmIntent | null; error: string } {
  if (!userId) return { locked: null, error: '' }
  try {
    return { locked: readConfirmIntent(userId, orderId), error: '' }
  } catch (err) {
    return { locked: null, error: err instanceof Error ? err.message : 'Falha ao ler estado local da confirmação.' }
  }
}

function PaymentIcon({ method }: { method: PaymentMethod }) {
  if (method === 'PIX') return <QrCode size={20} aria-hidden="true" />
  if (method === 'CREDIT_CARD') return <CreditCard size={20} aria-hidden="true" />
  return <Barcode size={20} aria-hidden="true" />
}

function OrderBody({ initial, review, reload }: { initial: OrderDetail; review: boolean; reload: () => void }) {
  const { request, user } = useAuth()
  const { refreshCart } = useCartSummary()
  const navigate = useNavigate()
  const [order, setOrder] = useState(initial)
  const [confirmState, setConfirmState] = useState(() => inspectConfirm(user?.id, initial.id))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(() => confirmState.locked?.paymentMethod ?? null)
  const [ack, setAck] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(confirmState.error)
  const [stale, setStale] = useState(false)
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((Date.parse(initial.expiresAt) - Date.parse(initial.serverTime)) / 1000)),
  )

  useEffect(() => {
    if (!user || order.status === 'PENDING_CONFIRMATION') return
    try {
      releaseCompleted(user.id, order.id, order.cartRevisionSnapshot)
    } catch {
      /* Estado terminal do servidor prevalece sobre limpeza local. */
    }
    if (order.status === 'COMPLETED_SIMULATED') {
      void refreshCart()
    }
  }, [user, order.id, order.status, order.cartRevisionSnapshot, refreshCart])

  useEffect(() => {
    if (order.status !== 'PENDING_CONFIRMATION') return
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [order.status])

  async function mutate(confirm: boolean) {
    if (!user) return
    if (confirm && !paymentMethod) {
      setError('Selecione uma forma de pagamento antes de confirmar o pedido.')
      return
    }
    setPending(true)
    setError('')
    try {
      const result = confirm
        ? await confirmIntent(request, user.id, order.id, paymentMethod!)
        : await request<OrderDetail>('/orders/' + order.id + '/cancel', { method: 'POST', body: {} })
      if (result.status !== 'PENDING_CONFIRMATION') {
        try {
          releaseCompleted(user.id, order.id, result.cartRevisionSnapshot)
        } catch {
          /* Estado terminal persistido no servidor prevalece. */
        }
        setConfirmState({ locked: null, error: '' })
      }
      setOrder(result)
      setAck(false)
      if (result.status === 'COMPLETED_SIMULATED') {
        void refreshCart()
      }
    } catch (err) {
      const changed = err instanceof ApiError && ['OFFER_CHANGED', 'PRODUCT_UNAVAILABLE', 'ALREADY_OWNED'].includes(err.code)
      setStale(changed)
      const expired = err instanceof ApiError && err.code === 'ORDER_EXPIRED'
      if (expired) setRemaining(0)
      if (changed || expired || (err instanceof ApiError && err.code === 'ORDER_STATE')) {
        try {
          releaseCompleted(user.id, order.id, order.cartRevisionSnapshot)
        } catch {
          /* Ignora falha local após recusa determinística. */
        }
        setConfirmState({ locked: null, error: '' })
      } else {
        const nextConfirm = inspectConfirm(user.id, order.id)
        setConfirmState(nextConfirm)
        if (nextConfirm.locked) setPaymentMethod(nextConfirm.locked.paymentMethod)
      }
      const uncertain = !(err instanceof ApiError) || err.status === 0 || err.status >= 500
      setError(
        (uncertain ? 'Resultado ainda não confirmado no navegador. Consulte o estado do pedido ou repita a mesma intenção. ' : '') +
          (err instanceof Error ? err.message : 'Não foi possível concluir a operação.'),
      )
    } finally {
      setPending(false)
    }
  }

  function returnToCart() {
    if (!user) return
    try {
      releaseCompleted(user.id, order.id, order.cartRevisionSnapshot)
    } catch {
      /* Segue para o carrinho mesmo sem armazenamento local disponível. */
    }
    navigate('/carrinho')
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
        {order.status === 'COMPLETED_SIMULATED' ? (
          <>
            <div>
              <dt>Concluído em</dt>
              <dd>{order.completedAt ? new Date(order.completedAt).toLocaleString('pt-BR') : '—'}</dd>
            </div>
            <div>
              <dt>Forma de pagamento</dt>
              <dd>{order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : 'Simulação direta (isento)'}</dd>
            </div>
          </>
        ) : order.status === 'CANCELLED' ? (
          <div>
            <dt>Cancelado em</dt>
            <dd>{order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('pt-BR') : '—'}</dd>
          </div>
        ) : (
          <div>
            <dt>Prazo de confirmação</dt>
            <dd>{new Date(order.expiresAt).toLocaleString('pt-BR')}</dd>
          </div>
        )}
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

      {order.status === 'PENDING_CONFIRMATION' ? (
        review ? (
          <section className="search-card checkout-review-panel" aria-label="Confirmação do pedido">
            <fieldset className="payment-methods" disabled={pending || stale || remaining === 0 || Boolean(confirmState.error)}>
              <legend className="payment-methods__legend">Forma de pagamento (simulação acadêmica)</legend>
              <div className="payment-methods__grid">
                {paymentMethods.map(method => {
                  const selected = paymentMethod === method
                  const lockedToOther = Boolean(confirmState.locked && confirmState.locked.paymentMethod !== method)
                  return (
                    <label
                      key={method}
                      className={'payment-option' + (selected ? ' payment-option--selected' : '') + (lockedToOther ? ' payment-option--disabled' : '')}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={selected}
                        disabled={lockedToOther}
                        onChange={() => setPaymentMethod(method)}
                      />
                      <span className="payment-option__icon">
                        <PaymentIcon method={method} />
                      </span>
                      <span className="payment-option__body">
                        <span className="payment-option__title">{paymentMethodLabels[method]}</span>
                        <span className="payment-option__desc">{paymentMethodDescriptions[method]}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {confirmState.locked && (
              <p className="payment-locked-note">
                Tentativa em andamento vinculada à modalidade <strong>{paymentMethodLabels[confirmState.locked.paymentMethod]}</strong> para evitar processamento duplicado.
              </p>
            )}

            <div className="checkout-summary-box" aria-label="Resumo da confirmação">
              <div>
                <span>Modalidade selecionada:</span>{' '}
                <strong>{paymentMethod ? paymentMethodLabels[paymentMethod] : 'Selecione PIX, Cartão de crédito ou Boleto bancário'}</strong>
              </div>
              <div>
                <span>Total consolidado:</span> <strong>{brl(order.totalCentavos)}</strong>{' '}
                <span className="checkout-summary-box__zero">(cobrança real: R$ 0,00)</span>
              </div>
              <div className="checkout-summary-box__timer">
                Tempo restante para confirmação: {Math.floor(remaining / 60)} min {remaining % 60} s (validado pelo servidor).
              </div>
            </div>

            {(stale || remaining === 0) && (
              <p style={{ color: '#9e1f1f', fontWeight: 600 }}>
                Esta revisão não pode ser confirmada agora. Consulte seu estado ou cancele a revisão pendente para gerar outra com os valores atuais.
              </p>
            )}

            <label className="checkout-ack">
              <input
                type="checkbox"
                checked={ack}
                disabled={pending || stale || remaining === 0 || Boolean(confirmState.error)}
                onChange={event => setAck(event.target.checked)}
              />
              <span>
                Estou ciente de que esta transação simula a quitação na modalidade escolhida sem realizar cobrança financeira e confirmo os itens deste pedido.
              </span>
            </label>

            <div className="checkout-actions">
              <button
                type="button"
                disabled={pending || !ack || !paymentMethod || stale || remaining === 0 || Boolean(confirmState.error)}
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
              <button className="consultas__secondary-btn" type="button" disabled={pending} onClick={reload}>
                Consultar estado do pedido
              </button>
              <Link to="/pedidos">Meus pedidos</Link>
            </div>
          </section>
        ) : (
          <div className="checkout-actions">
            <Link to={'/checkout/' + order.id}>Abrir revisão para confirmar o pedido</Link>
            <button className="consultas__secondary-btn" type="button" disabled={pending} onClick={reload}>
              Consultar estado do pedido
            </button>
            <Link to="/pedidos">Meus pedidos</Link>
          </div>
        )
      ) : (
        <section className="search-card" aria-label="Resultado do pedido">
          {order.status === 'COMPLETED_SIMULATED' ? (
            <>
              <div className="order-completed-banner">
                <CheckCircle2 size={20} aria-hidden="true" />
                <div>
                  <p className="order-completed-banner__title">
                    {order.paymentMethod
                      ? paymentCompletionMessages[order.paymentMethod]
                      : 'Pedido concluído sem cobrança financeira. Os conteúdos adquiridos já estão liberados na sua biblioteca digital.'}
                  </p>
                  {order.paymentMethod && (
                    <p className="order-completed-banner__meta">
                      Modalidade registrada: <strong>{paymentMethodLabels[order.paymentMethod]}</strong> · Isento de cobrança real
                    </p>
                  )}
                </div>
              </div>
              <ul className="order-acquired-links">
                {order.items.map(item => (
                  <li key={item.id}>
                    <Link to={'/biblioteca/' + item.methodologyId}>
                      Ler {item.titleSnapshot} na minha biblioteca
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="checkout-actions">
                <Link to="/consultas">Continuar comprando</Link>
                {review && <Link to={'/pedidos/' + order.id}>Ver pedido persistido</Link>}
                <Link to="/pedidos">Meus pedidos</Link>
                <button className="consultas__secondary-btn" type="button" disabled={pending} onClick={reload}>
                  Consultar estado do pedido
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginTop: 0 }}>
                Nenhuma aquisição foi concluída neste pedido. Os itens permanecem disponíveis no carrinho.
              </p>
              <div className="checkout-actions">
                <button className="consultas__secondary-btn" type="button" onClick={returnToCart}>
                  Voltar ao carrinho para nova revisão
                </button>
                {review && <Link to={'/pedidos/' + order.id}>Ver pedido persistido</Link>}
                <Link to="/pedidos">Meus pedidos</Link>
                <button className="consultas__secondary-btn" type="button" disabled={pending} onClick={reload}>
                  Consultar estado do pedido
                </button>
              </div>
            </>
          )}
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
