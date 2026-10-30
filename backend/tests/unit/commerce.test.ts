import { afterEach, describe, expect, it, vi } from 'vitest'
import { amountCentavos, cartAdd, priceInput, productPatch } from '../../src/modules/commerce/commerce.contracts.js'
import { demoPrices } from '../commerce-fixtures.js'
afterEach(() => vi.unstubAllEnvs())
describe('contratos de valores e carrinho', () => {
  it.each(['0', '-1', '1.50', '1,50', '01', '1e3', ' 1000', '9223372036854775808', 'NaN'])('rejeita centavos inválidos: %s', value => {
    expect(amountCentavos.safeParse(value).success).toBe(false)
  })
  it('preserva inteiros acima do limite seguro de Number', () => {
    expect(amountCentavos.parse('9223372036854775807')).toBe('9223372036854775807')
    expect(priceInput.safeParse({ expectedRevision: 1, amountCentavos: 1000, currency: 'BRL' }).success).toBe(false)
    expect(priceInput.safeParse({ expectedRevision: 1, amountCentavos: '1000', currency: 'USD' }).success).toBe(false)
  })
  it('não aceita quantidade, preço/total ou usuário fornecidos pelo carrinho', () => {
    const input = { expectedRevision: 1, offerRevision: 1, priceId: '1', versionId: '1' }
    expect(cartAdd.safeParse(input).success).toBe(true)
    for (const extra of [{ quantity: 2 }, { amountCentavos: '1' }, { totalCentavos: '1' }, { userId: '2' }]) expect(cartAdd.safeParse({ ...input, ...extra }).success).toBe(false)
    expect(productPatch.safeParse({ active: true }).success).toBe(false)
  })
  it('fixtures FX são sintéticas, somam 12000 e são bloqueadas em produção', () => {
    vi.stubEnv('NODE_ENV', 'test')
    expect(demoPrices().reduce((sum, value) => sum + BigInt(value), 0n)).toBe(12000n)
    expect(BigInt(demoPrices()[0]) + BigInt(demoPrices()[1])).toBe(2750n)
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => demoPrices()).toThrow('bloqueadas')
  })
})
