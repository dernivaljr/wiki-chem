import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { Writable } from 'node:stream'
import { loadConfig, ConfigurationError } from '../config/env.js'
import { createDatabasePool } from '../database/pool.js'
import { provisionInitialAdmin } from '../modules/identity/admin-bootstrap.js'
import { AppError } from '../shared/errors.js'

async function hiddenPassword(): Promise<string> {
  stdout.write('Senha (entrada oculta): ')
  const muted = new Writable({ write(_chunk, _encoding, callback) { callback() } })
  const prompt = createInterface({ input: stdin, output: muted, terminal: true })
  try {
    return await Promise.race([
      prompt.question(''),
      new Promise<never>((_resolve, reject) => { prompt.once('SIGINT', () => reject(new Error('INTERRUPTED'))) }),
    ])
  } finally {
    prompt.close()
    stdout.write('\n')
  }
}
async function main() {
  if (process.argv.length !== 2 || process.env.ADMIN_BOOTSTRAP_ENABLED !== 'true' || !stdin.isTTY || !stdout.isTTY) {
    throw new AppError(403, 'BOOTSTRAP_DISABLED', 'Exige habilitação operacional explícita e terminal interativo; argumentos não são aceitos.')
  }
  const config = loadConfig({ ...process.env, DB_USER: process.env.ADMIN_DB_USER, DB_PASSWORD: process.env.ADMIN_DB_PASSWORD })
  const prompt = createInterface({ input: stdin, output: stdout })
  let operator: string, name: string, email: string
  try {
    operator = await prompt.question('Responsável autorizado: ')
    name = await prompt.question('Nome de exibição do administrador: ')
    email = await prompt.question('E-mail: ')
  } finally { prompt.close() }
  const password = await hiddenPassword()
  const confirm = await hiddenPassword()
  if (password !== confirm) throw new AppError(400, 'PASSWORD_MISMATCH', 'As senhas não coincidem.')
  const pool = createDatabasePool(config)
  try {
    const result = await provisionInitialAdmin(pool, config.DB_NAME, { displayName: name, email, password }, operator)
    console.log(result.created ? 'Administrador inicial provisionado.' : 'Administrador já existente; nenhuma credencial foi alterada.')
  } finally { await pool.end() }
}
main().catch(error => {
  console.error(error instanceof ConfigurationError || error instanceof AppError ? error.message : 'Falha no provisionamento; confira os campos e a configuração operacional.')
  process.exitCode = 1
})
