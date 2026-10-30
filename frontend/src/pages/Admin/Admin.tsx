import OfferSection from './OfferManager'
import AdminField from './AdminField'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { Methodology, Page, Taxonomies, Version, VersionSummary } from './catalog.types'
import AdminError from './AdminError'
import TaxonomyManager from './TaxonomyManager'
import VersionEditor from './VersionEditor'
import './Admin.css'

export default function Admin() {
  const { request } = useAuth()
  const [tab, setTab] = useState<'methods' | 'terms'>('methods')
  const [taxonomies, setTaxonomies] = useState<Taxonomies | null>(null)
  const [methods, setMethods] = useState<Page<Methodology> | null>(null)
  const [method, setMethod] = useState<Methodology | null>(null)
  const [versions, setVersions] = useState<Page<VersionSummary> | null>(null)
  const [version, setVersion] = useState<Version | null>(null)
  const [slug, setSlug] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [versionLabel, setVersionLabel] = useState('')
  const [copyVersion, setCopyVersion] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const selection = useRef(0)
  const loadTerms = useCallback(async () => { setTaxonomies(await request<Taxonomies>('/admin/taxonomies')) }, [request])
  const loadMethods = useCallback(async (page = 1) => {
    setMethods(await request<Page<Methodology>>('/admin/methodologies?page=' + page, { includeMeta: true }))
  }, [request])
  useEffect(() => {
    let active = true
    Promise.all([request<Taxonomies>('/admin/taxonomies'), request<Page<Methodology>>('/admin/methodologies', { includeMeta: true })])
      .then(([terms, list]) => { if (active) { setTaxonomies(terms); setMethods(list) } })
      .catch(error => { if (active) setError(error) })
    return () => { active = false }
  }, [request])

  async function selectMethod(id: string, page = 1) {
    const current = ++selection.current
    setPending(true); setError(null); setVersion(null); setMessage('')
    try {
      const [meta, history] = await Promise.all([
        request<Methodology>('/admin/methodologies/' + id),
        request<Page<VersionSummary>>('/admin/methodologies/' + id + '/versions?page=' + page, { includeMeta: true }),
      ])
      if (current !== selection.current) return
      setMethod(meta); setSlug(meta.slug); setVersions(history); setVersionLabel(''); setCopyVersion(false)
    } catch (error) { if (current === selection.current) setError(error) } finally { if (current === selection.current) setPending(false) }
  }
  async function selectVersion(id: string) {
    const current = ++selection.current
    setPending(true); setError(null); setMessage(''); setVersion(null)
    try {
      const detail = await request<Version>('/admin/versions/' + id)
      if (current === selection.current) setVersion(detail)
    } catch (error) { if (current === selection.current) setError(error) } finally { if (current === selection.current) setPending(false) }
  }
  async function create(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(null); setMessage('')
    try {
      const created = await request<Methodology>('/admin/methodologies', { method: 'POST', body: { slug: newSlug } })
      await loadMethods(); setNewSlug(''); await selectMethod(created.id); setMessage('Metodologia criada. Cadastre a primeira versão.')
    } catch (error) { setError(error) } finally { setPending(false) }
  }
  async function changeMethod(body: { slug?: string; retired?: boolean }) {
    if (!method) return
    setPending(true); setError(null)
    try {
      const updated = await request<Methodology>('/admin/methodologies/' + method.id, { method: 'PATCH', body: { expectedRevision: method.revision, ...body } })
      setMethod(updated); setSlug(updated.slug); await loadMethods(methods?.page); setMessage('Metodologia atualizada.')
    } catch (error) { setError(error) } finally { setPending(false) }
  }
  async function removeMethod() {
    if (!method) return
    setPending(true); setError(null)
    try {
      await request('/admin/methodologies/' + method.id, { method: 'DELETE', body: { expectedRevision: method.revision } })
      setMethod(null); setVersions(null); setVersion(null); await loadMethods(); setMessage('Metodologia removida da listagem. Histórico técnico preservado.')
    } catch (error) { setError(error) } finally { setPending(false) }
  }
  async function createVersion(event: FormEvent) {
    event.preventDefault()
    if (!method) return
    setPending(true); setError(null); setMessage('')
    try {
      const created = await request<Version>('/admin/methodologies/' + method.id + '/versions', { method: 'POST', body: { versionLabel, ...(copyVersion && version ? { basedOnVersionId: version.id } : {}) } })
      const history = await request<Page<VersionSummary>>('/admin/methodologies/' + method.id + '/versions', { includeMeta: true })
      setVersions(history); setVersion(created); setVersionLabel(''); setCopyVersion(false); setMessage('Rascunho criado. Condições de uso copiadas precisam de nova conferência.')
    } catch (error) { setError(error) } finally { setPending(false) }
  }
  async function saved(updated: Version) {
    setVersion(updated)
    if (method) {
      const [meta, history] = await Promise.all([request<Methodology>('/admin/methodologies/' + method.id), request<Page<VersionSummary>>('/admin/methodologies/' + method.id + '/versions?page=' + (versions?.page ?? 1), { includeMeta: true })])
      setMethod(meta); setVersions(history)
    }
    setMessage(updated.editorialStatus === 'DRAFT' ? 'Rascunho salvo.' : 'Versão publicada com revisão registrada.')
  }
  return <main className="admin-page">
    <div className="admin-container">
      <h1>Administração do catálogo</h1>
      <p>Gerencie conteúdo editorial, classificações e ofertas. Aquisições são demonstrativas, sem cobrança.</p>
      <nav className="admin-actions" aria-label="Seções administrativas">
        <button type="button" aria-pressed={tab === 'methods'} onClick={() => setTab('methods')}>Metodologias e versões</button>
        <button type="button" aria-pressed={tab === 'terms'} onClick={() => setTab('terms')}>Classificações</button>
      </nav>
      <AdminError error={error} />{message && <p role="status">{message}</p>}{pending && <p role="status">Processando catálogo…</p>}
      {!taxonomies || !methods ? <p role="status">Carregando catálogo…</p> : tab === 'terms' ? <TaxonomyManager taxonomies={taxonomies} onSaved={loadTerms} /> : <>
        <section aria-labelledby="new-method-title"><h2 id="new-method-title">Cadastrar metodologia</h2>
          <form className="admin-inline" onSubmit={create}>
            <AdminField label={<>Identificador da metodologia</>}><input value={newSlug} onChange={event => setNewSlug(event.target.value)} required pattern="[a-zA-Z0-9][a-zA-Z0-9-]*" maxLength={80} /></AdminField>
            <button type="submit" disabled={pending}>Criar metodologia</button>
          </form>
        </section>
        <div className="admin-layout">
          <section aria-labelledby="method-list-title"><h2 id="method-list-title">Metodologias</h2>
            <ul className="admin-list">{methods.data.map(item => <li key={item.id}><button type="button" aria-pressed={method?.id === item.id} disabled={pending} onClick={() => { void selectMethod(item.id) }}>{item.slug} — {item.lifecycle}</button></li>)}</ul>
            {methods.total === 0 && <p>Nenhuma metodologia cadastrada.</p>}
            <div className="admin-actions">
              <button disabled={pending || methods.page === 1} onClick={() => { void loadMethods(methods.page - 1).catch(setError) }}>Metodologias anteriores</button>
              <span>Página {methods.page}</span>
              <button disabled={pending || methods.page * methods.pageSize >= methods.total} onClick={() => { void loadMethods(methods.page + 1).catch(setError) }}>Próximas metodologias</button>
            </div>
          </section>
          <div>{method && <section aria-labelledby="selected-method-title">
            <h2 id="selected-method-title">{method.slug}</h2><p>Estado: {method.lifecycle}. Revisão {method.revision}.</p>
            <form className="admin-inline" onSubmit={event => { event.preventDefault(); void changeMethod({ slug }) }}>
              <AdminField label={<>Editar identificador</>}><input value={slug} readOnly={Boolean(method.currentPublishedVersionId)} onChange={event => setSlug(event.target.value)} required maxLength={80} pattern="[a-zA-Z0-9][a-zA-Z0-9-]*" /></AdminField>
              <button type="submit" disabled={pending || Boolean(method.currentPublishedVersionId)}>Salvar identificador</button>
            </form>
            <div className="admin-actions">
              <button disabled={pending} onClick={() => { void changeMethod({ retired: method.lifecycle !== 'RETIRED' }) }}>{method.lifecycle === 'RETIRED' ? 'Restaurar metodologia' : 'Arquivar metodologia'}</button>
              {!method.currentPublishedVersionId && <button disabled={pending} onClick={() => { void removeMethod() }}>Excluir metodologia sem publicação</button>}
            </div>
            <h3>Histórico de versões</h3>
            <ul className="admin-list">{versions?.data.map(item => <li key={item.id}><button type="button" disabled={pending} aria-pressed={version?.id === item.id} onClick={() => { void selectVersion(item.id) }}>{item.versionLabel} — {item.editorialStatus}{item.title ? ' — ' + item.title : ''}</button></li>)}</ul>
            {versions && <div className="admin-actions">
              <button disabled={pending || versions.page === 1} onClick={() => { void selectMethod(method.id, versions.page - 1) }}>Versões anteriores</button>
              <span>Página {versions.page}</span>
              <button disabled={pending || versions.page * versions.pageSize >= versions.total} onClick={() => { void selectMethod(method.id, versions.page + 1) }}>Próximas versões</button>
            </div>}
            <form onSubmit={createVersion} className="admin-form">
              <AdminField label={<>Identificador da nova versão</>}><input value={versionLabel} onChange={event => setVersionLabel(event.target.value)} required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]*" maxLength={40} /></AdminField>
              {version && <label className="admin-check"><input type="checkbox" checked={copyVersion} onChange={event => setCopyVersion(event.target.checked)} />Copiar a versão selecionada; condições de uso voltarão a pendentes</label>}
              <button type="submit" disabled={pending}>Criar rascunho</button>
            </form>
          </section>}
          {method && <OfferSection key={method.id + ":" + method.revision} methodologyId={method.id} />}
          {version && <VersionEditor key={version.id + ':' + version.revision} version={version} taxonomies={taxonomies} onSaved={saved}
            onReload={() => selectVersion(version.id)}
            onDeleted={async () => { if (method) await selectMethod(method.id); setMessage('Rascunho removido da listagem.') }} />}
          </div>
        </div>
      </>}
    </div>
  </main>
}
