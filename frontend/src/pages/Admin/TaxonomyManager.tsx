import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { facets, labels } from './catalog.types'
import type { Facet, Taxonomies, Term } from './catalog.types'
import AdminError from './AdminError'

const blank = () => ({ code: '', label: '', active: true, issuer: '', identifier: '', editionLabel: '', verifiedStatus: 'PENDING' as 'PENDING' | 'VERIFIED' })
export default function TaxonomyManager({ taxonomies, onSaved }: { taxonomies: Taxonomies; onSaved: () => Promise<void> }) {
  const { request } = useAuth()
  const [facet, setFacet] = useState<Facet>('techniques')
  const [fields, setFields] = useState(blank)
  const [editing, setEditing] = useState<Term | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  function edit(term: Term) {
    setEditing(term); setFields({ code: term.code, label: term.label, active: term.active, issuer: term.issuer ?? '', identifier: term.identifier ?? '', editionLabel: term.editionLabel ?? '', verifiedStatus: term.verifiedStatus ?? 'PENDING' }); setError(null); setMessage('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(null); setMessage('')
    try {
      await request('/admin/taxonomies/' + facet + (editing ? '/' + editing.id : ''), {
        method: editing ? 'PATCH' : 'POST', body: { ...fields, ...(editing ? { expectedRevision: editing.revision } : {}) },
      })
      await onSaved(); setEditing(null); setFields(blank()); setMessage('Classificação salva.')
    } catch (error) { setError(error) } finally { setPending(false) }
  }
  return <section aria-labelledby="taxonomy-title">
    <h2 id="taxonomy-title">Classificações técnicas</h2>
    <p>Vocabulários e curadoria continuam em validação. Não há termos científicos pré-carregados. Termos vinculados mantêm sua identidade; desativação preserva o histórico.</p>
    <label>Tipo de classificação<select value={facet} onChange={event => { setFacet(event.target.value as Facet); setEditing(null); setFields(blank()); setError(null); setMessage('') }}>{facets.map(type => <option key={type} value={type}>{labels[type]}</option>)}</select></label>
    <form onSubmit={submit} className="admin-form" aria-busy={pending}>
      <label>Código do termo<input value={fields.code} onChange={event => setFields({ ...fields, code: event.target.value })} required maxLength={60} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]*" /></label>
      <label>Nome do termo<input value={fields.label} onChange={event => setFields({ ...fields, label: event.target.value })} required maxLength={160} /></label>
      {facet === 'standards' && <>
        <label>Emissor<input value={fields.issuer} onChange={event => setFields({ ...fields, issuer: event.target.value })} required maxLength={120} /></label>
        <label>Identificador da norma<input value={fields.identifier} onChange={event => setFields({ ...fields, identifier: event.target.value })} required maxLength={120} /></label>
        <label>Edição da norma<input value={fields.editionLabel} onChange={event => setFields({ ...fields, editionLabel: event.target.value })} required maxLength={80} /></label>
        <label>Verificação da identificação<select value={fields.verifiedStatus} onChange={event => setFields({ ...fields, verifiedStatus: event.target.value as 'PENDING' | 'VERIFIED' })}><option value="PENDING">Pendente</option><option value="VERIFIED">Identificação e edição verificadas</option></select></label>
        <p>Verificar identificação não declara vigência regulatória ou permissão de reprodução.</p>
      </>}
      <label className="admin-check"><input type="checkbox" checked={fields.active} onChange={event => setFields({ ...fields, active: event.target.checked })} />Termo ativo para novas classificações</label>
      <div className="admin-actions"><button type="submit" disabled={pending}>{editing ? 'Salvar termo' : 'Cadastrar termo'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setFields(blank()) }}>Cancelar edição do termo</button>}</div>
      <AdminError error={error} />{message && <p role="status">{message}</p>}
    </form>
    <ul className="admin-list">{taxonomies[facet].map(term => <li key={term.id}>
      <span>{term.label} ({term.code}) — {term.active ? 'Ativo' : 'Inativo'}{term.verifiedStatus ? ' — ' + term.verifiedStatus : ''}</span>
      <button type="button" onClick={() => edit(term)} disabled={pending}>Editar {term.label}</button>
    </li>)}</ul>
    {taxonomies[facet].length === 0 && <p>Nenhum termo cadastrado nesta classificação.</p>}
  </section>
}
