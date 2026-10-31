import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthValue } from '../auth/AuthContext'
import { ApiError } from '../auth/api'
import { safeReturnTo } from '../auth/returnTo'
import { demoOrder } from '../test/checkout-fixtures'
import { begin, confirmIntent, readConfirmIntent, readIntent, reconcileIntent } from './intent'

beforeEach(() => localStorage.clear())

describe('intenção durável de checkout e reconciliação de estados terminais', () => {
  it('preserva chave e revisão depois de resposta perdida, sem preço fornecido pelo cliente', async () => {
    const call = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(demoOrder())
    const request = call as AuthValue['request']
    await expect(begin(request, '10', 2)).rejects.toThrow('offline')
    const first = readIntent('10')!
    expect(first.cartRevision).toBe(2)
    await begin(request, '10', 99)
    expect(call.mock.calls[1]).toEqual(call.mock.calls[0])
    expect(call.mock.calls[0]![1]).toEqual({ method: 'POST', idempotencyKey: first.key, body: { cartRevision: 2 } })
    expect(readIntent('10')!.orderId).toBe('50')
  })

  it('isola usuários, preserva modalidade na confirmação interrompida, rejeita troca indevida e limpa intenção após conclusão', async () => {
    const call = vi.fn().mockResolvedValue(demoOrder())
    const request = call as AuthValue['request']
    await begin(request, '10', 2)
    await begin(request, '11', 2)
    expect(readIntent('10')!.key).not.toBe(readIntent('11')!.key)

    call.mockRejectedValueOnce(new Error('offline'))
    await expect(confirmIntent(request, '10', '50', 'CREDIT_CARD')).rejects.toThrow('offline')
    expect(readConfirmIntent('10', '50')?.paymentMethod).toBe('CREDIT_CARD')

    await expect(confirmIntent(request, '10', '50', 'BOLETO')).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })

    call.mockResolvedValueOnce(demoOrder('COMPLETED_SIMULATED', 'CREDIT_CARD'))
    const confirmed = await confirmIntent(request, '10', '50', 'CREDIT_CARD')
    expect(confirmed.status).toBe('COMPLETED_SIMULATED')
    expect(call.mock.calls[3]).toEqual(call.mock.calls[2])
    expect(call.mock.calls[3]![1].body).toEqual({ demoAcknowledged: true, paymentMethod: 'CREDIT_CARD' })
    expect(readIntent('10')).toBeNull()
    expect(readConfirmIntent('10', '50')).toBeNull()
    expect(readIntent('11')).not.toBeNull()
  })

  it.each(['COMPLETED_SIMULATED', 'CANCELLED', 'EXPIRED'] as const)(
    'reconcileIntent libera intenção anterior cujo pedido já está em estado terminal %s',
    async terminalStatus => {
      localStorage.setItem(
        'wikichem-demo-create:10',
        JSON.stringify({ key: '90aeba0b-29de-4f9c-9367-4afb24d5fc00', cartRevision: 2, orderId: '50' }),
      )
      const call = vi.fn().mockResolvedValue(demoOrder(terminalStatus))
      const reconciled = await reconcileIntent(call as AuthValue['request'], '10', 3)
      expect(reconciled).toBeNull()
      expect(readIntent('10')).toBeNull()
    },
  )

  it('begin descarta pedido terminal retornado em replay e gera nova chave para o carrinho atual', async () => {
    const oldKey = '90aeba0b-29de-4f9c-9367-4afb24d5fc00'
    localStorage.setItem('wikichem-demo-create:10', JSON.stringify({ key: oldKey, cartRevision: 2 }))
    const call = vi
      .fn()
      .mockResolvedValueOnce(demoOrder('COMPLETED_SIMULATED', 'PIX'))
      .mockResolvedValueOnce({ ...demoOrder('PENDING_CONFIRMATION'), id: '51', cartRevisionSnapshot: 4 })
    const order = await begin(call as AuthValue['request'], '10', 4)
    expect(order.id).toBe('51')
    expect(call).toHaveBeenCalledTimes(2)
    expect(call.mock.calls[1]![1].idempotencyKey).not.toBe(oldKey)
    expect(call.mock.calls[1]![1].body).toEqual({ cartRevision: 4 })
    expect(readIntent('10')!.orderId).toBe('51')
  })

  it('limpa chave rejeitada deterministicamente para não prender próxima compra', async () => {
    const call = vi.fn().mockRejectedValueOnce(new ApiError(409, 'CART_CHANGED', 'O carrinho mudou.'))
    await expect(begin(call as AuthValue['request'], '10', 2)).rejects.toThrow('O carrinho mudou')
    expect(readIntent('10')).toBeNull()
  })

  it('bloqueia armazenamento corrompido sem enviar nova intenção', async () => {
    localStorage.setItem('wikichem-demo-create:10', '{invalid')
    const call = vi.fn()
    await expect(begin(call as AuthValue['request'], '10', 2)).rejects.toThrow('preservar a intenção')
    expect(call).not.toHaveBeenCalled()
  })

  it.each(['/pedidos', '/pedidos/50', '/checkout/50'])('aceita retorno interno %s', path => expect(safeReturnTo(path)).toBe(path))
  it.each(['//evil.test/checkout/50', '/checkout/../admin', '/pedidos/50\\evil', '/checkout/0'])('rejeita retorno inseguro %s', path => expect(safeReturnTo(path)).toBe('/consultas'))
})
