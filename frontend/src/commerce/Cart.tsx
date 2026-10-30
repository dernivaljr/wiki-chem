import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCatalogResource } from '../catalog/useCatalogResource'
import type { Cart as CartData } from './types'
import { brl, issueLabels } from './types'
import '../pages/Consultas/Consultas.css'
function CartBody({ initial, reload }: { initial: CartData; reload: () => void }) {
  const { request } = useAuth()
  const [cart, setCart] = useState(initial), [pending, setPending] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  async function remove(productId: string) {
    setPending(true); setError(''); setMessage('')
    try {
      setCart(await request<CartData>('/cart/items/' + productId + '?expectedRevision=' + cart.revision, { method: 'DELETE' }))
      setMessage('Produto removido do carrinho.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível remover o produto.') }
    finally { setPending(false) }
  }
  return <>
    <button type="button" disabled={pending} onClick={reload}>Atualizar valores</button>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error} Atualize os valores antes de tentar novamente.</p>}
    {cart.items.length === 0 && <p>Seu carrinho está vazio. <Link to="/consultas">Pesquisar metodologias</Link></p>}
    {cart.items.map(item => <article className="search-card" key={item.productId} aria-label={item.title}><h2>{item.title}</h2>
      <p>Quantidade: 1 · Versão adicionada: {item.observedVersionLabel}{item.currentVersionLabel && ' · Versão atual: ' + item.currentVersionLabel}</p>
      <p>Valor na inclusão: {brl(item.observedAmountCentavos)}</p>
      <p>Preço atual: {item.offer.amountCentavos ? brl(item.offer.amountCentavos) : 'Sem preço disponível'}</p>
      {item.issues.length > 0 && <ul aria-label="Alterações do item">{item.issues.map(issue => <li key={issue}>{issueLabels[issue]}</li>)}</ul>}
      <div className="search-controls">{item.offer.reason !== 'CONTENT_UNAVAILABLE' && <Link to={'/metodologias/' + item.methodologyId}>Ver prévia atual</Link>}<button type="button" disabled={pending} onClick={() => { void remove(item.productId) }}>Remover {item.title}</button></div>
    </article>)}
    <section className="search-card" aria-label="Resumo do carrinho"><h2>Total atual dos itens disponíveis</h2><p><strong>{brl(cart.totalCentavos)}</strong></p>
      <p>{cart.unavailableCount} {cart.unavailableCount === 1 ? 'item indisponível excluído' : 'itens indisponíveis excluídos'} do total, sem remoção do carrinho.</p>
      <p>Valores e disponibilidade serão revalidados. Checkout e confirmação de demonstração estarão disponíveis em um próximo incremento.</p>
    </section>
  </>
}
export default function Cart() {
  const { request } = useAuth()
  const load = useCallback(() => request<CartData>('/cart'), [request])
  const { result, retry } = useCatalogResource(load)
  return <main className="consultas"><div className="consultas__container"><h1>Meu carrinho</h1><p>Carrinho persistente de metodologias digitais. Nenhuma compra é realizada nesta etapa.</p>
    {result.status === 'loading' && <p role="status">Carregando carrinho…</p>}
    {result.status === 'error' && <div role="alert"><p>{result.error instanceof Error ? result.error.message : 'Não foi possível carregar o carrinho.'}</p><button type="button" onClick={retry}>Tentar novamente</button></div>}
    {result.status === 'ready' && <CartBody initial={result.data} reload={retry} />}
  </div></main>
}
