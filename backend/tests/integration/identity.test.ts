import { randomUUID } from 'node:crypto'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import type { RowDataPacket } from 'mysql2/promise'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'
import { migrateTestDatabase } from '../test-database.js'
import { createIdentityRepository } from '../../src/modules/identity/identity.repository.js'
import { provisionInitialAdmin } from '../../src/modules/identity/admin-bootstrap.js'
import { sessionCookieName } from '../../src/modules/identity/identity.routes.js'
import { hashToken } from '../../src/modules/identity/security.js'

const env = loadConfig(process.env)
if (env.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(env.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') throw new Error('Identidade exige banco exclusivo de testes.')
const config = { ...env, AUTH_RATE_LIMIT_MAX: 100, LOG_LEVEL: 'silent' as const }
const pool = createDatabasePool(config)
const repository = createIdentityRepository(pool)
const prefix = 'identity-' + randomUUID()
let serial = 0, now = Date.now()
let app: FastifyInstance
const extra: FastifyInstance[] = []
const password = 'Senha isolada de teste 123!'
const address = () => prefix + '-' + (++serial) + '@example.test'
const headers = { origin: config.APP_ORIGIN }
const cookie = (response: LightMyRequestResponse) => {
  const value = response.headers['set-cookie']
  const first = Array.isArray(value) ? value[0] : value
  if (!first) throw new Error('Cookie ausente.')
  return first.split(';')[0]!
}
const token = (value: string) => value.slice(value.indexOf('=') + 1)
async function sql(query: string, values: string[] = []) { return (await pool.execute<RowDataPacket[]>(query, values))[0] }
async function register(email = address(), name = 'Pessoa de teste') {
  return app.inject({ method: 'POST', url: '/api/v1/auth/register', headers, payload: { displayName: name, email, password } })
}
async function credentials() {
  const email = address()
  expect((await register(email)).statusCode).toBe(201)
  const response = await login(email)
  expect(response.statusCode).toBe(200)
  return { email, cookie: cookie(response), csrf: response.json().data.csrfToken as string, user: response.json().data.user }
}
async function login(email: string, previous?: string, api = app) {
  return api.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { ...headers, ...(previous ? { cookie: previous } : {}) }, payload: { email, password } })
}
const session = (value: string, api = app) => api.inject({ url: '/api/v1/auth/session', headers: { cookie: value } })

beforeAll(async () => {
  await migrateTestDatabase(config)
  app = buildApp(config, { checkDatabase: async () => {}, identity: repository, now: () => now })
  await app.ready()
})
beforeEach(() => { now = Date.now() })
afterAll(async () => {
  await Promise.all([app, ...extra].filter(Boolean).map(api => api.close()))
  await pool.execute('DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE email_normalized LIKE ?)', [prefix + '%'])
  await pool.execute('DELETE FROM users WHERE email_normalized LIKE ?', [prefix + '%'])
  await pool.end()
})

describe('identidade persistente com MySQL real', () => {
  it('cadastra CUSTOMER com hash sem sessão ou credencial na resposta', async () => {
    const email = address(), response = await register(email)
    expect(response.statusCode).toBe(201)
    expect(response.json().data).toMatchObject({ email, role: 'CUSTOMER', status: 'ACTIVE' })
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(response.body).not.toMatch(/password|hash|token|Senha isolada/)
    const [row] = await sql('SELECT password_hash, role FROM users WHERE email_normalized = ?', [email])
    expect(row?.password_hash).toMatch(/^\$argon2id\$/)
    expect(row?.password_hash).not.toBe(password)
  })
  it.each([{ role: 'ADMIN' }, { status: 'ACTIVE' }, { id: '1' }, { emailVerified: true }])('rejeita campos privilegiados no cadastro', async injected => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers, payload: { displayName: 'Pessoa', email: address(), password, ...injected } })
    expect(response.statusCode).toBe(400)
  })
  it('normaliza e-mail e rejeita duplicidade', async () => {
    const email = address()
    expect((await register('  ' + email.toUpperCase() + '  ')).statusCode).toBe(201)
    expect((await register(email)).statusCode).toBe(409)
    expect(await sql('SELECT id FROM users WHERE email_normalized = ?', [email])).toHaveLength(1)
  })
  it('constraint resolve dois cadastros concorrentes sem duplicar', async () => {
    const email = address()
    const responses = await Promise.all([register(email), register(email)])
    expect(responses.map(response => response.statusCode).sort()).toEqual([201, 409])
    expect(await sql('SELECT id FROM users WHERE email_normalized = ?', [email])).toHaveLength(1)
  })
  it('credenciais inválidas e conta ausente retornam o mesmo erro', async () => {
    const identity = await credentials()
    const wrong = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers, payload: { email: identity.email, password: 'Senha incorreta de teste' } })
    const absent = await login(address())
    expect(wrong.statusCode).toBe(401); expect(absent.statusCode).toBe(401)
    expect(wrong.json().error.code).toBe('INVALID_CREDENTIALS')
    expect(wrong.json().error.message).toBe(absent.json().error.message)
    expect(wrong.headers['set-cookie']).toBeUndefined()
  })
  it('usa cookie HttpOnly/SameSite e armazena somente hash do token', async () => {
    const email = address(); await register(email)
    const response = await login(email), value = cookie(response)
    expect(String(response.headers['set-cookie'])).toMatch(/HttpOnly/i)
    expect(String(response.headers['set-cookie'])).toMatch(/SameSite=Lax/i)
    expect(String(response.headers['set-cookie'])).toMatch(/Path=\//i)
    expect(String(response.headers['set-cookie'])).not.toMatch(/Max-Age/i)
    expect(token(value)).toMatch(/^[a-f0-9]{64}$/)
    expect(response.body).not.toContain(token(value))
    expect((await sql('SELECT token_hash FROM auth_sessions WHERE token_hash = ?', [hashToken(token(value))]))[0]?.token_hash).not.toBe(token(value))
  })
  it('persiste sessão entre instâncias sem guardar credencial no cliente JSON', async () => {
    const identity = await credentials()
    const other = buildApp(config, { identity: createIdentityRepository(pool), checkDatabase: async () => {}, now: () => now })
    extra.push(other)
    const response = await session(identity.cookie, other)
    expect(response.statusCode).toBe(200)
    expect(response.json().data.user.id).toBe(identity.user.id)
    expect(response.json().data.csrfToken).toBe(identity.csrf)
  })
  it('rotaciona a sessão apresentada no login', async () => {
    const identity = await credentials(), response = await login(identity.email, identity.cookie)
    expect(cookie(response)).not.toBe(identity.cookie)
    expect((await session(identity.cookie)).statusCode).toBe(401)
    expect((await session(cookie(response))).statusCode).toBe(200)
  })
  it('GET /me exige sessão e devolve somente perfil próprio', async () => {
    const first = await credentials(), second = await credentials()
    expect((await app.inject('/api/v1/me')).statusCode).toBe(401)
    const response = await app.inject({ url: '/api/v1/me', headers: { cookie: first.cookie } })
    expect(response.json().data.id).toBe(first.user.id)
    expect(response.body).not.toContain(second.email)
    expect((await app.inject({ url: '/api/v1/me?userId=' + second.user.id, headers: { cookie: first.cookie } })).statusCode).toBe(400)
    expect((await app.inject({ url: '/api/v1/me/' + second.user.id, headers: { cookie: first.cookie } })).statusCode).toBe(404)
  })
  it('edita somente nome do usuário autenticado e rejeita injeção de identidade', async () => {
    const first = await credentials(), second = await credentials()
    const request = (payload: unknown) => app.inject({ method: 'PATCH', url: '/api/v1/me', headers: { ...headers, cookie: first.cookie, 'x-csrf-token': first.csrf }, payload: JSON.stringify(payload) })
    // payload string exige informar o formato, como um cliente HTTP real.
    const response = await app.inject({ method: 'PATCH', url: '/api/v1/me', headers: { ...headers, cookie: first.cookie, 'x-csrf-token': first.csrf }, payload: { displayName: '  Nome atualizado  ' } })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.displayName).toBe('Nome atualizado')
    const bad = await app.inject({ method: 'PATCH', url: '/api/v1/me', headers: { ...headers, cookie: first.cookie, 'x-csrf-token': first.csrf }, payload: { displayName: 'Invasão', id: second.user.id, email: second.email, role: 'ADMIN' } })
    expect(bad.statusCode).toBe(400)
    expect((await session(second.cookie)).json().data.user.displayName).toBe('Pessoa de teste')
    expect((await request({ displayName: 'Outro nome' })).statusCode).toBe(415)
  })
  it('nega CSRF ausente, incorreto e de outra sessão sem alterar perfil', async () => {
    const first = await credentials(), second = await credentials()
    for (const csrf of [undefined, '0'.repeat(64), second.csrf]) {
      const response = await app.inject({ method: 'PATCH', url: '/api/v1/me', headers: { ...headers, cookie: first.cookie, ...(csrf ? { 'x-csrf-token': csrf } : {}) }, payload: { displayName: 'Não deve persistir' } })
      expect(response.statusCode).toBe(403)
      expect(response.json().error.code).toBe('CSRF_INVALID')
    }
    expect((await session(first.cookie)).json().data.user.displayName).toBe('Pessoa de teste')
  })
  it('rejeita origem externa, ausente e cross-site explícito nas escritas', async () => {
    for (const origin of [undefined, 'https://other.invalid', 'null']) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: origin ? { origin } : {}, payload: { displayName: 'Pessoa', email: address(), password } })
      expect(response.statusCode).toBe(403)
    }
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { ...headers, 'sec-fetch-site': 'cross-site' }, payload: { email: address(), password } })
    expect(response.statusCode).toBe(403)
  })
  it('logout exige CSRF, revoga no banco, limpa cookie e é idempotente', async () => {
    const identity = await credentials()
    const missing = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { ...headers, cookie: identity.cookie }, payload: {} })
    expect(missing.statusCode).toBe(403)
    expect((await session(identity.cookie)).statusCode).toBe(200)
    for (let index = 0; index < 2; index++) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { ...headers, cookie: identity.cookie, 'x-csrf-token': identity.csrf }, payload: {} })
      expect(response.statusCode).toBe(204)
      expect(String(response.headers['set-cookie'])).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i)
    }
    expect((await session(identity.cookie)).statusCode).toBe(401)
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers, payload: {} })).statusCode).toBe(204)
  })
  it('bloquear conta ou revogar sessão invalida o acesso', async () => {
    const identity = await credentials()
    await pool.execute("UPDATE users SET status = 'BLOCKED' WHERE id = ?", [identity.user.id])
    expect((await session(identity.cookie)).statusCode).toBe(401)
    expect((await login(identity.email)).statusCode).toBe(401)
    await pool.execute("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [identity.user.id])
    await pool.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE token_hash = ?', [hashToken(token(identity.cookie))])
    expect((await session(identity.cookie)).statusCode).toBe(401)
  })
  it('expira por inatividade sem renovar ao observar bootstrap', async () => {
    const local = buildApp({ ...config, SESSION_ABSOLUTE_SECONDS: 120, SESSION_IDLE_SECONDS: 60 }, { identity: repository, checkDatabase: async () => {}, now: () => now })
    extra.push(local)
    const email = address(); await register(email)
    const response = await login(email, undefined, local), value = cookie(response)
    now += 30000
    expect((await session(value, local)).statusCode).toBe(200)
    now += 31000
    expect((await session(value, local)).statusCode).toBe(401)
  })
  it('atividade renova inatividade sem ultrapassar expiração absoluta', async () => {
    const local = buildApp({ ...config, SESSION_ABSOLUTE_SECONDS: 120, SESSION_IDLE_SECONDS: 60 }, { identity: repository, checkDatabase: async () => {}, now: () => now })
    extra.push(local)
    const email = address(); await register(email)
    const value = cookie(await login(email, undefined, local))
    for (let index = 0; index < 2; index++) {
      now += 50000
      expect((await local.inject({ url: '/api/v1/me', headers: { cookie: value } })).statusCode).toBe(200)
    }
    now += 21000
    expect((await session(value, local)).statusCode).toBe(401)
  })
  it('limita tentativas por IP mesmo trocando contas e por conta trocando IP', async () => {
    const limited = buildApp({ ...config, AUTH_RATE_LIMIT_MAX: 2 }, { identity: repository, checkDatabase: async () => {} })
    extra.push(limited)
    const email = address()
    for (let index = 0; index < 2; index++) expect((await login(email, undefined, limited)).statusCode).toBe(401)
    expect((await login(address(), undefined, limited)).statusCode).toBe(429)
    const responses = []
    for (let index = 1; index <= 3; index++) responses.push(await limited.inject({ method: 'POST', url: '/api/v1/auth/login', remoteAddress: '192.0.2.' + index, headers, payload: { email: address().replace(/-\d+@/, '-shared@'), password } }))
    expect(responses.at(-1)?.statusCode).toBe(429)
  })
  it('cookie de produção usa Secure, prefixo __Host- e não define Domain', async () => {
    expect(sessionCookieName({ ...config, NODE_ENV: 'production' })).toBe('__Host-wikichem_session')
    const secure = buildApp({ ...config, NODE_ENV: 'production', APP_ORIGIN: 'https://wiki.example.test' }, { identity: repository, checkDatabase: async () => {} })
    extra.push(secure)
    const identity = await credentials()
    const response = await secure.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin: 'https://wiki.example.test' }, payload: { email: identity.email, password } })
    const header = String(response.headers['set-cookie'])
    expect(header).toMatch(/^__Host-wikichem_session=/)
    expect(header).toMatch(/; Secure/)
    expect(header).not.toMatch(/Domain=/i)
  })
  it('provisiona primeiro admin com responsável, sem promover cliente ou redefinir credencial', async () => {
    const email = address(), input = { displayName: 'Admin de teste', email, password }
    const first = await provisionInitialAdmin(pool, config.DB_NAME, input, 'Operador de teste')
    expect(first.created).toBe(true)
    const original = (await sql('SELECT password_hash, role, provisioned_by FROM users WHERE id = ?', [first.id]))[0]
    expect(original).toMatchObject({ role: 'ADMIN', provisioned_by: 'Operador de teste' })
    expect((await provisionInitialAdmin(pool, config.DB_NAME, { ...input, password: 'Outra senha não aplicada' }, 'Outro operador')).created).toBe(false)
    expect((await sql('SELECT password_hash FROM users WHERE id = ?', [first.id]))[0]?.password_hash).toBe(original?.password_hash)
    await expect(provisionInitialAdmin(pool, config.DB_NAME, { ...input, email: address() }, 'Operador')).rejects.toMatchObject({ code: 'BOOTSTRAP_ALREADY_COMPLETED' })
    const customer = await credentials()
    await expect(provisionInitialAdmin(pool, config.DB_NAME, { ...input, email: customer.email }, 'Operador')).rejects.toMatchObject({ code: 'BOOTSTRAP_ACCOUNT_CONFLICT' })
  })
})
