import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

export default async function setup() {
  const backend = fileURLToPath(new URL('../../backend/', import.meta.url))
  await promisify(execFile)(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tests/e2e/catalog.setup.ts'], {
    cwd: backend, env: process.env, timeout: 60000,
  })
}
