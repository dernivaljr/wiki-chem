import { describe, expect, it } from 'vitest'
import { confirmationInput, creationInput, idempotencyKey } from '../../src/modules/checkout/checkout.contracts.js'
import { requestHash } from '../../src/modules/checkout/checkout.repository.js'
describe('contratos de aquisição demonstrativa', () => {
  it('exige revisão e confirmação explícita, sem valores ou proprietário fornecidos', () => {
    expect(creationInput.safeParse({ cartRevision: 1 }).success).toBe(true)
    for (const body of [{}, { cartRevision: 0 }, { cartRevision: 1, userId: '1' }, { cartRevision: 1, totalCentavos: '1' }]) expect(creationInput.safeParse(body).success).toBe(false)
    for (const body of [{}, { demoAcknowledged: false }, { demoAcknowledged: true, amountCentavos: '1' }]) expect(confirmationInput.safeParse(body).success).toBe(false)
    expect(confirmationInput.parse({ demoAcknowledged: true })).toEqual({ demoAcknowledged: true })
  })
  it('normaliza chave UUID e rejeita chaves malformadas/ambíguas', () => {
    const key = '90AEBA0B-29DE-4F9C-9367-4AFB24D5FC00'
    expect(idempotencyKey.parse(key)).toBe(key.toLowerCase())
    for (const value of ['', 'a'.repeat(1000), 'not-a-key', [key, key]]) expect(idempotencyKey.safeParse(value).success).toBe(false)
  })
  it('hash canônico distingue operação, alvo e revisão', () => {
    const first = requestHash('CHECKOUT_SIMULATION', '/checkout/simulations', { cartRevision: 1 })
    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(first).toBe(requestHash('CHECKOUT_SIMULATION', '/checkout/simulations', { cartRevision: 1 }))
    expect(first).not.toBe(requestHash('CHECKOUT_SIMULATION', '/checkout/simulations', { cartRevision: 2 }))
    expect(requestHash('CONFIRM_SIMULATION', '1', { demoAcknowledged: true })).not.toBe(requestHash('CONFIRM_SIMULATION', '2', { demoAcknowledged: true }))
  })
})
