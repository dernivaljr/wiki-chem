import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthValue } from '../auth/AuthContext'
import { safeReturnTo } from '../auth/returnTo'
import { demoOrder } from '../test/checkout-fixtures'
import { begin, confirmIntent, readIntent } from './intent'
beforeEach(() => localStorage.clear())
describe('intenção durável de demonstração', () => {
  it('preserva chave e revisão depois de resposta perdida, sem preço fornecido pelo cliente', async () => {
    const call = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(demoOrder()), request = call as AuthValue['request']
    await expect(begin(request, '10', 2)).rejects.toThrow('offline')
    const first = readIntent('10')!
    expect(first.cartRevision).toBe(2)
    await begin(request, '10', 99)
    expect(call.mock.calls[1]).toEqual(call.mock.calls[0])
    expect(call.mock.calls[0]![1]).toEqual({ method: 'POST', idempotencyKey: first.key, body: { cartRevision: 2 } })
    expect(readIntent('10')!.orderId).toBe('50')
  })
  it('isola usuários e mantém a chave de confirmação após falha', async () => {
    const call = vi.fn().mockResolvedValue(demoOrder()), request = call as AuthValue['request']
    await begin(request, '10', 2); await begin(request, '11', 2)
    expect(readIntent('10')!.key).not.toBe(readIntent('11')!.key)
    call.mockRejectedValueOnce(new Error('offline'))
    await expect(confirmIntent(request, '10', '50')).rejects.toThrow('offline')
    await confirmIntent(request, '10', '50')
    expect(call.mock.calls[3]).toEqual(call.mock.calls[2])
    expect(call.mock.calls[3]![1].body).toEqual({ demoAcknowledged: true })
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
