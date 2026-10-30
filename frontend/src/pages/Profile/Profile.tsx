import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import './Profile.css'

export default function Profile() {
  const auth = useAuth()
  const [name, setName] = useState(auth.user?.displayName ?? '')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true); setMessage(''); setError('')
    try { await auth.updateName(name); setMessage('Nome atualizado com sucesso.') }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível salvar.') }
    finally { setPending(false) }
  }
  return <main className="profile-page">
    <section className="profile-panel" aria-labelledby="profile-title">
      <p className="auth__kicker">SUA CONTA</p><h1 id="profile-title">Meu perfil</h1>
      <p>Gerencie seu nome de exibição. O e-mail não pode ser alterado nesta etapa.</p>
      <form onSubmit={submit} aria-busy={pending}>
        <label>Nome de exibição<input name="displayName" autoComplete="name" value={name} onChange={event => setName(event.target.value)} required minLength={1} maxLength={100} /></label>
        <label>E-mail<input value={auth.user?.email ?? ''} type="email" readOnly /></label>
        <button className="auth__submit" disabled={pending} type="submit">{pending ? 'Salvando…' : 'Salvar nome'}</button>
        {error && <p className="auth__error" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  </main>
}
