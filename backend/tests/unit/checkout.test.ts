import { describe, expect, it } from 'vitest'
import { confirmationInput, creationInput, idempotencyKey, paymentMethod } from '../../src/modules/checkout/checkout.contracts.js'
import { requestHash } from '../../src/modules/checkout/checkout.repository.js'

describe('contratos de aquisição demonstrativa e simulação de pagamento', () => {
  it('exige revisão, modalidade de pagamento válida e confirmação explícita, sem dados financeiros reais ou proprietário fornecidos', () => {
    expect(creationInput.safeParse({ cartRevision: 1 }).success).toBe(true)
    for (const body of [{}, { cartRevision: 0 }, { cartRevision: 1, userId: '1' }, { cartRevision: 1, totalCentavos: '1' }]) {
      expect(creationInput.safeParse(body).success).toBe(false)
    }

    for (const method of ['PIX', 'CREDIT_CARD', 'BOLETO'] as const) {
      expect(paymentMethod.parse(method)).toBe(method)
      expect(confirmationInput.parse({ demoAcknowledged: true, paymentMethod: method })).toEqual({
        demoAcknowledged: true,
        paymentMethod: method,
      })
    }

    for (const body of [
      {},
      { demoAcknowledged: true },
      { demoAcknowledged: false, paymentMethod: 'PIX' },
      { demoAcknowledged: true, paymentMethod: 'CASH' },
      { demoAcknowledged: true, paymentMethod: '' },
      { demoAcknowledged: true, paymentMethod: 'PIX', amountCentavos: '1' },
      { demoAcknowledged: true, paymentMethod: 'CREDIT_CARD', cardNumber: '4111111111111111' },
      { demoAcknowledged: true, paymentMethod: 'BOLETO', cpf: '00000000000' },
    ]) {
      expect(confirmationInput.safeParse(body).success).toBe(false)
    }
  })

  it('normaliza chave UUID e rejeita chaves malformadas/ambíguas', () => {
    const key = '90AEBA0B-29DE-4F9C-9367-4AFB24D5FC00'
    expect(idempotencyKey.parse(key)).toBe(key.toLowerCase())
    for (const value of ['', 'a'.repeat(1000), 'not-a-key', [key, key]]) {
      expect(idempotencyKey.safeParse(value).success).toBe(false)
    }
  })

  it('hash canônico distingue operação, alvo, revisão e modalidade de pagamento', () => {
    const first = requestHash('CHECKOUT_SIMULATION', '/checkout/simulations', { cartRevision: 1 })
    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(first).toBe(requestHash('CHECKOUT_SIMULATION', '/checkout/simulations', { cartRevision: 1 }))
    expect(first).not.toBe(requestHash('CHECKOUT_SIMULATION', '/checkout/simulations', { cartRevision: 2 }))
    expect(requestHash('CONFIRM_SIMULATION', '1', { demoAcknowledged: true, paymentMethod: 'PIX' })).not.toBe(
      requestHash('CONFIRM_SIMULATION', '2', { demoAcknowledged: true, paymentMethod: 'PIX' }),
    )
    expect(requestHash('CONFIRM_SIMULATION', '1', { demoAcknowledged: true, paymentMethod: 'PIX' })).not.toBe(
      requestHash('CONFIRM_SIMULATION', '1', { demoAcknowledged: true, paymentMethod: 'CREDIT_CARD' }),
    )
    expect(requestHash('CONFIRM_SIMULATION', '1', { demoAcknowledged: true, paymentMethod: 'CREDIT_CARD' })).not.toBe(
      requestHash('CONFIRM_SIMULATION', '1', { demoAcknowledged: true, paymentMethod: 'BOLETO' }),
    )
  })
})
