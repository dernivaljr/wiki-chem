import { useEffect, useState } from 'react'
// Vincula o resultado ao autorizador/carregador atual. Uma troca de sessão ou
// versão nunca deixa o resultado anterior visível durante a nova requisição.
export function useProtectedResource<T>(load: () => Promise<T>) {
  type Result = { status: 'ready'; data: T } | { status: 'error'; error: unknown }
  const [settled, setSettled] = useState<{ load: typeof load; result: Result } | null>(null), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    load().then(data => { if (active) setSettled({ load, result: { status: 'ready', data } }) }).catch(error => { if (active) setSettled({ load, result: { status: 'error', error } }) })
    return () => { active = false }
  }, [load, attempt])
  return { result: settled?.load === load ? settled.result : { status: 'loading' as const }, retry: () => { setSettled(null); setAttempt(value => value + 1) } }
}
