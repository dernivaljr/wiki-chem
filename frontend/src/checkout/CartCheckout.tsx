import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { AuthUser, AuthValue } from '../auth/AuthContext'
import { ApiError } from '../auth/api'
import type { Cart } from '../commerce/types'
import { begin, clearRejected, readIntent, reconcileIntent } from './intent'
import type { Intent } from './intent'

function inspect(userId: string): { intent: Intent | null; error: string } {
  try {
    return { intent: readIntent(userId), error: '' }
  } catch (error) {
    return { intent: null, error: error instanceof Error ? error.message : 'Falha ao recuperar intenção.' }
  }
}

function CartCheckoutBody({
  user,
  request,
  cart,
  reload,
  blocked,
}: {
  user: AuthUser
  request: AuthValue['request']
  cart: Cart
  reload: () => void
  blocked: boolean
}) {
  const navigate = useNavigate()
  const [info, setInfo] = useState(() => inspect(user.id))
  const [reconciling, setReconciling] = useState(() => Boolean(info.intent && !info.error))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rejected, setRejected] = useState(false)

  useEffect(() => {
    if (!reconciling) return
    let active = true
    void reconcileIntent(request, user.id, cart.revision)
      .then(reconciled => {
        if (active) setInfo({ intent: reconciled, error: '' })
      })
      .catch(err => {
        if (active) setInfo({ intent: null, error: err instanceof Error ? err.message : 'Falha ao verificar revisão pendente.' })
      })
      .finally(() => {
        if (active) setReconciling(false)
      })
    return () => {
      active = false
    }
  }, [reconciling, request, user.id, cart.revision])

  async function start() {
    setBusy(true)
    setError('')
    setRejected(false)
    try {
      const order = await begin(request, user.id, cart.revision)
      navigate('/checkout/' + order.id)
    } catch (err) {
      const updated = inspect(user.id)
      setInfo(updated)
      const known =
        err instanceof ApiError &&
        ['CART_CHANGED', 'EMPTY_CART', 'PRODUCT_UNAVAILABLE', 'ALREADY_OWNED', 'ORDER_TOTAL_LIMIT', 'CART_LIMIT'].includes(err.code)
      setRejected(known && Boolean(updated.intent))
      setError(
        (err instanceof Error ? err.message : 'Falha ao criar revisão.') +
          (known ? '' : ' Consulte o histórico ou repita a mesma tentativa para recuperar o resultado.'),
      )
    } finally {
      setBusy(false)
    }
  }

  const canStart = cart.items.length > 0 && cart.unavailableCount === 0

  return (
    <section className="checkout-actions" aria-label="Finalização do pedido">
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
        Na próxima etapa você escolherá a modalidade de pagamento simulado (PIX, cartão ou boleto) e confirmará o pedido sem cobrança financeira.
      </p>
      <button
        type="button"
        disabled={busy || reconciling || blocked || Boolean(info.error) || (!canStart && !info.intent)}
        onClick={() => { void start() }}
      >
        {busy
          ? 'Preparando revisão…'
          : reconciling
            ? 'Verificando carrinho…'
            : info.intent
              ? 'Recuperar revisão do pedido'
              : 'Prosseguir para revisão do pedido'}
      </button>
      <Link to="/pedidos">Consultar meus pedidos</Link>
      {(error || info.error) && <p role="alert">{error || info.error}</p>}
      {rejected && info.intent && (
        <button
          className="consultas__secondary-btn"
          type="button"
          onClick={() => {
            clearRejected(user.id, info.intent!.key)
            setInfo({ intent: null, error: '' })
            reload()
          }}
        >
          Descartar tentativa rejeitada e revisar carrinho
        </button>
      )}
    </section>
  )
}

export default function CartCheckout({ cart, reload, blocked }: { cart: Cart; reload: () => void; blocked: boolean }) {
  const { request, user } = useAuth()
  if (!user) return null
  return (
    <CartCheckoutBody
      key={user.id + ':' + cart.revision}
      user={user}
      request={request}
      cart={cart}
      reload={reload}
      blocked={blocked}
    />
  )
}
