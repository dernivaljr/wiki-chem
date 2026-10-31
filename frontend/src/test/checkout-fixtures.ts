import type { OrderDetail, PaymentMethod } from '../checkout/types'
// Fixture sintética de contrato; não constitui conteúdo ou oferta de produção.
export function demoOrder(
  status: OrderDetail['status'] = 'PENDING_CONFIRMATION',
  paymentMethod: PaymentMethod | null = status === 'COMPLETED_SIMULATED' ? 'PIX' : null,
): OrderDetail {
  const now = Date.now()
  return {
    id: '50',
    status,
    mode: 'SIMULATED',
    currency: 'BRL',
    paymentMethod,
    totalCentavos: '1000',
    cartRevisionSnapshot: 2,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 900000).toISOString(),
    completedAt: status === 'COMPLETED_SIMULATED' ? new Date(now).toISOString() : null,
    cancelledAt: status === 'CANCELLED' ? new Date(now).toISOString() : null,
    itemCount: 1,
    serverTime: new Date(now).toISOString(),
    items: [
      {
        id: '60',
        productId: '1',
        methodologyId: '10',
        methodologyVersionId: '20',
        priceId: '2',
        titleSnapshot: 'DEMO original',
        versionLabelSnapshot: 'v1',
        unitAmountCentavos: '1000',
        lineTotalCentavos: '1000',
        quantity: 1,
      },
    ],
  }
}
