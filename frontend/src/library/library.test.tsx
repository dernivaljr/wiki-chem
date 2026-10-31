import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { demoLibraryContent, demoLibraryEntry } from '../test/library-fixtures'
import { failure, fixtureSession, mockFetch, success } from '../test/mockApi'

function open(path = '/biblioteca/10') {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

function mocks() {
  mockFetch().mockImplementation(async url => {
    if (url === '/api/v1/auth/session') return success(fixtureSession())
    if (url === '/api/v1/cart') return success({ revision: 1, items: [], currency: 'BRL', totalCentavos: '0', unavailableCount: 0 })
    if (String(url).includes('/versions')) {
      return new Response(
        JSON.stringify({
          data: [
            { id: '20', versionLabel: 'v1', title: 'DEMO original', original: true, current: false, publishedAt: new Date().toISOString() },
            { id: '21', versionLabel: 'v2', title: 'DEMO original', original: false, current: true, publishedAt: new Date().toISOString() },
          ],
          total: 2,
          page: 1,
          pageSize: 20,
        }),
      )
    }
    if (String(url).includes('/content')) return success(demoLibraryContent(String(url).includes('versionId=20') ? '20' : '21'))
    return success(demoLibraryEntry())
  })
}

describe('biblioteca e leitura autorizada estruturada na interface', () => {
  it('biblioteca vazia não simula aquisição', async () => {
    mockFetch().mockImplementation(async url =>
      url === '/api/v1/auth/session'
        ? success(fixtureSession())
        : new Response(JSON.stringify({ data: [], total: 0, page: 1, pageSize: 20 })),
    )
    open('/biblioteca')
    expect(await screen.findByText(/Sua biblioteca está vazia/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
    expect(screen.queryByText(/FULL_DEMO/)).not.toBeInTheDocument()
  })

  it('lista versão original/atual e estado, sem procedimento', async () => {
    mockFetch().mockImplementation(async url =>
      url === '/api/v1/auth/session'
        ? success(fixtureSession())
        : new Response(JSON.stringify({ data: [demoLibraryEntry()], total: 1, page: 1, pageSize: 20 })),
    )
    open('/biblioteca')
    expect(await screen.findByText('Versão adquirida: v1 · Atual: v2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DEMO original' })).toHaveAttribute('href', '/biblioteca/10')
    expect(screen.queryByText(/FULL_DEMO/)).not.toBeInTheDocument()
  })

  it('lê atual e histórico escolhido explicitamente; formata seções técnicas sem executar HTML', async () => {
    mockFetch().mockImplementation(async url => {
      if (url === '/api/v1/auth/session') return success(fixtureSession())
      if (url === '/api/v1/cart') return success({ revision: 1, items: [], currency: 'BRL', totalCentavos: '0', unavailableCount: 0 })
      if (String(url).includes('/versions')) {
        return new Response(
          JSON.stringify({
            data: [
              { id: '20', versionLabel: 'v1', title: 'Guia EPA 300.0', original: true, current: false, publishedAt: new Date().toISOString() },
              { id: '21', versionLabel: 'v2', title: 'Guia EPA 300.0', original: false, current: true, publishedAt: new Date().toISOString() },
            ],
            total: 2,
            page: 1,
            pageSize: 20,
          }),
        )
      }
      if (String(url).includes('/content')) {
        const base = demoLibraryContent(String(url).includes('versionId=20') ? '20' : '21')
        return success({
          ...base,
          fullDescription: '1. Escopo analítico\n- Matriz aquosa filtrada\n' + base.fullDescription,
          fullProcedure: '2. Calibração\nEquação: A = e * b * C\nNota: Guia original.\n' + base.fullProcedure,
        })
      }
      return success(demoLibraryEntry())
    })
    open()
    expect(await screen.findByText(/FULL_DEMO_LIBRARY_21/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: '1. Escopo analítico' })).toBeInTheDocument()
    expect(screen.getByText('Matriz aquosa filtrada')).toBeInTheDocument()
    expect(screen.getByText('Equação: A = e * b * C')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('Selecionar versão histórica'), '20')
    expect(await screen.findByText(/FULL_DEMO_LIBRARY_20/)).toBeInTheDocument()
    expect(screen.queryByText(/FULL_DEMO_LIBRARY_21/)).not.toBeInTheDocument()
    expect(mockFetch().mock.calls.some(([url]) => url === '/api/v1/library/10/content?versionId=20')).toBe(true)
    expect(localStorage.getItem('FULL_DEMO_LIBRARY_20')).toBeNull()
  })

  it('atual suspensa não seleciona histórico automaticamente e permite escolha explícita', async () => {
    mocks()
    const original = mockFetch().getMockImplementation()!
    mockFetch().mockImplementation(async (url, options) =>
      url === '/api/v1/library/10/content' ? failure(403, 'CONTENT_SUSPENDED', 'Versão atual suspensa.') : original(url, options),
    )
    open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Versão atual suspensa')
    expect(mockFetch().mock.calls.some(([url]) => String(url).includes('/content?'))).toBe(false)
    await userEvent.selectOptions(screen.getByLabelText('Selecionar versão histórica'), '20')
    expect(await screen.findByText(/FULL_DEMO_LIBRARY_20/)).toBeInTheDocument()
  })

  it('falha ao trocar versão remove o conteúdo anterior e não mostra resultado obsoleto', async () => {
    mocks()
    const original = mockFetch().getMockImplementation()!
    mockFetch().mockImplementation(async (url, options) =>
      String(url).includes('/content?versionId=20') ? failure(403, 'CONTENT_UNAVAILABLE', 'Acesso indisponível.') : original(url, options),
    )
    open()
    await screen.findByText(/FULL_DEMO_LIBRARY_21/)
    await userEvent.selectOptions(screen.getByLabelText('Selecionar versão histórica'), '20')
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso indisponível')
    expect(screen.queryByText(/FULL_DEMO/)).not.toBeInTheDocument()
  })

  it('revogação na releitura remove procedimento e não presume acesso pelo papel', async () => {
    mocks()
    open()
    await screen.findByText(/FULL_DEMO_LIBRARY_21/)
    const original = mockFetch().getMockImplementation()!
    mockFetch().mockImplementation(async (url, options) =>
      String(url).includes('/content') ? failure(403, 'ENTITLEMENT_REVOKED', 'Direito revogado.') : original(url, options),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Verificar acesso novamente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Direito revogado')
    expect(screen.queryByText(/FULL_DEMO/)).not.toBeInTheDocument()
  })

  it('sessão expirada retira leitor e retorna ao login', async () => {
    mocks()
    open()
    await screen.findByText(/FULL_DEMO_LIBRARY_21/)
    mockFetch().mockImplementation(async () => failure())
    await userEvent.click(screen.getByRole('button', { name: 'Verificar acesso novamente' }))
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
    expect(screen.queryByText(/FULL_DEMO/)).not.toBeInTheDocument()
  })

  it('falha de rede na leitura não mantém conteúdo protegido', async () => {
    mocks()
    open()
    await screen.findByText(/FULL_DEMO_LIBRARY_21/)
    const original = mockFetch().getMockImplementation()!
    mockFetch().mockImplementation(async (url, options) => {
      if (String(url).includes('/content')) throw new TypeError('offline')
      return original(url, options)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Verificar acesso novamente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível acessar')
    expect(screen.queryByText(/FULL_DEMO/)).not.toBeInTheDocument()
  })

  it('resposta antiga de versão não reaparece após seleção mais recente', async () => {
    mocks()
    const original = mockFetch().getMockImplementation()!
    let deliver: (response: Response) => void = () => {}
    mockFetch().mockImplementation(async (url, options) =>
      url === '/api/v1/library/10/content' ? new Promise<Response>(resolve => { deliver = resolve }) : original(url, options),
    )
    open()
    await screen.findByLabelText('Selecionar versão histórica')
    await userEvent.selectOptions(screen.getByLabelText('Selecionar versão histórica'), '20')
    await screen.findByText(/FULL_DEMO_LIBRARY_20/)
    await act(async () => { deliver(success(demoLibraryContent('21'))) })
    await waitFor(() => expect(screen.queryByText(/FULL_DEMO_LIBRARY_21/)).not.toBeInTheDocument())
  })

  it('direito revogado em metadados não inicia leitura integral', async () => {
    mockFetch().mockImplementation(async url =>
      success(url === '/api/v1/auth/session' ? fixtureSession() : { ...demoLibraryEntry(), entitlementStatus: 'REVOKED', accessState: 'ENTITLEMENT_REVOKED' }),
    )
    open()
    expect(await screen.findByText('Direito de acesso revogado')).toBeInTheDocument()
    expect(mockFetch().mock.calls.some(([url]) => String(url).includes('/content'))).toBe(false)
  })
})
