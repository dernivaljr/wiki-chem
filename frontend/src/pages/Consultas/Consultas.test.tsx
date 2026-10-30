import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { failure, fixtureSession, mockFetch, success } from '../../test/mockApi'
import { facets, labels } from '../../catalog/types'
import type { Page, Preview, Taxonomies } from '../../catalog/types'

const terms = Object.fromEntries(facets.map(facet => [facet, ['1', '2'].map(id => ({ id, code: 'demo-' + id, label: labels[facet] + ' DEMO ' + id, active: true, revision: 1, ...(facet === 'standards' ? { issuer: 'Emissor DEMO', identifier: id, editionLabel: 'DEMO' } : {}) }))])) as Taxonomies
const preview = (title = 'DEMO Água'): Preview => ({ owned: false, offer: null, purchasable: false, id: '10', versionId: '20', versionLabel: 'v2', title, freeSummary: 'Resumo gratuito original DEMO.', publicDescription: 'Descrição gratuita DEMO.', technicalMetadata: terms, references: [{ referenceText: 'Origem original DEMO da suíte', sourceType: 'ORIGINAL', ownerCredit: 'Autoria DEMO', editionLabel: 'DEMO', locator: 'Fixture original', canonicalUrl: '' }], contributors: [{ displayName: 'Equipe DEMO', contributorType: 'ORGANIZATION', reference: 'Fixture', role: 'CURATOR' }] })
const page = (data = [preview()], meta = {}): Page<Preview> => ({ data, total: data.length, page: 1, pageSize: 20, ...meta })
const list = (data = page()) => new Response(JSON.stringify(data))
function Location() { const location = useLocation(); return <div data-testid="location">{location.pathname + location.search}</div> }
function open(path = '/consultas') { render(<MemoryRouter initialEntries={[path]}><App /><Location /></MemoryRouter>) }
function mock(handler?: (url: string) => Response | Promise<Response>) {
  mockFetch().mockImplementation(async url => {
    if (url === '/api/v1/auth/session') return success(fixtureSession())
    if (url === '/api/v1/taxonomies') return success(terms)
    if (handler) return handler(String(url))
    return String(url).includes('/methodologies/') ? success(preview()) : list()
  })
}

describe('pesquisa React integrada aos contratos públicos', () => {
  it('carrega prévias reais do contrato e sete filtros sem inventar preço ou acesso pago', async () => {
    mock(); open()
    expect(await screen.findByRole('link', { name: 'DEMO Água' })).toBeInTheDocument()
    for (const facet of facets) expect(screen.getByRole('group', { name: labels[facet] })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Termo de consulta' })).toBeEnabled()
    expect(screen.getByText('Oferta comercial ainda não disponível.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /comprar/i })).not.toBeInTheDocument()
  })
  it('combina múltiplos valores, aplica URL, remove e limpa filtros', async () => {
    mock(); open(); const user = userEvent.setup()
    await screen.findByRole('link', { name: 'DEMO Água' })
    for (const facet of ['analytes', 'matrices'] as const) for (const input of within(screen.getByRole('group', { name: labels[facet] })).getAllByRole('checkbox')) await user.click(input)
    await user.type(screen.getByRole('searchbox'), 'água Fe²⁺')
    await user.selectOptions(screen.getByLabelText('Ordenação'), 'updated_desc')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('analyteIds=1&analyteIds=2'))
    expect(screen.getByTestId('location')).toHaveTextContent('matrixIds=1&matrixIds=2')
    await user.click(await screen.findByRole('button', { name: /Remover Analitos: Analitos DEMO 1/ }))
    await waitFor(() => expect(screen.getByTestId('location').textContent).not.toContain('analyteIds=1'))
    await user.click(screen.getByRole('button', { name: 'Limpar pesquisa e filtros' }))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/consultas$/)
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })
  it('restaura URL, pagina, preserva ordenação e volta do detalhe à consulta', async () => {
    mock(url => url.includes('/methodologies/') ? success(preview()) : list(page([preview()], { total: 3, page: new URL(url, 'http://test').searchParams.get('page') === '2' ? 2 : 1, pageSize: 1 })))
    open('/consultas?q=agua&analyteIds=1&pageSize=1&sort=updated_desc')
    await screen.findByRole('link', { name: 'DEMO Água' })
    expect(screen.getByRole('searchbox')).toHaveValue('agua')
    expect(within(screen.getByRole('group', { name: 'Analitos' })).getAllByRole('checkbox')[0]).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=2'))
    await userEvent.click(await screen.findByRole('link', { name: 'DEMO Água' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'DEMO Água' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Descrição gratuita' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Voltar à pesquisa' }))
    await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue('agua'))
    expect(screen.getByTestId('location')).toHaveTextContent('page=2')
  })
  it('informa vazio sem construir resultados substitutos', async () => {
    mock(() => list(page([]))); open('/consultas?q=inexistente')
    expect(await screen.findByText(/Nenhuma metodologia encontrada/)).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('inexistente')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
  it('não mantém resultados anteriores durante carregamento nem aceita resposta obsoleta', async () => {
    let resolve: ((response: Response) => void) | undefined
    mock(url => url.includes('q=novo') ? list(page([preview('DEMO novo')])) : new Promise<Response>(done => { resolve = done }))
    open('/consultas?q=antigo')
    expect(await screen.findByText('Carregando metodologias…')).toBeInTheDocument()
    await waitFor(() => expect(resolve).toBeTypeOf('function'))
    const user = userEvent.setup(); await user.clear(screen.getByRole('searchbox')); await user.type(screen.getByRole('searchbox'), 'novo'); await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    expect(await screen.findByRole('link', { name: 'DEMO novo' })).toBeInTheDocument()
    await act(async () => { resolve?.(list(page([preview('DEMO antigo')]))); await Promise.resolve() })
    expect(screen.queryByRole('link', { name: 'DEMO antigo' })).not.toBeInTheDocument()
  })
  it('trata falha de rede e repete somente a leitura', async () => {
    let fail = true
    mock(() => { if (fail) throw new TypeError('offline'); return list() })
    open(); expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível acessar o serviço')
    fail = false; await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('link', { name: 'DEMO Água' })).toBeInTheDocument()
    expect(mockFetch().mock.calls.filter(([, options]) => options?.method && options.method !== 'GET')).toHaveLength(0)
  })
  it('sessão expirada remove resultados e encaminha ao acesso', async () => {
    mock(() => failure()); open('/consultas?q=agua')
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou')
    expect(screen.getByTestId('location')).toHaveTextContent('returnTo=%2Fconsultas%3Fq%3Dagua')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
  it('recusa URL inválida sem fazer consulta e permite recuperação', async () => {
    mock(); open('/consultas?sort=price_asc')
    expect(await screen.findByRole('alert')).toHaveTextContent('Parâmetros de pesquisa inválidos')
    expect(mockFetch().mock.calls.some(([url]) => String(url).includes('/methodologies'))).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Limpar pesquisa e filtros' }))
    expect(await screen.findByRole('link', { name: 'DEMO Água' })).toBeInTheDocument()
  })
  it('prévia indisponível não fabrica conteúdo e impede retorno externo', async () => {
    mock(() => failure(404, 'NOT_FOUND', 'Registro não encontrado.'))
    open('/metodologias/10?from=https://evil.invalid')
    expect(await screen.findByRole('heading', { name: 'Metodologia indisponível' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar à pesquisa' })).toHaveAttribute('href', '/consultas')
  })
})
