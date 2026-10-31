import { useCallback, useState } from 'react'
import { RefreshCw, Trash2 } from '../components/icons'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCatalogResource } from '../catalog/useCatalogResource'
import CartCheckout from '../checkout/CartCheckout'
import { useCartSummary } from './CartContext'
import type { Cart as CartData } from './types'
import { brl, issueLabels } from './types'
import '../pages/Consultas/Consultas.css'

function CartBody({ initial, reload }: { initial: CartData; reload: () => void }) {
  const { request } = useAuth()
  const { syncCart } = useCartSummary()
  const [cart, setCart] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function remove(productId: string) {
    setPending(true)
    setError('')
    setMessage('')
    try {
      const updated = await request<CartData>('/cart/items/' + productId + '?expectedRevision=' + cart.revision, { method: 'DELETE' })
      setCart(updated)
      syncCart(updated)
      setMessage('Produto removido do carrinho.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover o produto.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className="search-controls" style={{ marginTop: 18 }}>
        <button className="consultas__secondary-btn" type="button" disabled={pending} onClick={reload}>
          <RefreshCw size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
          <span>Atualizar valores</span>
        </button>
      </div>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error} Atualize os valores antes de tentar novamente.</p>}

      {cart.items.length === 0 && (
        <div className="search-empty">
          <p className="search-empty__title">Seu carrinho está vazio.</p>
          <p className="search-empty__hint">
            Consulte o catálogo analítico para explorar as prévias técnicas e selecionar metodologias.
          </p>
          <div className="search-empty__actions">
            <Link to="/consultas">Pesquisar metodologias</Link>
          </div>
        </div>
      )}

      {cart.items.map(item => (
        <article className="search-card" key={item.productId} aria-label={item.title}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>{item.title}</h2>
          <p style={{ margin: '4px 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Quantidade: 1 · Versão adicionada: {item.observedVersionLabel}
            {item.currentVersionLabel && ' · Versão atual: ' + item.currentVersionLabel}
          </p>
          <p style={{ margin: '4px 0', fontSize: '0.92rem' }}>Valor na inclusão: {brl(item.observedAmountCentavos)}</p>
          <p style={{ margin: '4px 0', fontWeight: 650, fontSize: '0.96rem' }}>
            Preço atual: {item.offer.amountCentavos ? brl(item.offer.amountCentavos) : 'Sem preço disponível'}
          </p>
          {item.issues.length > 0 && (
            <ul aria-label="Alterações do item">
              {item.issues.map(issue => <li key={issue}>{issueLabels[issue]}</li>)}
            </ul>
          )}
          <div className="search-controls" style={{ marginTop: 14 }}>
            {item.offer.reason !== 'CONTENT_UNAVAILABLE' && (
              <Link to={'/metodologias/' + item.methodologyId}>Ver detalhes</Link>
            )}
            <button
              className="consultas__secondary-btn"
              type="button"
              disabled={pending}
              onClick={() => { void remove(item.productId) }}
            >
              <Trash2 size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
              <span>Remover {item.title}</span>
            </button>
          </div>
        </article>
      ))}

      <section className="search-card" aria-label="Resumo do carrinho">
        <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>Total atual dos itens disponíveis</h2>
        <p style={{ margin: '6px 0', fontSize: '1.45rem' }}><strong>{brl(cart.totalCentavos)}</strong></p>
        {cart.unavailableCount > 0 && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {cart.unavailableCount} {cart.unavailableCount === 1 ? 'item indisponível excluído' : 'itens indisponíveis excluídos'} do total, sem remoção do carrinho.
          </p>
        )}
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
          Preços, versões e disponibilidade são revalidados automaticamente na revisão do pedido.
        </p>
        <CartCheckout cart={cart} reload={reload} blocked={pending} />
      </section>
    </>
  )
}

export default function Cart() {
  const { request } = useAuth()
  const { syncCart } = useCartSummary()
  const load = useCallback(async () => {
    const data = await request<CartData>('/cart')
    syncCart(data)
    return data
  }, [request, syncCart])
  const { result, retry } = useCatalogResource(load)

  return (
    <main className="consultas">
      <div className="consultas__container">
        <header className="consultas__heading">
          <p className="consultas__eyebrow">SELEÇÃO DE PRODUTOS DIGITAIS</p>
          <h1>Meu carrinho</h1>
          <p>Confira os guias técnicos selecionados e avance para a revisão do pedido.</p>
        </header>
        {result.status === 'loading' && <p role="status">Carregando carrinho…</p>}
        {result.status === 'error' && (
          <div className="search-empty" role="alert">
            <p>{result.error instanceof Error ? result.error.message : 'Não foi possível carregar o carrinho.'}</p>
            <div className="search-empty__actions">
              <button type="button" onClick={retry}>Tentar novamente</button>
            </div>
          </div>
        )}
        {result.status === 'ready' && (
          <CartBody
            key={result.data.revision + ':' + result.data.items.length}
            initial={result.data}
            reload={retry}
          />
        )}
      </div>
    </main>
  )
}
