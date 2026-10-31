import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../auth/api'
import type { Cart } from '../commerce/types'
import { begin, clearRejected, readIntent } from './intent'
import type { Intent } from './intent'

function inspect(userId: string) {
  try {
    return { intent: readIntent(userId), error: '' }
  } catch (error) {
    return { intent: null, error: error instanceof Error ? error.message : 'Falha ao recuperar intenção.' }
  }
}

export default function CartCheckout({ cart, reload, blocked }: { cart: Cart; reload: () => void; blocked: boolean }) {
  const { request, user } = useAuth()
  const navigate = useNavigate()
  const [info, setInfo] = useState(() => (user ? inspect(user.id) : { intent: null as Intent | null, error: '' }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rejected, setRejected] = useState(false)

  if (!user) return null

  async function start() {
    if (!user) return
    setBusy(true)
    setError('')
    setRejected(false)
    try {
      const order = await begin(request, user.id, cart.revision)
      navigate('/checkout/' + order.id)
    } catch (err) {
      setInfo(inspect(user.id))
      const known =
        err instanceof ApiError &&
        ['CART_CHANGED', 'EMPTY_CART', 'PRODUCT_UNAVAILABLE', 'ALREADY_OWNED', 'ORDER_TOTAL_LIMIT', 'CART_LIMIT'].includes(err.code)
      setRejected(known)
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
        Você poderá revisar os itens e confirmar o pedido na próxima etapa (isento de cobrança financeira).
      </p>
      <button
        type="button"
        disabled={busy || blocked || Boolean(info.error) || (!canStart && !info.intent)}
        onClick={() => { void start() }}
      >
        {busy ? 'Preparando revisão…' : info.intent ? 'Recuperar revisão do pedido' : 'Prosseguir para revisão do pedido'}
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
