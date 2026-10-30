import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { Version } from './catalog.types'
import AdminError from './AdminError'
export default function VersionAccess({ version, onSaved }: { version: Version; onSaved: (version: Version) => Promise<void> }) {
  const { request } = useAuth(), [reason, setReason] = useState(''), [pending, setPending] = useState(false), [error, setError] = useState<unknown>(null)
  async function change() {
    setPending(true); setError(null)
    try {
      const updated = await request<Version>('/admin/versions/' + version.id + '/access', { method: 'PATCH', body: { expectedRevision: version.revision, accessState: version.accessState === 'ALLOWED' ? 'SUSPENDED' : 'ALLOWED', reason } })
      await onSaved(updated); setReason('')
    } catch (error) { setError(error) } finally { setPending(false) }
  }
  return <section aria-label="Disponibilidade editorial"><h4>Disponibilidade de leitura: {version.accessState === 'ALLOWED' ? 'Permitida' : 'Suspensa'}</h4><p>Esta ação altera apenas a disponibilidade da versão e registra auditoria. Não modifica o conteúdo publicado nem aprova condições de fontes.</p>
    <label htmlFor={'access-reason-' + version.id}>Justificativa da alteração de acesso</label><textarea id={'access-reason-' + version.id} value={reason} maxLength={2000} disabled={pending} onChange={event => setReason(event.target.value)} />
    <button type="button" disabled={pending || !reason.trim()} onClick={() => { void change() }}>{pending ? 'Registrando alteração…' : version.accessState === 'ALLOWED' ? 'Suspender acesso à versão' : 'Restaurar acesso à versão'}</button><AdminError error={error} />
  </section>
}
