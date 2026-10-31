import DemoBanner from '../checkout/DemoBanner'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Preview } from '../catalog/types'
import type { Cart } from './types'
import { brl } from './types'

export default function OfferSection({ preview }: { preview: Preview }) {
  const { request } = useAuth()
  const [busy, setBusy] = useState(false), [added, setAdded] = useState(false), [error, setError] = useState('')
  const offer = preview.offer
  const isInformativeReference = offer === null && preview.references.some(source => source.sourceType === 'REFERENCE')
  async function add() {
    if (!preview.purchasable || !offer?.available || !offer.priceId) return
    setBusy(true); setError('')
    try {
      const cart = await request<Cart>('/cart')
      await request<Cart>('/cart/items/' + offer.productId, { method: 'PUT', body: { expectedRevision: cart.revision, offerRevision: offer.revision, priceId: offer.priceId, versionId: preview.versionId } })
      setAdded(true)
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível adicionar o produto.') }
    finally { setBusy(false) }
  }
  return <section className="search-offer" aria-label="Oferta da metodologia">
    {(offer?.available || preview.owned) && <DemoBanner />}
    {offer?.amountCentavos && <p><strong>{brl(offer.amountCentavos)}</strong> · versão {preview.versionLabel}{!offer.available && ' · Oferta indisponível'}</p>}
    {preview.owned ? <p>Aquisição simulada já registrada. <Link to={'/biblioteca/' + preview.id}>Na minha biblioteca</Link></p> : preview.purchasable && offer?.available && offer.amountCentavos ? <>
      {added ? <p role="status">Produto no carrinho. <Link to="/carrinho">Ver carrinho</Link></p> : <button type="button" disabled={busy} onClick={() => { void add() }}>{busy ? 'Adicionando…' : 'Adicionar ao carrinho'}</button>}
      <p>O carrinho não reserva preço nem concede acesso ao procedimento.</p>
    </> : isInformativeReference ? <p className="search-offer__informative">Ficha técnica informativa de referência pública — sem oferta comercial de conteúdo de terceiros.</p> : <p>Oferta comercial ainda não disponível.</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Atualizar página</button> <Link to="/carrinho">Ver carrinho</Link></div>}
  </section>
}
