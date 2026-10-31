import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiRequest } from '../auth/api'
import type { Cart } from './types'

export interface CartSummaryValue {
  count: number
  loaded: boolean
  syncCart: (cart: Cart | null | undefined) => void
  setCartCount: (count: number) => void
  refreshCart: () => Promise<void>
}

const noop = () => {}
const noopAsync = async () => {}

const CartSummaryContext = createContext<CartSummaryValue>({
  count: 0,
  loaded: false,
  syncCart: noop,
  setCartCount: noop,
  refreshCart: noopAsync,
})

export function CartSummaryProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const userId = status === 'authenticated' ? user?.id ?? null : null
  const [state, setState] = useState<{ ownerId: string | null; count: number; loaded: boolean }>({
    ownerId: null,
    count: 0,
    loaded: false,
  })
  const requestSeq = useRef(0)

  const syncCart = useCallback((cart: Cart | null | undefined) => {
    if (!userId) return
    const nextCount = Array.isArray(cart?.items) ? cart.items.length : 0
    setState({ ownerId: userId, count: nextCount, loaded: true })
  }, [userId])

  const setCartCount = useCallback((count: number) => {
    if (!userId) return
    setState({ ownerId: userId, count: Math.max(0, count), loaded: true })
  }, [userId])

  const refreshCart = useCallback(async () => {
    const seq = ++requestSeq.current
    if (!userId) return
    try {
      const data = await apiRequest<Cart>('/cart')
      if (seq !== requestSeq.current) return
      const nextCount = Array.isArray(data?.items) ? data.items.length : 0
      setState({ ownerId: userId, count: nextCount, loaded: true })
    } catch {
      if (seq !== requestSeq.current) return
      setState(prev => (prev.ownerId === userId ? { ...prev, loaded: true } : { ownerId: userId, count: 0, loaded: true }))
    }
  }, [userId])

  useEffect(() => {
    let active = true
    if (!userId) {
      ++requestSeq.current
      return
    }
    queueMicrotask(() => {
      if (active) void refreshCart()
    })
    return () => {
      active = false
    }
  }, [userId, refreshCart])

  const count = userId && state.ownerId === userId ? state.count : 0
  const loaded = userId ? state.ownerId === userId && state.loaded : true

  const value = useMemo<CartSummaryValue>(
    () => ({ count, loaded, syncCart, setCartCount, refreshCart }),
    [count, loaded, syncCart, setCartCount, refreshCart],
  )

  return <CartSummaryContext.Provider value={value}>{children}</CartSummaryContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCartSummary() {
  return useContext(CartSummaryContext)
}
