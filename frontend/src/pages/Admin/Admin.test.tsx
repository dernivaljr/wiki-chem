import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../../App'
import AuthProvider from '../../auth/AuthProvider'
import { failure, fixtureSession, fixtureUser, mockFetch, success } from '../../test/mockApi'
import VersionEditor from './VersionEditor'
import type { Taxonomies, Version } from './catalog.types'

const taxonomies: Taxonomies = { techniques: [{ id: '1', code: 'demo', label: 'Técnica DEMO', active: true, revision: 1 }], technologies: [], equipment: [], matrices: [], analytes: [], standards: [], segments: [] }
const draft = (): Version => ({
  id: '1', methodologyId: '1', versionLabel: 'v1', editorialStatus: 'DRAFT', revision: 1, title: '', freeSummary: '', publicDescription: '', fullDescription: '', fullProcedure: '',
  changelog: '', classifications: { techniques: [], technologies: [], equipment: [], matrices: [], analytes: [], standards: [], segments: [] },
  notApplicable: { techniques: '', technologies: '', equipment: '', matrices: '', analytes: '', standards: '', segments: '' },
  sources: [], contributors: [], publishedAt: null, reviewedBy: null, reviewedAt: null, reviewedRevision: null, reviewNote: null,
})
const adminSession = () => ({ ...fixtureSession(), user: { ...fixtureUser, role: 'ADMIN' } })
function editor(version = draft(), saved = vi.fn().mockResolvedValue(undefined)) {
  render(<MemoryRouter><AuthProvider><VersionEditor version={version} taxonomies={taxonomies} onSaved={saved} onDeleted={async () => {}} onReload={async () => {}} /></AuthProvider></MemoryRouter>)
  return saved
}
describe('administração editorial na interface', () => {
  it('CUSTOMER não monta formulário nem consulta endpoints administrativos', async () => {
    mockFetch().mockImplementation(async () => success(fixtureSession()))
    render(<MemoryRouter initialEntries={['/admin']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Acesso restrito' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Procedimento completo')).not.toBeInTheDocument()
    expect(mockFetch().mock.calls.filter(([url]) => String(url).includes('/admin/'))).toHaveLength(0)
  })
  it('visitante é encaminhado ao acesso para a rota administrativa', async () => {
    render(<MemoryRouter initialEntries={['/admin']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
  })
  it('ADMIN vê listagem vazia e opções funcionais sem resultados fictícios', async () => {
    mockFetch().mockImplementation(async url => {
      if (url === '/api/v1/auth/session') return success(adminSession())
      if (url === '/api/v1/admin/taxonomies') return success(taxonomies)
      return new Response(JSON.stringify({ data: [], page: 1, pageSize: 20, total: 0 }))
    })
    render(<MemoryRouter initialEntries={['/admin']}><App /></MemoryRouter>)
    expect(await screen.findByText('Nenhuma metodologia cadastrada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Administração' })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('button', { name: 'Criar metodologia' })).toBeEnabled()
  })
  it('grava conteúdo com CSRF, revisão esperada e sem metadados de revisor forjados', async () => {
    const saved = vi.fn().mockResolvedValue(undefined)
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success(adminSession())
      expect(options?.method).toBe('PATCH')
      expect(options?.headers).toMatchObject({ 'X-CSRF-Token': 'a'.repeat(64) })
      const payload = JSON.parse(String(options?.body))
      expect(payload).toMatchObject({ expectedRevision: 1, title: 'DEMO', fullProcedure: 'DEMO protegido' })
      expect(payload).not.toHaveProperty('reviewedBy')
      return success({ ...draft(), ...payload, revision: 2 })
    })
    editor(draft(), saved)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Título', { exact: true }), 'DEMO')
    await user.type(screen.getByLabelText('Procedimento completo', { exact: true }), 'DEMO protegido')
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
  })
  it('publicação fica desabilitada com alterações locais não salvas', async () => {
    mockFetch().mockImplementation(async () => success(adminSession()))
    editor()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nota da revisão'), 'Revisto DEMO')
    await user.click(screen.getByRole('checkbox', { name: /Revisei o conteúdo salvo/ }))
    expect(screen.getByRole('button', { name: 'Publicar versão revisada' })).toBeEnabled()
    await user.type(screen.getByLabelText('Título', { exact: true }), 'Mudança local')
    expect(screen.getByRole('button', { name: 'Publicar versão revisada' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('não salvas')
  })
  it('conflito de revisão não declara gravação nem sobrescreve automaticamente', async () => {
    mockFetch().mockImplementation(async url => url === '/api/v1/auth/session' ? success(adminSession()) : failure(409, 'REVISION_CONFLICT', 'Recarregue antes de salvar.'))
    const saved = editor()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Recarregue antes de salvar.')
    expect(saved).not.toHaveBeenCalled()
  })
  it('versão publicada mostra texto simples e bloqueia edição', async () => {
    mockFetch().mockImplementation(async () => success(adminSession()))
    editor({ ...draft(), editorialStatus: 'PUBLISHED', fullProcedure: '<script>DEMO apenas texto</script>' })
    expect(screen.getByLabelText('Procedimento completo', { exact: true })).toBeDisabled()
    expect(screen.getByLabelText('Procedimento completo', { exact: true })).toHaveValue('<script>DEMO apenas texto</script>')
    expect(document.querySelector('.admin-editor script')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar versão revisada' })).not.toBeInTheDocument()
  })
  it('seleciona classificação e registra fontes/autoria sem preencher permissões fictícias', async () => {
    mockFetch().mockImplementation(async () => success(adminSession()))
    editor()
    const user = userEvent.setup()
    await user.click(screen.getByRole('checkbox', { name: 'Técnica DEMO' }))
    expect(screen.queryByLabelText('Justificativa de não aplicabilidade — Técnicas')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Adicionar fonte' }))
    expect(screen.getByLabelText('Situação da condição de uso 1')).toHaveValue('PENDING')
    expect(screen.getByLabelText('Evidência privada 1')).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: /Conferi a condição/ })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Adicionar contribuição' }))
    expect(screen.getByLabelText('Nome da contribuição 1')).toHaveValue('')
  })
  it('seletores de fonte e contribuição têm rótulos exatos sem o texto das opções', async () => {
    mockFetch().mockImplementation(async () => success(adminSession()))
    editor()
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar fonte' }))
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar contribuição' }))
    expect(screen.getByLabelText('Tipo da fonte 1', { exact: true })).toHaveAccessibleName('Tipo da fonte 1')
    expect(screen.getByLabelText('Situação da condição de uso 1', { exact: true })).toHaveAccessibleName('Situação da condição de uso 1')
    expect(screen.getByLabelText('Tipo da contribuição 1', { exact: true })).toHaveAccessibleName('Tipo da contribuição 1')
    expect(screen.getByLabelText('Papel da contribuição 1', { exact: true })).toHaveAccessibleName('Papel da contribuição 1')
  })

})
