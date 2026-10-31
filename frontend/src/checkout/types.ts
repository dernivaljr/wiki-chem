export type OrderStatus = 'PENDING_CONFIRMATION' | 'COMPLETED_SIMULATED' | 'CANCELLED' | 'EXPIRED'
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO'
export const paymentMethods: readonly PaymentMethod[] = ['PIX', 'CREDIT_CARD', 'BOLETO']

export interface OrderSummary {
  id: string
  status: OrderStatus
  mode: 'SIMULATED'
  currency: 'BRL'
  paymentMethod: PaymentMethod | null
  totalCentavos: string
  cartRevisionSnapshot: number
  createdAt: string
  expiresAt: string
  completedAt: string | null
  cancelledAt: string | null
  itemCount: number
  serverTime: string
}

export interface OrderItem {
  id: string
  productId: string
  methodologyId: string
  methodologyVersionId: string
  priceId: string
  titleSnapshot: string
  versionLabelSnapshot: string
  unitAmountCentavos: string
  lineTotalCentavos: string
  quantity: 1
}

export interface OrderDetail extends OrderSummary {
  items: OrderItem[]
}

export const statusLabels: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Aguardando confirmação',
  COMPLETED_SIMULATED: 'Pedido concluído',
  CANCELLED: 'Revisão cancelada',
  EXPIRED: 'Prazo encerrado',
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de crédito',
  BOLETO: 'Boleto bancário',
}

export const paymentMethodDescriptions: Record<PaymentMethod, string> = {
  PIX: 'Aprovação instantânea simulada · Sem QR Code ou chave pagável',
  CREDIT_CARD: 'Autorização imediata simulada · Nenhum dado de cartão ou CPF solicitado',
  BOLETO: 'Compensação bancária simulada · Sem código de barras pagável',
}

export const paymentCompletionMessages: Record<PaymentMethod, string> = {
  PIX: 'Pagamento simulado via PIX aprovado instantaneamente. Os conteúdos adquiridos já estão liberados na sua biblioteca digital.',
  CREDIT_CARD: 'Pagamento simulado via Cartão de crédito autorizado. Os conteúdos adquiridos já estão liberados na sua biblioteca digital.',
  BOLETO: 'Quitação simulada via Boleto bancário compensada. Os conteúdos adquiridos já estão liberados na sua biblioteca digital.',
}
