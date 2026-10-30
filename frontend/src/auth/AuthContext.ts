import type { ApiOptions } from './api'
import { createContext, useContext } from 'react'
export interface AuthUser { id: string; displayName: string; email: string; role: 'CUSTOMER' | 'ADMIN'; status: 'ACTIVE' }
export interface Session { user: AuthUser; csrfToken: string; expiresAt: string }
export interface AuthValue {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error'
  user: AuthUser | null
  expired: boolean
  error: string
  refresh: () => Promise<void>
  register: (input: { displayName: string; email: string; password: string }) => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  request: <T>(path: string, options?: Omit<ApiOptions, 'csrf'>) => Promise<T>
  updateName: (displayName: string) => Promise<void>
}
export const AuthContext = createContext<AuthValue | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider necessário.')
  return context
}
