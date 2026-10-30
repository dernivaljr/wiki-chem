import type { Pool, RowDataPacket } from 'mysql2/promise'
import { withTransaction } from '../../database/pool.js'
import { AppError } from '../../shared/errors.js'
import type { User } from './identity.contracts.js'

export interface StoredUser extends RowDataPacket {
  id: string; display_name: string; email_normalized: string; password_hash: string
  role: 'CUSTOMER' | 'ADMIN'; status: 'ACTIVE' | 'BLOCKED'
}
interface SessionRow extends StoredUser {
  session_id: string; issued_at: string; last_seen_at: string; expires_at: string; revoked_at: string | null
}
const sqlDate = (value: number) => new Date(value).toISOString().slice(0, 23).replace('T', ' ')
const timestamp = (value: string) => Date.parse(value.replace(' ', 'T') + 'Z')
export const publicUser = (row: StoredUser): User => ({
  id: String(row.id), displayName: row.display_name, email: row.email_normalized, role: row.role, status: 'ACTIVE',
})
async function database<T>(work: () => Promise<T>): Promise<T> {
  try { return await work() } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(503, 'IDENTITY_UNAVAILABLE', 'Serviço de identidade temporariamente indisponível.')
  }
}

export function createIdentityRepository(pool: Pool) {
  async function findUser(email: string): Promise<StoredUser | undefined> {
    return database(async () => (await pool.execute<StoredUser[]>('SELECT * FROM users WHERE email_normalized = ?', [email]))[0][0])
  }
  return {
    findUser,
    async register(name: string, email: string, hash: string): Promise<User> {
      return database(async () => {
        try {
          await pool.execute("INSERT INTO users (display_name, email_normalized, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, 'CUSTOMER', 'ACTIVE', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))", [name, email, hash])
        } catch (error) {
          if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new AppError(409, 'ACCOUNT_UNAVAILABLE', 'Não foi possível criar a conta com estes dados.')
          throw error
        }
        const user = await findUser(email)
        if (!user) throw new Error('USER_WRITE_NOT_VISIBLE')
        return publicUser(user)
      })
    },
    async startSession(user: StoredUser, tokenHash: string, previousHash: string | undefined, now: number, expiresAt: number): Promise<void> {
      return database(() => withTransaction(pool, async connection => {
        const [users] = await connection.execute<StoredUser[]>('SELECT * FROM users WHERE id = ? FOR UPDATE', [user.id])
        const current = users[0]
        if (!current || current.status !== 'ACTIVE' || current.password_hash !== user.password_hash) {
          throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.')
        }
        if (previousHash) await connection.execute('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', [sqlDate(now), previousHash])
        await connection.execute('INSERT INTO auth_sessions (user_id, token_hash, issued_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)', [user.id, tokenHash, sqlDate(now), sqlDate(now), sqlDate(expiresAt)])
      }))
    },
    async session(tokenHash: string, now: number, idleMs: number, touch: boolean): Promise<{ user: User; expiresAt: number } | undefined> {
      return database(() => withTransaction(pool, async connection => {
        const [rows] = await connection.execute<SessionRow[]>(
          'SELECT u.*, s.id AS session_id, s.issued_at, s.last_seen_at, s.expires_at, s.revoked_at FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? FOR UPDATE', [tokenHash])
        const row = rows[0]
        if (!row || row.revoked_at || row.status !== 'ACTIVE') return undefined
        const absolute = timestamp(row.expires_at)
        const idle = timestamp(row.last_seen_at) + idleMs
        if (!Number.isFinite(absolute) || !Number.isFinite(idle) || now >= absolute || now >= idle) return undefined
        const seen = Math.max(now, timestamp(row.last_seen_at))
        if (touch) await connection.execute('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?', [sqlDate(seen), row.session_id])
        return { user: publicUser(row), expiresAt: Math.min(absolute, touch ? seen + idleMs : idle) }
      }))
    },
    async revoke(tokenHash: string, now: number) {
      return database(async () => { await pool.execute('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', [sqlDate(now), tokenHash]) })
    },
    async updateName(tokenHash: string, name: string, now: number, idleMs: number): Promise<User> {
      return database(() => withTransaction(pool, async connection => {
        const [rows] = await connection.execute<SessionRow[]>('SELECT u.*, s.id AS session_id, s.last_seen_at, s.expires_at, s.revoked_at FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? FOR UPDATE', [tokenHash])
        const row = rows[0]
        if (!row || row.status !== 'ACTIVE' || row.revoked_at || now >= timestamp(row.expires_at) || now >= timestamp(row.last_seen_at) + idleMs) throw new AppError(401, 'SESSION_REQUIRED', 'Sua sessão expirou. Entre novamente.')
        await connection.execute('UPDATE users SET display_name = ?, updated_at = UTC_TIMESTAMP(6) WHERE id = ?', [name, row.id])
        await connection.execute('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?', [sqlDate(Math.max(now, timestamp(row.last_seen_at))), row.session_id])
        return publicUser({ ...row, display_name: name })
      }))
    },
  }
}
export type IdentityRepository = ReturnType<typeof createIdentityRepository>
