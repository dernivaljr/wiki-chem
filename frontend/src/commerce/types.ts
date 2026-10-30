export interface Offer { productId: string; revision: number; active: boolean; priceId: string | null; amountCentavos: string | null; currency: 'BRL'; available: boolean; reason: 'INACTIVE' | 'NO_PRICE' | 'CONTENT_UNAVAILABLE' | null }
export interface Product { id: string; methodologyId: string; slug: string; title: string; active: boolean; revision: number; offer: Offer }
export interface Price { id: string; productId: string; amountCentavos: string; currency: 'BRL'; createdBy: string; createdAt: string }
export interface CartItem {
  owned: boolean;
  productId: string; methodologyId: string; title: string; quantity: 1;
  observedPriceId: string; observedAmountCentavos: string; observedVersionId: string; observedVersionLabel: string;
  currentVersionId: string | null; currentVersionLabel: string | null; offer: Offer;
  issues: ('PRICE_CHANGED' | 'VERSION_CHANGED' | 'OFFER_CHANGED' | 'UNAVAILABLE' | 'ALREADY_OWNED')[];
}
export interface Cart { revision: number; items: CartItem[]; currency: 'BRL'; totalCentavos: string; unavailableCount: number }
// Sem converter centavos para Number, inclusive acima de Number.MAX_SAFE_INTEGER.
export function brl(amount: string) {
  const value = BigInt(amount)
  return 'R$ ' + new Intl.NumberFormat('pt-BR').format(value / 100n) + ',' + (value % 100n).toString().padStart(2, '0')
}
export const issueLabels = { ALREADY_OWNED: 'Aquisição simulada já registrada. Este item não será adquirido novamente.', PRICE_CHANGED: 'O preço mudou desde a inclusão.', VERSION_CHANGED: 'Há uma nova versão publicada.', OFFER_CHANGED: 'A oferta foi alterada desde a inclusão.', UNAVAILABLE: 'Item indisponível; mantido no carrinho e excluído do total disponível.' }
