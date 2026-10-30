import { randomBytes } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { loadMigrationConfig } from '../../src/config/env.js'
import { createDatabasePool, withTransaction } from '../../src/database/pool.js'
import { hashPassword } from '../../src/modules/identity/security.js'
import { assertDemo } from './examples.js'
import { demoOperator } from './seed.js'
try {
  assertDemo(process.env)
  if (process.env.DB_NAME !== 'wikichem_test_demo' || !process.stdin.isTTY || !process.stdout.isTTY) throw new Error('DEMO_TTY_REQUIRED')
  const config = loadMigrationConfig(process.env), pool = createDatabasePool(config), password = randomBytes(24).toString('base64url')
  try {
    const email = await withTransaction(pool, async db => {
      const [users] = await db.execute<RowDataPacket[]>("SELECT id, email_normalized FROM users WHERE role = 'ADMIN' AND provisioned_by = ? FOR UPDATE", [demoOperator])
      if (users.length !== 1) throw new Error('DEMO_ADMIN_NOT_FOUND')
      const user = users[0]!
      await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(password), user.id])
      await db.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL', [user.id])
      return String(user.email_normalized)
    })
    console.log('Conta sintética de demonstração, sem identidade humana. A senha é aleatória, exibida uma vez e não gravada em arquivo.\nE-mail: ' + email + '\nSenha: ' + password)
  } finally { await pool.end() }
} catch { console.error('Acesso demonstrativo exige terminal interativo, ambiente isolado preparado e habilitação explícita.'); process.exitCode = 1 }
