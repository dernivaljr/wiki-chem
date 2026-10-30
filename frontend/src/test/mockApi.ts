import { vi } from 'vitest'
export const fixtureUser = { id: '10', displayName: 'Pessoa de teste', email: 'pessoa@example.test', role: 'CUSTOMER', status: 'ACTIVE' } as const
export const fixtureSession = () => ({ user: fixtureUser, csrfToken: 'a'.repeat(64), expiresAt: new Date(Date.now() + 600000).toISOString() })
export const success = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json' } })
export const failure = (status = 401, code = 'SESSION_REQUIRED', message = 'Entre novamente.') => new Response(JSON.stringify({ error: { code, message, details: [], requestId: 'fixture-only' } }), { status })
export const mockFetch = () => vi.mocked(fetch)
