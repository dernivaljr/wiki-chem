import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <main className="session-status"><h1>Verificando acesso</h1><p role="status">Carregando sessão…</p></main>
  if (auth.status === 'error') return <main className="session-status"><h1>Serviço indisponível</h1><p role="alert">{auth.error}</p><button onClick={() => { void auth.refresh() }}>Tentar novamente</button></main>
  if (!auth.user) {
    const query = new URLSearchParams({ returnTo: location.pathname + location.search })
    if (auth.expired) query.set('expired', '1')
    return <Navigate to={'/login?' + query.toString()} replace />
  }
  return <Fragment key={auth.user.id}>{children}</Fragment>
}
