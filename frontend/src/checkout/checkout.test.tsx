import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { demoCart } from '../test/commerce-fixtures'
import { demoOrder } from '../test/checkout-fixtures'
import { failure, fixtureSession, mockFetch, success } from '../test/mockApi'

function open(path = '/checkout/50') {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

beforeEach(() => localStorage.clear())

describe('checkout integrado aos contratos HTTP com aviso discreto de isenção de cobrança', () => {
  it('cria revisão pelo carrinho, exige aceite explícito, informa ausência de cobrança e zera contador após conclusão', async () => {
    let completed = false
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success(fixtureSession())
      if (url === '/api/v1/cart') return success(completed ? { ...demoCart(), items: [], totalCentavos: '0' } : demoCart())
      if (url === '/api/v1/checkout/simulations') {
        expect(options?.headers).toHaveProperty('Idempotency-Key')
        return success(demoOrder(), 201)
      }
      if (String(url).endsWith('/confirm-simulation')) {
        expect(JSON.parse(String(options?.body))).toEqual({ demoAcknowledged: true })
        completed = true
      }
      return success(demoOrder(completed ? 'COMPLETED_SIMULATED' : 'PENDING_CONFIRMATION'))
    })
    open('/carrinho')
    await userEvent.click(await screen.findByRole('button', { name: 'Prosseguir para revisão do pedido' }))
    const confirm = await screen.findByRole('button', { name: 'Confirmar pedido' })
    expect(screen.getByText(/Transação isenta de cobrança:/)).toBeInTheDocument()
    expect(confirm).toBeDisabled()
    expect(completed).toBe(false)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(confirm)
    expect(await screen.findByRole('heading', { name: 'Pedido concluído' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ler DEMO original na minha biblioteca' })).toHaveAttribute('href', '/biblioteca/10')
    await waitFor(() => expect(screen.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeInTheDocument())
  })

  it('recupera confirmação de resposta perdida por consulta, sem outra operação de escrita', async () => {
    let completed = false
    let writes = 0
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success(fixtureSession())
      if (url === '/api/v1/cart') return success({ ...demoCart(), items: [], totalCentavos: '0' })
      if (options?.method === 'POST') {
        writes++
        completed = true
        throw new TypeError('offline')
      }
      return success(demoOrder(completed ? 'COMPLETED_SIMULATED' : 'PENDING_CONFIRMATION'))
    })
    open()
    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Resultado ainda não confirmado')
    await userEvent.click(screen.getByRole('button', { name: 'Consultar estado do pedido' }))
    expect(await screen.findByRole('heading', { name: 'Pedido concluído' })).toBeInTheDocument()
    expect(writes).toBe(1)
  })

  it('não substitui snapshot quando a oferta muda; permite cancelamento explícito', async () => {
    mockFetch().mockImplementation(async (url, options) =>
      url === '/api/v1/auth/session'
        ? success(fixtureSession())
        : url === '/api/v1/cart'
          ? success(demoCart())
          : String(url).endsWith('/confirm-simulation')
            ? failure(409, 'OFFER_CHANGED', 'Oferta mudou.')
            : success(demoOrder(options?.method === 'POST' ? 'CANCELLED' : 'PENDING_CONFIRMATION')),
    )
    open()
    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Oferta mudou')
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
    expect(screen.getAllByText('R$ 10,00')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar revisão' }))
    expect(await screen.findByRole('heading', { name: 'Revisão cancelada' })).toBeInTheDocument()
  })

  it('pedido expirado não oferece confirmação e preserva os itens', async () => {
    mockFetch().mockImplementation(async url => success(url === '/api/v1/auth/session' ? fixtureSession() : demoOrder('EXPIRED')))
    open()
    expect(await screen.findByRole('heading', { name: 'Prazo encerrado' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'DEMO original' })).toBeInTheDocument()
  })

  it('sessão expirada encaminha ao login sem confirmar automaticamente', async () => {
    mockFetch().mockImplementation(async url => (url === '/api/v1/auth/session' ? success(fixtureSession()) : failure()))
    open()
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
    expect(mockFetch().mock.calls.filter(([, opts]) => opts?.method === 'POST')).toHaveLength(0)
  })

  it('histórico vazio e paginação não inventam pedidos', async () => {
    mockFetch().mockImplementation(async url =>
      url === '/api/v1/auth/session'
        ? success(fixtureSession())
        : new Response(JSON.stringify({ data: [], total: 0, page: 1, pageSize: 20 })),
    )
    open('/pedidos')
    expect(await screen.findByText('Nenhum pedido registrado na sua conta.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
    await waitFor(() => expect(screen.queryByRole('article')).not.toBeInTheDocument())
  })
})
