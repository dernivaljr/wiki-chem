import type { Pool, RowDataPacket } from 'mysql2/promise'
import { createHash } from 'node:crypto'
import { acquireConnection } from '../../database/pool.js'
import { AppError } from '../../shared/errors.js'
import { registerInput, displayName } from './identity.contracts.js'
import { hashPassword } from './security.js'
import type { StoredUser } from './identity.repository.js'

export async function provisionInitialAdmin(pool: Pool, database: string, input: unknown, operator: string) {
  const data = registerInput.parse(input)
  const actor = displayName.parse(operator)
  const passwordHash = await hashPassword(data.password)
  const connection = await acquireConnection(pool)
  const lock = 'wikichem:admin:' + createHash('sha256').update(database).digest('hex').slice(0, 40)
  let locked = false
  let transaction = false
  try {
    const [db] = await connection.execute<RowDataPacket[]>('SELECT DATABASE() AS name')
    if (db[0]?.name !== database) throw new AppError(409, 'BOOTSTRAP_DATABASE_MISMATCH', 'Configuração operacional divergente.')
    const [result] = await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS acquired', [lock])
    if (String(result[0]?.acquired) !== '1') throw new AppError(409, 'BOOTSTRAP_BUSY', 'Provisionamento em andamento.')
    locked = true
    await connection.beginTransaction()
    transaction = true
    const [users] = await connection.execute<StoredUser[]>('SELECT * FROM users WHERE email_normalized = ? FOR UPDATE', [data.email])
    const existing = users[0]
    if (existing) {
      if (existing.role !== 'ADMIN' || existing.status !== 'ACTIVE') throw new AppError(409, 'BOOTSTRAP_ACCOUNT_CONFLICT', 'A conta existente não pode ser promovida ou restaurada por este comando.')
      await connection.commit()
      transaction = false
      return { created: false, id: String(existing.id) }
    }
    const [admins] = await connection.execute<RowDataPacket[]>("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1 FOR UPDATE")
    if (admins.length) throw new AppError(409, 'BOOTSTRAP_ALREADY_COMPLETED', 'O primeiro administrador já foi provisionado.')
    await connection.execute("INSERT INTO users (display_name, email_normalized, password_hash, role, status, provisioned_by, created_at, updated_at) VALUES (?, ?, ?, 'ADMIN', 'ACTIVE', ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))", [data.displayName, data.email, passwordHash, actor])
    const [created] = await connection.execute<StoredUser[]>('SELECT * FROM users WHERE email_normalized = ?', [data.email])
    if (!created[0]) throw new Error('ADMIN_WRITE_NOT_VISIBLE')
    await connection.commit()
    transaction = false
    return { created: true, id: String(created[0].id) }
  } catch (error) {
    if (transaction) try { await connection.rollback() } catch { connection.destroy() }
    throw error
  } finally {
    if (locked) {
      try {
        const [released] = await connection.execute<RowDataPacket[]>('SELECT RELEASE_LOCK(?) AS released', [lock])
        if (String(released[0]?.released) !== '1') connection.destroy()
      } catch { connection.destroy() }
    }
    connection.release()
  }
}
