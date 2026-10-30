import { Writable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { buildApp } from '../../src/app.js'
import { databaseResponse, errorResponse, healthResponse } from '../../src/shared/contracts.js'
import { testConfig } from '../helpers.js'

const apps: FastifyInstance[] = []
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())) })
function app(checkDatabase = vi.fn().mockResolvedValue(undefined)) {
  const instance = buildApp(testConfig, { checkDatabase })
  apps.push(instance)
  return instance
}

describe('contratos REST e erros', () => {
  it('liveness independe do banco e utiliza UUID próprio por requisição', async () => {
    const check = vi.fn().mockRejectedValue(new Error('database is down'))
    const api = app(check)
    const first = await api.inject({ url: '/api/v1/health', headers: { 'x-request-id': 'untrusted-client-id' } })
    const second = await api.inject('/api/v1/health')
    expect(first.statusCode).toBe(200)
    expect(healthResponse.parse(first.json())).toEqual({ data: { status: 'ok' } })
    expect(z.uuid().parse(first.headers['x-request-id'])).not.toBe(second.headers['x-request-id'])
    expect(check).not.toHaveBeenCalled()
    expect(first.headers['cache-control']).toBe('no-store')
    expect(first.headers['x-content-type-options']).toBe('nosniff')
  })
  it('disponibilidade do banco é uma consulta separada', async () => {
    const check = vi.fn().mockResolvedValue(undefined)
    const response = await app(check).inject('/api/v1/health/database')
    expect(response.statusCode).toBe(200)
    expect(databaseResponse.parse(response.json()).data.status).toBe('available')
    expect(check).toHaveBeenCalledOnce()
  })
  it('indisponibilidade produz 503 sem revelar SQL ou credencial', async () => {
    const response = await app(vi.fn().mockRejectedValue(new Error('password=secret SQL SELECT private'))).inject('/api/v1/health/database')
    expect(response.statusCode).toBe(503)
    expect(errorResponse.parse(response.json()).error.code).toBe('DATABASE_UNAVAILABLE')
    expect(response.body).not.toMatch(/secret|SELECT|private/)
    expect(response.json().error.requestId).toBe(response.headers['x-request-id'])
  })
  it.each(['/api/v1/health?extra=1', '/api/v1/health/database?sql=SELECT+1'])('rejeita campos desconhecidos: %s', async url => {
    const response = await app().inject(url)
    expect(response.statusCode).toBe(400)
    expect(errorResponse.parse(response.json()).error.code).toBe('VALIDATION_ERROR')
    expect(response.body).not.toContain('SELECT')
  })
  it.each(['/health', '/api/v1/login', '/api/v1/methodologies', '/api/v1/checkout'])('não antecipa rotas de negócio: %s', async url => {
    const response = await app().inject(url)
    expect(response.statusCode).toBe(404)
    expect(errorResponse.parse(response.json()).error.code).toBe('NOT_FOUND')
  })
  it('centraliza falhas inesperadas e encerra o recurso de banco', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined)
    const api = buildApp(testConfig, { checkDatabase: async () => {}, closeDatabase })
    apps.push(api)
    api.get('/test-failure', async () => { throw new Error('secret SQL stack') })
    const response = await api.inject('/test-failure')
    expect(response.statusCode).toBe(500)
    expect(errorResponse.parse(response.json()).error.code).toBe('INTERNAL_ERROR')
    expect(response.body).not.toMatch(/secret|SQL|stack/)
    await api.close()
    expect(closeDatabase).toHaveBeenCalledOnce()
  })
  it.each([
    ['{', 'application/json', 400, 'INVALID_JSON'],
    ['', 'application/json', 400, 'INVALID_JSON'],
    ['raw', 'application/x-unknown', 415, 'UNSUPPORTED_MEDIA_TYPE'],
    ['a'.repeat(16385), 'text/plain', 413, 'PAYLOAD_TOO_LARGE'],
  ] as const)('normaliza erro de parsing: %s', async (payload, contentType, status, code) => {
    const api = app()
    api.post('/test-input', async () => ({ data: {} }))
    const response = await api.inject({ method: 'POST', url: '/test-input', payload, headers: { 'content-type': contentType } })
    expect(response.statusCode).toBe(status)
    expect(errorResponse.parse(response.json()).error.code).toBe(code)
  })
  it('valida também bodies Zod sem refletir valores recebidos', async () => {
    const api = app()
    api.post('/test-validation', { schema: { body: z.strictObject({ count: z.number().int().positive() }) } }, async () => ({ data: {} }))
    const response = await api.inject({ method: 'POST', url: '/test-validation', payload: { count: 'private-input' } })
    expect(response.statusCode).toBe(400)
    expect(errorResponse.parse(response.json()).error.details[0]?.field).toBe('count')
    expect(response.body).not.toContain('private-input')
  })
  it('impede serialização de resposta fora do contrato', async () => {
    const api = app()
    api.get('/test-invalid-output', { schema: { response: { 200: healthResponse } } }, async () => ({ data: { status: 'invalid-secret' } }))
    const response = await api.inject('/test-invalid-output')
    expect(response.statusCode).toBe(500)
    expect(errorResponse.parse(response.json()).error.code).toBe('INTERNAL_ERROR')
    expect(response.body).not.toContain('invalid-secret')
  })
  it('não registra URL/query, credenciais, body ou erro bruto', async () => {
    let output = ''
    const stream = new Writable({ write(chunk, _encoding, callback) { output += String(chunk); callback() } })
    const api = buildApp({ ...testConfig, LOG_LEVEL: 'info' }, {
      checkDatabase: async () => { throw new Error('secret-driver-error') },
      logger: { stream },
    })
    apps.push(api)
    await api.inject({ url: '/api/v1/health/database?private=secret-query', headers: { cookie: 'secret-cookie', authorization: 'secret-token' } })
    await api.inject('/api/v1/health/database')
    expect(output).toContain('reqId')
    expect(output).not.toMatch(/secret-query|secret-cookie|secret-token|secret-driver-error/)
  })
})
