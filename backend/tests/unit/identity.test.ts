import { describe, expect, it } from 'vitest'
import { registerInput, profileInput } from '../../src/modules/identity/identity.contracts.js'
import { AccountAttempts, checkCsrf, csrfFor, hashPassword, hashToken, newToken, verifyPassword } from '../../src/modules/identity/security.js'
import { requireRole } from '../../src/modules/identity/identity.service.js'

describe('identidade e segurança', () => {
  it('normaliza e-mail e nome, preservando a senha exata', () => {
    expect(registerInput.parse({ displayName: '  Pessoa  ', email: ' Pessoa@Example.test ', password: ' Senha com espaços ' }))
      .toEqual({ displayName: 'Pessoa', email: 'pessoa@example.test', password: ' Senha com espaços ' })
  })
  it.each([
    { displayName: ' ', email: 'a@example.test', password: 'Uma-senha-valida-12' },
    { displayName: 'Nome', email: 'invalid', password: 'Uma-senha-valida-12' },
    { displayName: 'Nome', email: 'a@example.test', password: 'short' },
    { displayName: 'Nome', email: 'a@example.test', password: 'x'.repeat(129) },
    { displayName: 'Nome', email: 'a@example.test', password: 'Uma-senha-valida-12', role: 'ADMIN' },
  ])('rejeita dados inválidos ou privilégios injetados', input => { expect(registerInput.safeParse(input).success).toBe(false) })
  it('perfil não admite identidade, e-mail ou papel', () => {
    expect(profileInput.safeParse({ displayName: 'Nome', id: '2' }).success).toBe(false)
    expect(profileInput.safeParse({ displayName: 'Nome', email: 'other@example.test' }).success).toBe(false)
  })
  it('usa Argon2id com parâmetros mínimos e salt individual, sem truncar', async () => {
    const password = 'Senha original longa 123'
    const first = await hashPassword(password), second = await hashPassword(password)
    expect(first).toMatch(/^\$argon2id\$v=19\$/)
    expect(first.split('$')[3]?.split(',').sort()).toEqual(['m=19456', 'p=1', 't=2'])
    expect(first).not.toBe(second)
    expect(await verifyPassword(first, password)).toBe(true)
    expect(await verifyPassword(first, password + ' ')).toBe(false)
    expect(await verifyPassword('invalid-hash', password)).toBe(false)
  })
  it('limita trabalho concorrente de hash sem enfraquecer parâmetros', async () => {
    const work = Array.from({ length: 4 }, () => hashPassword('Senha de teste longa'))
    await expect(hashPassword('Outra senha longa')).rejects.toMatchObject({ code: 'IDENTITY_BUSY' })
    await Promise.all(work)
  })
  it('gera tokens independentes, hash e CSRF vinculados à sessão', () => {
    const token = newToken(), another = newToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/); expect(token).not.toBe(another)
    expect(hashToken(token)).not.toBe(token)
    expect(() => checkCsrf(token, csrfFor(token))).not.toThrow()
    expect(() => checkCsrf(token, csrfFor(another))).toThrow('validar')
    expect(() => checkCsrf(token, undefined)).toThrow()
    expect(() => checkCsrf(token, 'x'.repeat(64))).toThrow()
  })
  it('limita tentativas por conta e libera após a janela', () => {
    let now = 0
    const attempts = new AccountAttempts(2, () => now)
    attempts.check('account@example.test'); attempts.check('account@example.test')
    expect(() => attempts.check('account@example.test')).toThrow('tentativas')
    expect(() => attempts.check('other@example.test')).not.toThrow()
    now = 60001
    expect(() => attempts.check('account@example.test')).not.toThrow()
  })
  it('nega papel administrativo ao cliente', () => {
    const customer = { id: '1', email: 'a@example.test', displayName: 'Nome', role: 'CUSTOMER', status: 'ACTIVE' } as const
    expect(() => requireRole(customer, 'ADMIN')).toThrow('permitida')
    expect(() => requireRole({ ...customer, role: 'ADMIN' }, 'ADMIN')).not.toThrow()
  })
})
