import { useState } from 'react'
import { CheckCircle2, ShoppingCart } from '../components/icons'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Preview } from '../catalog/types'
import { useCartSummary } from './CartContext'
import type { Cart } from './types'
import { brl } from './types'

export default function OfferSection({ preview, compact = false }: { preview: Preview; compact?: boolean }) {
  const { request } = useAuth()
  const { syncCart } = useCartSummary()
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const offer = preview.offer
  const isPendingReference =
    offer === null &&
    preview.references.length === 1 &&
    preview.references[0]?.sourceType === 'REFERENCE'

  async function add() {
    if (!preview.purchasable || !offer?.available || !offer.priceId) return
    setBusy(true)
    setError('')
    try {
      const cart = await request<Cart>('/cart')
      const updated = await request<Cart>('/cart/items/' + offer.productId, {
        method: 'PUT',
        body: {
          expectedRevision: cart.revision,
          offerRevision: offer.revision,
          priceId: offer.priceId,
          versionId: preview.versionId,
        },
      })
      syncCart(updated)
      setAdded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar o produto.')
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <div className="search-card__offer" aria-label="Oferta da metodologia">
        {preview.owned ? (
          <Link className="search-card__library-link" to={'/biblioteca/' + preview.id}>
            Na minha biblioteca
          </Link>
        ) : preview.purchasable && offer?.available && offer.amountCentavos ? (
          added ? (
            <span className="search-card__added" role="status">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>Produto no carrinho.</span>{' '}
              <Link to="/carrinho">Ver carrinho</Link>
            </span>
          ) : (
            <button
              className="search-card__buy-btn"
              type="button"
              disabled={busy}
              onClick={() => { void add() }}
            >
              <ShoppingCart size={15} aria-hidden="true" />
              <span>{busy ? 'Adicionando…' : 'Adicionar ao carrinho'}</span>
            </button>
          )
        ) : isPendingReference ? (
          <span className="search-card__status-note">
            Referência catalogada — produto autoral pendente
          </span>
        ) : (
          <span className="search-card__status-note">
            Oferta comercial ainda não disponível.
          </span>
        )}
        {error && (
          <div className="search-card__offer-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>Atualizar página</button>{' '}
            <Link to="/carrinho">Ver carrinho</Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="offer-box" aria-label="Oferta da metodologia">
      <div className="offer-box__header">
        <span className="offer-box__format">Guia Técnico Digital · Wiki-Chem</span>
        <span className="offer-box__edition">Versão {preview.versionLabel}</span>
      </div>

      {offer?.amountCentavos && (
        <div className="offer-box__price-block">
          <span className="offer-box__price-label">Acesso digital individual</span>
          <strong className="offer-box__price">{brl(offer.amountCentavos)}</strong>
          {!offer.available && <span className="offer-box__unavailable-tag">Oferta indisponível</span>}
        </div>
      )}

      {preview.owned ? (
        <div className="offer-box__owned">
          <p>Disponível no seu acervo digital autorizado.</p>
          <Link className="offer-box__library-btn" to={'/biblioteca/' + preview.id}>
            Na minha biblioteca
          </Link>
        </div>
      ) : preview.purchasable && offer?.available && offer.amountCentavos ? (
        <>
          {added ? (
            <div className="offer-box__added" role="status">
              <p>Produto no carrinho.</p>
              <Link className="offer-box__cart-btn" to="/carrinho">Ver carrinho</Link>
            </div>
          ) : (
            <button
              className="offer-box__buy-btn"
              type="button"
              disabled={busy}
              onClick={() => { void add() }}
            >
              <ShoppingCart size={17} aria-hidden="true" />
              <span>{busy ? 'Adicionando…' : 'Adicionar ao carrinho'}</span>
            </button>
          )}
          <p className="offer-box__note">
            Conteúdo técnico completo liberado na sua biblioteca digital após a confirmação do pedido.
          </p>
        </>
      ) : isPendingReference ? (
        <p className="offer-box__pending">
          Referência técnica catalogada — guia interpretativo autoral em preparação editorial, sem comercialização ativa.
        </p>
      ) : (
        <p className="offer-box__unavailable">Oferta comercial ainda não disponível.</p>
      )}

      {error && (
        <div className="offer-box__error" role="alert">
          <p>{error}</p>
          <div className="offer-box__error-actions">
            <button type="button" onClick={() => window.location.reload()}>Atualizar página</button>
            <Link to="/carrinho">Ver carrinho</Link>
          </div>
        </div>
      )}
    </section>
  )
}
