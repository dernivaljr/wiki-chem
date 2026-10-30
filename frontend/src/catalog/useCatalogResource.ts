import { useEffect, useState } from 'react'
type Result<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: unknown }
export function useCatalogResource<T>(load: () => Promise<T>) {
  const [result, setResult] = useState<Result<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    load().then(data => { if (active) setResult({ status: 'ready', data }) }).catch(error => { if (active) setResult({ status: 'error', error }) })
    return () => { active = false }
  }, [load, attempt])
  return { result, retry: () => { setResult({ status: 'loading' }); setAttempt(value => value + 1) } }
}
