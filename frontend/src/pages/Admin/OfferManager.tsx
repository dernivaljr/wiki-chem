import { useCallback, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useCatalogResource } from '../../catalog/useCatalogResource'
import type { Page } from '../../catalog/types'
import type { Price, Product } from '../../commerce/types'
import { brl } from '../../commerce/types'
import AdminField from './AdminField'
import AdminError from './AdminError'
function History({ productId, page, navigate }: { productId: string; page: number; navigate: (page: number) => void }) {
  const { request } = useAuth()
  const load = useCallback(() => request<Page<Price>>('/admin/products/' + productId + '/prices?page=' + page, { includeMeta: true }), [request, productId, page])
  const { result, retry } = useCatalogResource(load)
  return <section aria-label="Histórico de preços"><h3>Histórico imutável de preços</h3>
    {result.status === 'loading' && <p role="status">Carregando preços…</p>}
    {result.status === 'error' && <><AdminError error={result.error} /><button type="button" onClick={retry}>Recarregar histórico</button></>}
    {result.status === 'ready' && <>{result.data.data.length ? <ul>{result.data.data.map(price => <li key={price.id}>{brl(price.amountCentavos)} · {new Date(price.createdAt).toLocaleString('pt-BR')} · responsável {price.createdBy}</li>)}</ul> : <p>Nenhum preço cadastrado.</p>}
      <div className="admin-actions"><button disabled={page === 1} onClick={() => navigate(page - 1)}>Preços anteriores</button><span>Página {page}</span><button disabled={page * result.data.pageSize >= result.data.total} onClick={() => navigate(page + 1)}>Próximos preços</button></div>
    </>}
  </section>
}
function ProductEditor({ product, saved, reload }: { product: Product; saved: (product: Product) => void; reload: () => void }) {
  const { request } = useAuth()
  const [amount, setAmount] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [page, setPage] = useState(1)
  async function change(price: boolean) {
    setBusy(true); setError(null)
    try {
      const updated = await request<Product>('/admin/products/' + product.id + (price ? '/prices' : ''), { method: price ? 'POST' : 'PATCH', body: price ? { expectedRevision: product.revision, amountCentavos: amount, currency: 'BRL' } : { expectedRevision: product.revision, active: !product.active } })
      saved(updated)
    } catch (error) { setError(error) } finally { setBusy(false) }
  }
  return <><p>Produto {product.id} · Revisão {product.revision} · {product.active ? 'Oferta ativa' : 'Oferta inativa'}</p>
    <p>Preço corrente: {product.offer.amountCentavos ? brl(product.offer.amountCentavos) : 'Sem preço'}</p>
    {product.offer.reason === 'CONTENT_UNAVAILABLE' && <p>Conteúdo editorial indisponível para ativação da oferta.</p>}
    <AdminError error={error} />
    <div className="admin-actions"><button type="button" disabled={busy || (!product.active && (!product.offer.priceId || product.offer.reason === 'CONTENT_UNAVAILABLE'))} onClick={() => { void change(false) }}>{product.active ? 'Desativar oferta' : 'Ativar oferta'}</button><button type="button" disabled={busy} onClick={reload}>Recarregar oferta</button></div>
    <form className="admin-form" onSubmit={event => { event.preventDefault(); void change(true) }}>
      <AdminField label="Novo preço em centavos (BRL)"><input value={amount} onChange={event => setAmount(event.target.value)} required pattern="[1-9][0-9]*" maxLength={19} inputMode="numeric" aria-describedby="price-help" /></AdminField>
      <p id="price-help">Informe centavos inteiros, sem separadores. Cadastrar um novo preço preserva os valores anteriores.</p>
      <button type="submit" disabled={busy}>Cadastrar novo preço</button>
    </form>
    <History key={page} productId={product.id} page={page} navigate={setPage} />
  </>
}
function LoadedOffer({ initial, methodologyId, reload }: { initial: Product | null; methodologyId: string; reload: () => void }) {
  const { request } = useAuth()
  const [product, setProduct] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [message, setMessage] = useState('')
  async function create() {
    setBusy(true); setError(null)
    try { setProduct(await request<Product>('/admin/products', { method: 'POST', body: { methodologyId } })); setMessage('Produto criado inativo. Cadastre preço antes de ativar.') }
    catch (error) { setError(error) } finally { setBusy(false) }
  }
  return <><AdminError error={error} />{message && <p role="status">{message}</p>}
    {product ? <ProductEditor key={product.revision} product={product} reload={reload} saved={updated => { setProduct(updated); setMessage('Oferta atualizada. Histórico preservado.') }} /> : <><p>Esta metodologia ainda não possui produto. A criação não publica nem ativa a oferta.</p><button type="button" disabled={busy} onClick={() => { void create() }}>Criar produto inativo</button></>}
  </>
}
function OfferManager({ methodologyId }: { methodologyId: string }) {
  const { request } = useAuth()
  const load = useCallback(() => request<Page<Product>>('/admin/products?methodologyId=' + methodologyId, { includeMeta: true }), [request, methodologyId])
  const { result, retry } = useCatalogResource(load)
  return <>{result.status === 'loading' && <p role="status">Carregando oferta…</p>}{result.status === 'error' && <><AdminError error={result.error} /><button type="button" onClick={retry}>Recarregar oferta</button></>}
    {result.status === 'ready' && <LoadedOffer initial={result.data.data[0] ?? null} methodologyId={methodologyId} reload={retry} />}
  </>
}
export default function OfferSection({ methodologyId }: { methodologyId: string }) {
  const [open, setOpen] = useState(false)
  return <section className="admin-card" aria-label="Administração comercial"><h2>Oferta e preços</h2><p>Ativação exige conteúdo publicado, revisado e autorizado, além de preço vigente. Checkout e pedidos não estão implementados.</p>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Gerenciar oferta e preços</button>
    {open && <OfferManager methodologyId={methodologyId} />}
  </section>
}
