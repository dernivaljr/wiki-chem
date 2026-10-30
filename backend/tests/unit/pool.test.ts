import type { Pool, PoolConnection } from 'mysql2/promise'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { acquireConnection } from '../../src/database/pool.js'

afterEach(() => { vi.useRealTimers() })
describe('timeout do pool', () => {
  it('limita espera e devolve conexão que chega após o timeout', async () => {
    vi.useFakeTimers()
    let deliver: ((connection: PoolConnection) => void) | undefined
    const pool = { getConnection: () => new Promise<PoolConnection>(resolve => { deliver = resolve }) } as Pool
    const connection = { release: vi.fn() } as unknown as PoolConnection
    const pending = acquireConnection(pool, 100)
    const rejected = expect(pending).rejects.toThrow('DB_ACQUIRE_TIMEOUT')
    await vi.advanceTimersByTimeAsync(100)
    await rejected
    deliver?.(connection)
    await Promise.resolve()
    expect(connection.release).toHaveBeenCalledOnce()
  })
  it('propaga erro de aquisição sem manter timer pendente', async () => {
    vi.useFakeTimers()
    const pool = { getConnection: () => Promise.reject(new Error('unavailable')) } as Pool
    await expect(acquireConnection(pool)).rejects.toThrow('unavailable')
    expect(vi.getTimerCount()).toBe(0)
  })
})
