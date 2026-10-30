import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import type { AuthValue, Session } from './AuthContext'
import { apiRequest, ApiError } from './api'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthValue['status']>('loading')
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState('')
  const revision = useRef(0)
  const busy = useRef(false)
  const hadSession = useRef(false)
  const channel = useRef<BroadcastChannel | null>(null)

  const invalidate = useCallback(() => { ++revision.current }, [])
  const anonymous = useCallback(() => {
    setExpired(hadSession.current)
    setSession(null)
    setStatus('anonymous')
  }, [])
  const refresh = useCallback(async () => {
    if (busy.current) return
    const current = ++revision.current
    try {
      const data = await apiRequest<Session>('/auth/session')
      if (current !== revision.current) return
      hadSession.current = true
      setSession(data)
      setStatus('authenticated')
      setExpired(false)
      setError('')
    } catch (error) {
      if (current !== revision.current) return
      if (error instanceof ApiError && error.status === 401) anonymous()
      else {
        setStatus('error')
        setError(error instanceof Error ? error.message : 'Não foi possível verificar sua sessão.')
      }
    }
  }, [anonymous])

  useEffect(() => {
    let alive = true
    queueMicrotask(() => { if (alive) void refresh() })
    const focus = () => { void refresh() }
    window.addEventListener('focus', focus)
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('wikichem-session')
      channel.current.onmessage = focus
    }
    return () => { alive = false; invalidate(); window.removeEventListener('focus', focus); channel.current?.close(); channel.current = null }
  }, [refresh, invalidate])
  useEffect(() => {
    if (status !== 'authenticated' || !session) return
    const timeout = window.setTimeout(() => { void refresh() }, Math.max(0, Date.parse(session.expiresAt) - Date.now()) + 50)
    return () => window.clearTimeout(timeout)
  }, [session, status, refresh])

  async function login(input: { email: string; password: string }) {
    busy.current = true
    ++revision.current
    try {
      const data = await apiRequest<Session>('/auth/login', { method: 'POST', body: input })
      hadSession.current = true
      setSession(data)
      setStatus('authenticated')
      setExpired(false)
      setError('')
      channel.current?.postMessage('changed')
    } finally { busy.current = false }
  }
  async function logout() {
    busy.current = true
    ++revision.current
    try {
      await apiRequest('/auth/logout', { method: 'POST', body: {}, ...(session ? { csrf: session.csrfToken } : {}) })
      hadSession.current = false
      anonymous()
      setExpired(false)
      channel.current?.postMessage('changed')
    } finally { busy.current = false }
  }
  async function updateName(displayName: string) {
    try {
      if (!session) throw new ApiError(401, 'SESSION_REQUIRED', 'Entre novamente.')
      await apiRequest('/me', { method: 'PATCH', body: { displayName }, csrf: session.csrfToken })
      await refresh()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { ++revision.current; anonymous() }
      throw error
    }
  }
  const value: AuthValue = {
    status, user: status === 'authenticated' ? session?.user ?? null : null, expired, error, refresh, login, logout, updateName,
    register: async input => { await apiRequest('/auth/register', { method: 'POST', body: input }) },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
