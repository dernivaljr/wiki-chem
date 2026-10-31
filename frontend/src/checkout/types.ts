export type OrderStatus = 'PENDING_CONFIRMATION' | 'COMPLETED_SIMULATED' | 'CANCELLED' | 'EXPIRED'
export interface OrderSummary {
  id: string; status: OrderStatus; mode: 'SIMULATED'; currency: 'BRL'; totalCentavos: string; cartRevisionSnapshot: number;
  createdAt: string; expiresAt: string; completedAt: string | null; cancelledAt: string | null; itemCount: number; serverTime: string;
}
export interface OrderItem { id: string; productId: string; methodologyId: string; methodologyVersionId: string; priceId: string; titleSnapshot: string; versionLabelSnapshot: string; unitAmountCentavos: string; lineTotalCentavos: string; quantity: 1 }
export interface OrderDetail extends OrderSummary { items: OrderItem[] }
export const statusLabels: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Aguardando confirmação',
  COMPLETED_SIMULATED: 'Pedido concluído',
  CANCELLED: 'Revisão cancelada',
  EXPIRED: 'Prazo encerrado',
}
