import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { failure, fixtureSession, mockFetch, success } from '../../test/mockApi'
import { facets, labels } from '../../catalog/types'
import type { Page, Preview, Taxonomies } from '../../catalog/types'

const terms = Object.fromEntries(
  facets.map(facet => [
    facet,
    ['1', '2'].map(id => ({
      id,
      code: 'cat-' + id,
      label: labels[facet] + ' ' + id,
      active: true,
      revision: 1,
      ...(facet === 'standards' ? { issuer: 'U.S. EPA', identifier: 'EPA 200.' + id, editionLabel: 'Rev. ' + id } : {}),
    })),
  ]),
) as Taxonomies

const preview = (title = 'Determinação multielementar por ICP-OES (EPA 200.7)'): Preview => ({
  owned: false,
  offer: {
    productId: '1',
    revision: 1,
    active: true,
    priceId: '2',
    amountCentavos: '5900',
    currency: 'BRL',
    available: true,
    reason: null,
  },
  purchasable: true,
  id: '10',
  versionId: '20',
  versionLabel: 'v2',
  title,
  freeSummary: 'Guia interpretativo do Wiki-Chem sobre determinação multielementar por ICP-OES. Sintetiza nebulização, correção espectral e calibração.',
  publicDescription: 'Apresenta o escopo analítico, condicionamento ácido das matrizes aquosas e mitigação de sobreposições espectrais em ICP-OES.',
  technicalMetadata: terms,
  references: [
    {
      referenceText: 'Guia Técnico Interpretativo Wiki-Chem WK-ANL-002.',
      sourceType: 'ORIGINAL',
      ownerCredit: 'Wiki-Chem — Conteúdo Técnico Original',
      editionLabel: 'WK-ANL-002 · v2',
      locator: 'Catálogo Digital Wiki-Chem',
      canonicalUrl: '',
    },
    {
      referenceText: 'U.S. EPA Method 200.7, Rev. 4.4.',
      sourceType: 'REFERENCE',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA)',
      editionLabel: 'Rev. 4.4 (1994)',
      locator: 'ESAM Method 200.7',
      canonicalUrl: 'https://www.epa.gov/esam/method-2007-determination-metals-and-trace-elements-water-and-wastes-inductively-coupled',
    },
  ],
  contributors: [{ displayName: 'Acervo Editorial Wiki-Chem', contributorType: 'ORGANIZATION', reference: 'Guia analítico', role: 'AUTHOR' }],
})

const pendingInformativePreview = (): Preview => ({
  owned: false,
  offer: null,
  purchasable: false,
  id: '30',
  versionId: '40',
  versionLabel: 'v1',
  title: 'Determinação espectrofotométrica de ferro total com 1,10-fenantrolina (UV-Vis)',
  freeSummary: 'Síntese referencial sobre determinação espectrofotométrica de ferro.',
  publicDescription: 'Escopo resumido e interferências documentadas.',
  technicalMetadata: terms,
  references: [{
    referenceText: 'Cuttitta, F. (1952). USGS TEI-223.',
    sourceType: 'REFERENCE',
    ownerCredit: 'U.S. Geological Survey (USGS)',
    editionLabel: 'TEI-223 (1952)',
    locator: 'USGS Publications Warehouse — TEI-223',
    canonicalUrl: 'https://pubs.usgs.gov/publication/tei223',
  }],
  contributors: [{ displayName: 'Catalogação Técnica Wiki-Chem', contributorType: 'ORGANIZATION', reference: 'Síntese', role: 'CURATOR' }],
})

const page = (data = [preview()], meta = {}): Page<Preview> => ({ data, total: data.length, page: 1, pageSize: 20, ...meta })
const list = (data = page()) => new Response(JSON.stringify(data))

function Location() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function open(path = '/consultas') {
  render(<MemoryRouter initialEntries={[path]}><App /><Location /></MemoryRouter>)
}

function mock(handler?: (url: string) => Response | Promise<Response>) {
  mockFetch().mockImplementation(async url => {
    if (url === '/api/v1/auth/session') return success(fixtureSession())
    if (url === '/api/v1/cart') return success({ revision: 1, items: [], currency: 'BRL', totalCentavos: '0', unavailableCount: 0 })
    if (url === '/api/v1/taxonomies') return success(terms)
    if (handler) return handler(String(url))
    return String(url).includes('/methodologies/') ? success(preview()) : list()
  })
}

describe('pesquisa simplificada, filtros recolhidos e cartões compactos', () => {
  it('exibe inicialmente apenas busca, botão Pesquisar e Filtros avançados recolhidos, sem consultar nem listar o catálogo', async () => {
    mock()
    open('/consultas')
    expect(await screen.findByRole('searchbox', { name: 'Termo de consulta' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Pesquisar' })).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Filtros avançados' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group', { name: 'Técnicas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Resultados da pesquisa' })).not.toBeInTheDocument()
    expect(screen.getByText(/Digite um termo de consulta para pesquisar metodologias analíticas/)).toBeInTheDocument()
    expect(mockFetch().mock.calls.some(([url]) => String(url).includes('/methodologies'))).toBe(false)
  })

  it('exige termo não vazio mesmo com filtros selecionados e abre os sete filtros sob demanda', async () => {
    mock()
    open('/consultas')
    const user = userEvent.setup()
    await screen.findByRole('searchbox', { name: 'Termo de consulta' })

    await user.click(screen.getByRole('button', { name: 'Filtros avançados' }))
    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute('aria-expanded', 'true')
    for (const facet of facets) {
      expect(await screen.findByRole('group', { name: labels[facet] })).toBeInTheDocument()
    }
    const normGroup = screen.getByRole('group', { name: 'Normas' })
    expect(within(normGroup).getByRole('checkbox', { name: 'Normas 1' })).toBeInTheDocument()
    expect(screen.getByLabelText('Detalhes normativos de Normas 1')).toBeInTheDocument()

    await user.click(within(screen.getByRole('group', { name: 'Analitos' })).getAllByRole('checkbox')[0]!)
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Informe um termo de pesquisa para consultar o catálogo técnico.')
    expect(screen.getByTestId('location')).toHaveTextContent('analyteIds=1')
    expect(mockFetch().mock.calls.some(([url]) => String(url).includes('/methodologies'))).toBe(false)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('exibe cartões compactos com preço BRL após pesquisa válida e preserva referência sem produto autoral sem falsa venda', async () => {
    mock(url => String(url).includes('q=pendente') ? list(page([pendingInformativePreview()])) : list(page([preview()])))
    open('/consultas?q=icp')
    expect(await screen.findByRole('link', { name: /ICP-OES/ })).toBeInTheDocument()
    expect(screen.getByText('R$ 59,00')).toBeInTheDocument()
    expect(screen.getByText('WK-ANL-002')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeEnabled()

    const user = userEvent.setup()
    await user.clear(screen.getByRole('searchbox'))
    await user.type(screen.getByRole('searchbox'), 'pendente')
    await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    expect(await screen.findByRole('link', { name: /1,10-fenantrolina/ })).toBeInTheDocument()
    expect(screen.getByText('Referência catalogada — produto autoral pendente')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adicionar ao carrinho' })).not.toBeInTheDocument()
  })

  it('combina múltiplos filtros com termo válido, aplica URL, remove e limpa filtros', async () => {
    mock()
    open('/consultas')
    const user = userEvent.setup()
    await screen.findByRole('searchbox')
    await user.click(screen.getByRole('button', { name: 'Filtros avançados' }))
    await screen.findByRole('group', { name: 'Analitos' })
    for (const facet of ['analytes', 'matrices'] as const) {
      for (const input of within(screen.getByRole('group', { name: labels[facet] })).getAllByRole('checkbox')) {
        await user.click(input)
      }
    }
    await user.type(screen.getByRole('searchbox'), 'água Fe²⁺')
    await user.selectOptions(screen.getByLabelText('Ordenação'), 'updated_desc')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('analyteIds=1&analyteIds=2'))
    expect(screen.getByTestId('location')).toHaveTextContent('matrixIds=1&matrixIds=2')
    expect(await screen.findByRole('link', { name: /ICP-OES/ })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /Remover Analitos: Analitos 1/ }))
    await waitFor(() => expect(screen.getByTestId('location').textContent).not.toContain('analyteIds=1'))

    await user.click(screen.getByRole('button', { name: 'Limpar pesquisa e filtros' }))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/consultas$/)
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('restaura URL, pagina, apresenta página de produto estilo ASTM e volta do detalhe à consulta', async () => {
    mock(url =>
      url.includes('/methodologies/')
        ? success(preview())
        : list(page([preview()], { total: 3, page: new URL(url, 'http://test').searchParams.get('page') === '2' ? 2 : 1, pageSize: 1 })),
    )
    open('/consultas?q=agua&analyteIds=1&pageSize=1&sort=updated_desc')
    await screen.findByRole('link', { name: /ICP-OES/ })
    expect(screen.getByRole('searchbox')).toHaveValue('agua')
    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Filtros avançados' }))
    expect((await within(await screen.findByRole('group', { name: 'Analitos' })).findAllByRole('checkbox'))[0]).toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=2'))

    await userEvent.click(await screen.findByRole('link', { name: /ICP-OES/ }))
    expect(await screen.findByRole('heading', { level: 1, name: /ICP-OES/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Descrição gratuita' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Conteúdo incluído no produto digital' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Consultar fonte 2/ })).toHaveAttribute(
      'href',
      'https://www.epa.gov/esam/method-2007-determination-metals-and-trace-elements-water-and-wastes-inductively-coupled',
    )

    await userEvent.click(screen.getByRole('link', { name: 'Voltar à pesquisa' }))
    await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue('agua'))
    expect(screen.getByTestId('location')).toHaveTextContent('page=2')
  })

  it('informa vazio sem construir resultados substitutos e oferece atalhos de recuperação', async () => {
    mock(() => list(page([])))
    open('/consultas?q=inexistente&analyteIds=1')
    expect(await screen.findByText(/Nenhuma metodologia encontrada/)).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('inexistente')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Limpar apenas filtros' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/consultas?q=inexistente'))
    await userEvent.click(await screen.findByRole('button', { name: 'Redefinir consulta' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/consultas$/))
  })

  it('não mantém resultados anteriores durante carregamento nem aceita resposta obsoleta', async () => {
    let resolve: ((response: Response) => void) | undefined
    mock(url => url.includes('q=novo') ? list(page([preview('Guia novo EPA 300.0')])) : new Promise<Response>(done => { resolve = done }))
    open('/consultas?q=antigo')
    expect(await screen.findByText('Carregando metodologias…')).toBeInTheDocument()
    await waitFor(() => expect(resolve).toBeTypeOf('function'))
    const user = userEvent.setup()
    await user.clear(screen.getByRole('searchbox'))
    await user.type(screen.getByRole('searchbox'), 'novo')
    await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    expect(await screen.findByRole('link', { name: 'Guia novo EPA 300.0' })).toBeInTheDocument()
    await act(async () => { resolve?.(list(page([preview('Guia antigo obsoleto')]))); await Promise.resolve() })
    expect(screen.queryByRole('link', { name: 'Guia antigo obsoleto' })).not.toBeInTheDocument()
  })

  it('trata falha de rede e repete somente a leitura', async () => {
    let fail = true
    mock(() => { if (fail) throw new TypeError('offline'); return list() })
    open('/consultas?q=ferro')
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível acessar o serviço')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('link', { name: /ICP-OES/ })).toBeInTheDocument()
    expect(mockFetch().mock.calls.filter(([, options]) => options?.method && options.method !== 'GET')).toHaveLength(0)
  })

  it('sessão expirada remove resultados e encaminha ao acesso', async () => {
    mock(() => failure())
    open('/consultas?q=agua')
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou')
    expect(screen.getByTestId('location')).toHaveTextContent('returnTo=%2Fconsultas%3Fq%3Dagua')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('recusa URL inválida sem fazer consulta e permite recuperação', async () => {
    mock()
    open('/consultas?sort=price_asc')
    expect(await screen.findByRole('alert')).toHaveTextContent('Parâmetros de pesquisa inválidos')
    expect(mockFetch().mock.calls.some(([url]) => String(url).includes('/methodologies'))).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Limpar pesquisa e filtros' }))
    expect(await screen.findByText(/Digite um termo de consulta/)).toBeInTheDocument()
  })

  it('prévia indisponível não fabrica conteúdo e impede retorno externo', async () => {
    mock(() => failure(404, 'NOT_FOUND', 'Registro não encontrado.'))
    open('/metodologias/10?from=https://evil.invalid')
    expect(await screen.findByRole('heading', { name: 'Metodologia indisponível' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar à pesquisa' })).toHaveAttribute('href', '/consultas')
  })
})
