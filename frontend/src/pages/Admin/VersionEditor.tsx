import AdminField from './AdminField'
import VersionAccess from './VersionAccess'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { facets, labels, toEditor } from './catalog.types'
import type { Contributor, Editor, Source, Taxonomies, Version } from './catalog.types'
import AdminError from './AdminError'

export default function VersionEditor({ version, taxonomies, onSaved, onDeleted, onReload }: {
  version: Version; taxonomies: Taxonomies; onSaved: (version: Version) => Promise<void>; onDeleted: () => Promise<void>; onReload: () => Promise<void>
}) {
  const { request } = useAuth()
  const [fields, setFields] = useState<Editor>(() => toEditor(version))
  const [reviewNote, setReviewNote] = useState('')
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const dirty = JSON.stringify(fields) !== JSON.stringify(toEditor(version))
  const readOnly = version.editorialStatus !== 'DRAFT'
  const changeSource = (index: number, key: keyof Source, value: string | boolean) => setFields(current => ({
    ...current, sources: current.sources.map((item, at) => at === index ? { ...item, [key]: value } : item),
  }))
  const changeContributor = (index: number, key: keyof Contributor, value: string) => setFields(current => ({
    ...current, contributors: current.contributors.map((item, at) => at === index ? { ...item, [key]: value } : item),
  }))
  async function save(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(null); setMessage('')
    try {
      const updated = await request<Version>('/admin/versions/' + version.id, { method: 'PATCH', body: { ...fields, expectedRevision: version.revision } })
      await onSaved(updated)
    } catch (error) { setError(error) } finally { setPending(false) }
  }
  async function publish() {
    setPending(true); setError(null); setMessage('')
    try {
      const updated = await request<Version>('/admin/versions/' + version.id + '/publish', { method: 'POST', body: { expectedRevision: version.revision, reviewNote, reviewAcknowledged } })
      await onSaved(updated)
    } catch (error) { setError(error) } finally { setPending(false) }
  }
  async function remove() {
    setPending(true); setError(null)
    try { await request('/admin/versions/' + version.id, { method: 'DELETE', body: { expectedRevision: version.revision } }); await onDeleted() }
    catch (error) { setError(error) } finally { setPending(false) }
  }
  return <section className="admin-editor" aria-labelledby="version-editor-title">
    <h3 id="version-editor-title">Versão {version.versionLabel} — {version.editorialStatus}</h3>
    <p>Revisão {version.revision}. Procedimento restrito à edição administrativa.</p>
    {readOnly && <p role="status">Conteúdo publicado é imutável. Crie outra versão para alterações.</p>}
    {readOnly && <VersionAccess key={version.id + ':' + version.revision} version={version} onSaved={onSaved} />}
    {version.reviewedBy && <div className="admin-review"><p>Revisão editorial por usuário {version.reviewedBy}, em {version.reviewedAt}; revisão de conteúdo {version.reviewedRevision}.</p><p>{version.reviewNote}</p></div>}
    <form className="admin-form" onSubmit={save} aria-busy={pending}>
      <fieldset disabled={pending || readOnly}>
        <legend>Prévia gratuita e conteúdo protegido</legend>
        <AdminField label={<>Título</>}><input value={fields.title} onChange={event => setFields({ ...fields, title: event.target.value })} maxLength={200} /></AdminField>
        <AdminField label={<>Resumo gratuito</>}><textarea value={fields.freeSummary} onChange={event => setFields({ ...fields, freeSummary: event.target.value })} maxLength={4000} /></AdminField>
        <AdminField label={<>Descrição pública</>}><textarea value={fields.publicDescription} onChange={event => setFields({ ...fields, publicDescription: event.target.value })} maxLength={8000} /></AdminField>
        <AdminField label={<>Descrição técnica completa</>}><textarea value={fields.fullDescription} onChange={event => setFields({ ...fields, fullDescription: event.target.value })} maxLength={16000} /></AdminField>
        <AdminField label={<>Procedimento completo</>}><textarea value={fields.fullProcedure} onChange={event => setFields({ ...fields, fullProcedure: event.target.value })} rows={8} maxLength={64000} /></AdminField>
        <p>Formato de texto simples. Marcação digitada não é executada como HTML. O procedimento não integra a prévia gratuita.</p>
        <AdminField label={<>Descrição das alterações</>}><textarea value={fields.changelog} onChange={event => setFields({ ...fields, changelog: event.target.value })} maxLength={2000} /></AdminField>
      </fieldset>
      <fieldset disabled={pending || readOnly}><legend>Sete classificações por versão</legend>
        <div className="admin-facets">{facets.map(facet => <fieldset key={facet}>
          <legend>{labels[facet]}</legend>
          {taxonomies[facet].map(term => <label className="admin-check" key={term.id}><input type="checkbox" checked={fields.classifications[facet].includes(term.id)}
            disabled={!term.active && !fields.classifications[facet].includes(term.id)}
            onChange={event => {
              const ids = event.target.checked ? [...fields.classifications[facet], term.id] : fields.classifications[facet].filter(id => id !== term.id)
              setFields({ ...fields, classifications: { ...fields.classifications, [facet]: ids }, notApplicable: { ...fields.notApplicable, [facet]: ids.length ? '' : fields.notApplicable[facet] } })
            }} />{term.label}{!term.active ? ' (inativo)' : ''}</label>)}
          {taxonomies[facet].length === 0 && <p>Cadastre termos em Classificações.</p>}
          {fields.classifications[facet].length === 0 && <AdminField label={<>Justificativa de não aplicabilidade — {labels[facet]}</>}><textarea value={fields.notApplicable[facet]} onChange={event => setFields({ ...fields, notApplicable: { ...fields.notApplicable, [facet]: event.target.value } })} maxLength={1000} /></AdminField>}
        </fieldset>)}</div>
      </fieldset>
      <fieldset disabled={pending || readOnly}><legend>Fontes e condições de uso</legend>
        <p>Registre origens reais e condições verificadas. Link público não concede autorização. Não invente referências nem permissões.</p>
        {fields.sources.map((source, index) => <fieldset key={index}><legend>Fonte {index + 1}</legend>
          <AdminField label={<>Referência {index + 1}</>}><textarea value={source.referenceText} onChange={event => changeSource(index, 'referenceText', event.target.value)} maxLength={4000} /></AdminField>
          <div className="admin-select-field"><label htmlFor={'source-type-' + version.id + '-' + index}>Tipo da fonte {index + 1}</label><select id={'source-type-' + version.id + '-' + index} value={source.sourceType} onChange={event => changeSource(index, 'sourceType', event.target.value)}><option value="REFERENCE">Referência externa</option><option value="ORIGINAL">Conteúdo original</option></select></div>
          <AdminField label={<>URL da fonte {index + 1}</>}><input type="url" value={source.canonicalUrl} onChange={event => changeSource(index, 'canonicalUrl', event.target.value)} maxLength={2000} /></AdminField>
          <AdminField label={<>Crédito do titular {index + 1}</>}><input value={source.ownerCredit} onChange={event => changeSource(index, 'ownerCredit', event.target.value)} maxLength={300} /></AdminField>
          <AdminField label={<>Edição da fonte {index + 1}</>}><input value={source.editionLabel} onChange={event => changeSource(index, 'editionLabel', event.target.value)} maxLength={120} /></AdminField>
          <AdminField label={<>Localizador {index + 1}</>}><input value={source.locator} onChange={event => changeSource(index, 'locator', event.target.value)} maxLength={1000} /></AdminField>
          <AdminField label={<>Condições de uso {index + 1}</>}><textarea value={source.usageConditions} onChange={event => changeSource(index, 'usageConditions', event.target.value)} maxLength={4000} /></AdminField>
          <AdminField label={<>Evidência privada {index + 1}</>}><textarea value={source.permissionEvidence} onChange={event => changeSource(index, 'permissionEvidence', event.target.value)} maxLength={2000} /></AdminField>
          <div className="admin-select-field"><label htmlFor={'source-permission-' + version.id + '-' + index}>Situação da condição de uso {index + 1}</label><select id={'source-permission-' + version.id + '-' + index} value={source.permissionStatus} onChange={event => changeSource(index, 'permissionStatus', event.target.value)}><option value="PENDING">Pendente</option><option value="APPROVED">Verificada e permitida</option><option value="REJECTED">Verificada e recusada</option></select></div>
          <label className="admin-check"><input type="checkbox" checked={source.permissionAcknowledged} onChange={event => changeSource(index, 'permissionAcknowledged', event.target.checked)} />Conferi a condição de uso e a evidência da fonte {index + 1}</label>
          <button type="button" onClick={() => setFields({ ...fields, sources: fields.sources.filter((_, at) => at !== index) })}>Remover fonte {index + 1}</button>
        </fieldset>)}
        <button type="button" onClick={() => setFields({ ...fields, sources: [...fields.sources, { referenceText: '', sourceType: 'REFERENCE', canonicalUrl: '', ownerCredit: '', editionLabel: '', locator: '', usageConditions: '', permissionStatus: 'PENDING', permissionEvidence: '', permissionAcknowledged: false }] })} disabled={fields.sources.length >= 20}>Adicionar fonte</button>
      </fieldset>
      <fieldset disabled={pending || readOnly}><legend>Autoria e curadoria</legend>
        {fields.contributors.map((item, index) => <fieldset key={index}><legend>Contribuição {index + 1}</legend>
          <AdminField label={<>Nome da contribuição {index + 1}</>}><input value={item.displayName} onChange={event => changeContributor(index, 'displayName', event.target.value)} maxLength={160} required /></AdminField>
          <div className="admin-select-field"><label htmlFor={'contributor-type-' + version.id + '-' + index}>Tipo da contribuição {index + 1}</label><select id={'contributor-type-' + version.id + '-' + index} value={item.contributorType} onChange={event => changeContributor(index, 'contributorType', event.target.value)}><option value="PERSON">Pessoa</option><option value="ORGANIZATION">Organização</option></select></div>
          <div className="admin-select-field"><label htmlFor={'contributor-role-' + version.id + '-' + index}>Papel da contribuição {index + 1}</label><select id={'contributor-role-' + version.id + '-' + index} value={item.role} onChange={event => changeContributor(index, 'role', event.target.value)}><option value="AUTHOR">Autoria</option><option value="CURATOR">Curadoria</option></select></div>
          <AdminField label={<>Identificação da contribuição {index + 1}</>}><input value={item.reference} onChange={event => changeContributor(index, 'reference', event.target.value)} maxLength={1000} /></AdminField>
          <button type="button" onClick={() => setFields({ ...fields, contributors: fields.contributors.filter((_, at) => at !== index) })}>Remover contribuição {index + 1}</button>
        </fieldset>)}
        <button type="button" disabled={fields.contributors.length >= 20} onClick={() => setFields({ ...fields, contributors: [...fields.contributors, { displayName: '', contributorType: 'PERSON', reference: '', role: fields.contributors.some(item => item.role === 'AUTHOR') ? 'CURATOR' : 'AUTHOR' }] })}>Adicionar contribuição</button>
      </fieldset>
      {!readOnly && <button className="admin-primary" type="submit" disabled={pending}>Salvar rascunho</button>}
    </form>
    {!readOnly && <fieldset className="admin-publication" disabled={pending}><legend>Publicação com revisão explícita</legend>
      <p>Salve o rascunho antes de publicar. A revisão se aplica à versão salva, não às alterações locais.</p>
      {dirty && <p role="status">Há alterações locais não salvas. Salve o rascunho para revisar e publicar.</p>}
      <AdminField label={<>Nota da revisão</>}><textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} maxLength={2000} /></AdminField>
      <label className="admin-check"><input type="checkbox" checked={reviewAcknowledged} onChange={event => setReviewAcknowledged(event.target.checked)} />Revisei o conteúdo salvo, autoria, classificações e condições de uso.</label>
      <button className="admin-primary" type="button" onClick={() => { void publish() }} disabled={dirty || !reviewAcknowledged || !reviewNote.trim()}>Publicar versão revisada</button>
    </fieldset>}
    <div className="admin-actions">
      <button type="button" disabled={pending} onClick={() => { setMessage(''); void onReload().catch(setError) }}>Descartar edição local e recarregar versão</button>
      {!readOnly && <button type="button" disabled={pending} onClick={() => { void remove() }}>Excluir rascunho</button>}
    </div>
    <AdminError error={error} />{message && <p role="status">{message}</p>}
  </section>
}
