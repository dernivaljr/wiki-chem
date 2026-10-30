import type { Pool } from 'mysql2/promise'
import { acquireConnection } from '../../database/pool.js'

export function createHealthRepository(pool: Pool, timeoutMs: number) {
  return {
    async checkDatabase(): Promise<void> {
      const connection = await acquireConnection(pool, timeoutMs)
      try {
        await connection.execute({ sql: 'SELECT 1', timeout: timeoutMs })
      } catch (error) {
        connection.destroy()
        throw error
      } finally {
        connection.release()
      }
    },
  }
}
