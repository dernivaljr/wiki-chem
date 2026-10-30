import { readFileSync } from 'node:fs'
import { createPool } from 'mysql2/promise'
import type { Pool, PoolConnection } from 'mysql2/promise'
import type { Config } from '../config/env.js'

export function createDatabasePool(config: Config): Pool {
  return createPool({
    host: config.DB_HOST, port: config.DB_PORT, database: config.DB_NAME,
    user: config.DB_USER, password: config.DB_PASSWORD,
    connectionLimit: config.DB_POOL_SIZE, maxIdle: config.DB_POOL_SIZE,
    waitForConnections: true, queueLimit: 20, idleTimeout: 60000,
    connectTimeout: config.DB_TIMEOUT_MS, enableKeepAlive: true,
    supportBigNumbers: true, bigNumberStrings: true, dateStrings: true,
    timezone: 'Z', charset: 'utf8mb4', multipleStatements: false,
    ...(config.DB_TLS ? { ssl: {
      rejectUnauthorized: true,
      ...(config.DB_TLS_CA_FILE ? { ca: readFileSync(config.DB_TLS_CA_FILE) } : {}),
    } } : {}),
  })
}

export function acquireConnection(pool: Pool, timeoutMs = 5000): Promise<PoolConnection> {
  return new Promise((resolve, reject) => {
    let expired = false
    const timer = setTimeout(() => {
      expired = true
      reject(new Error('DB_ACQUIRE_TIMEOUT'))
    }, timeoutMs)
    void pool.getConnection().then(connection => {
      clearTimeout(timer)
      if (expired) connection.release()
      else resolve(connection)
    }, error => { clearTimeout(timer); reject(error) })
  })
}

export async function withTransaction<T>(pool: Pool, work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await acquireConnection(pool)
  try {
    await connection.beginTransaction()
    const result = await work(connection)
    await connection.commit()
    return result
  } catch (error) {
    try { await connection.rollback() } catch { connection.destroy() }
    throw error
  } finally {
    connection.release()
  }
}
