import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { loadConfig } from '../../src/config/env.js'

const config = loadConfig(process.env)
if (config.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(config.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') {
  throw new Error('Processo integrado exige banco exclusivo de testes e MYSQL_TEST_ALLOW=true.')
}
const entry = fileURLToPath(new URL('../../dist/server.js', import.meta.url))
let child: ReturnType<typeof spawn> | undefined
let origin = ''
beforeAll(async () => {
  const probe = createServer()
  probe.listen({ host: '127.0.0.1', port: 0 })
  await once(probe, 'listening')
  const address = probe.address()
  if (!address || typeof address === 'string') throw new Error('Porta indisponível.')
  const port = address.port
  await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()))
  origin = 'http://127.0.0.1:' + port
  child = spawn(process.execPath, [entry], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: 'ignore',
  })
  let failure: Error | undefined
  child.on('error', error => { failure = error })
  for (let attempt = 0; attempt < 100; attempt++) {
    if (failure) throw failure
    if (child.exitCode !== null) throw new Error('Backend encerrou antes do teste HTTP.')
    try {
      const response = await fetch(origin + '/api/v1/health', { signal: AbortSignal.timeout(500) })
      if (response.status === 200) return
    } catch { /* aguardar inicialização do processo testado */ }
    await delay(100)
  }
  throw new Error('Timeout ao iniciar servidor compilado.')
})
afterAll(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exit = once(child, 'exit')
    child.kill()
    await Promise.race([exit, delay(3000)])
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }
})
it('executa o servidor compilado com MySQL real e erros seguros', async () => {
  const response = await fetch(origin + '/api/v1/health/database')
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ data: { status: 'available' } })
  expect((await fetch(origin + '/api/v1/health?unknown=1')).status).toBe(400)
})
it('encerra o processo e pool por SIGTERM no ambiente Linux', async () => {
  if (!child) throw new Error('Processo ausente.')
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  const result = await Promise.race([exited, delay(5000).then(() => { throw new Error('Timeout de encerramento.') })])
  // Windows termina processos diretamente; não emula o tratamento POSIX do sinal.
  if (process.platform === 'win32') expect(result[1]).toBe('SIGTERM')
  else expect(result).toEqual([0, null])
})
it('recusa ambiente inválido sem expor valor de segredo', async () => {
  const invalid = spawn(process.execPath, [entry], {
    env: { ...process.env, DB_PASSWORD: '', DB_NAME: 'bad-secret-value;' }, stdio: ['ignore', 'ignore', 'pipe'],
  })
  let output = ''
  invalid.stderr.on('data', chunk => { output += String(chunk) })
  const [code] = await once(invalid, 'exit')
  expect(code).toBe(1)
  expect(output).toContain('DB_PASSWORD')
  expect(output).not.toContain('bad-secret-value')
})

it.each([
  { enabled: 'false', args: [] },
  { enabled: 'true', args: [] },
  { enabled: 'true', args: ['--password', 'fixture-secret-never-accepted'] },
])('bootstrap recusa execução sem terminal seguro: %j', async ({ enabled, args }) => {
  const command = fileURLToPath(new URL('../../dist/commands/bootstrap-admin.js', import.meta.url))
  const invalid = spawn(process.execPath, [command, ...args], {
    env: { ...process.env, ADMIN_BOOTSTRAP_ENABLED: enabled }, stdio: ['ignore', 'ignore', 'pipe'],
  })
  let output = ''
  invalid.stderr.on('data', chunk => { output += String(chunk) })
  const [code] = await once(invalid, 'exit')
  expect(code).toBe(1)
  expect(output).toContain('terminal interativo')
  expect(output).not.toContain('fixture-secret-never-accepted')
})
