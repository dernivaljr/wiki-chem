import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/env.js'
import { createDatabasePool } from '../../src/database/pool.js'
import { createHealthRepository } from '../../src/modules/health/health.repository.js'

const config = loadConfig(process.env)
if (config.NODE_ENV !== 'test' || !/^wikichem_test_[a-z0-9_]+$/.test(config.DB_NAME) || process.env.MYSQL_TEST_ALLOW !== 'true') {
  throw new Error('Proxy integrado exige banco exclusivo de testes e MYSQL_TEST_ALLOW=true.')
}
const pool = createDatabasePool(config)
const app = buildApp(config, {
  checkDatabase: createHealthRepository(pool, config.DB_TIMEOUT_MS).checkDatabase,
  closeDatabase: () => pool.end(),
})
let child: ReturnType<typeof spawn> | undefined
let spawnError: Error | undefined
const origin = 'http://127.0.0.1:5175'

beforeAll(async () => {
  const target = await app.listen({ host: '127.0.0.1', port: 0 })
  child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], {
    cwd: fileURLToPath(new URL('../../../frontend/', import.meta.url)),
    env: { ...process.env, API_PROXY_TARGET: target }, stdio: 'ignore',
  })
  child.on('error', error => { spawnError = error })
  for (let attempt = 0; attempt < 100; attempt++) {
    if (spawnError) throw spawnError
    if (child.exitCode !== null) throw new Error('Vite encerrou antes da verificação do proxy.')
    try {
      const response = await fetch(origin + '/api/v1/health', { signal: AbortSignal.timeout(500) })
      if (response.status === 200 && (await response.text()).includes('"ok"')) return
    } catch { /* aguardar somente a inicialização local */ }
    await delay(100)
  }
  throw new Error('Timeout ao iniciar o proxy de desenvolvimento.')
})
afterAll(async () => {
  if (child && child.exitCode === null) {
    const exit = once(child, 'exit')
    child.kill()
    await Promise.race([exit, delay(3000)])
    if (child.exitCode === null) child.kill('SIGKILL')
  }
  await app.close()
})

it('encaminha saúde da API e consulta MySQL pelo proxy Vite', async () => {
  const response = await fetch(origin + '/api/v1/health/database')
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ data: { status: 'available' } })
  expect(response.headers.get('x-request-id')).toMatch(/^[a-f0-9-]{36}$/)
})
it('preserva entrega da interface React', async () => {
  const response = await fetch(origin + '/login')
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('id="root"')
})
