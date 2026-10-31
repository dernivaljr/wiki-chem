import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import type { PaymentMethod } from './types'
import { demoCart } from '../test/commerce-fixtures'
import { demoOrder } from '../test/checkout-fixtures'
import { failure, fixtureSession, mockFetch, success } from '../test/mockApi'

function open(path = '/checkout/50') {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

beforeEach(() => localStorage.clear())

describe('checkout integrado aos contratos HTTP, simulação de pagamento e compras consecutivas', () => {
  it('cria revisão pelo carrinho, exige seleção de modalidade e aceite explícito, não pede dados sensíveis e oculta prazo após conclusão', async () => {
    let completed = false
    let recordedMethod: PaymentMethod | null = null
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success(fixtureSession())
      if (url === '/api/v1/cart') return success(completed ? { ...demoCart(), items: [], totalCentavos: '0' } : demoCart())
      if (url === '/api/v1/checkout/simulations') {
        expect(options?.headers).toHaveProperty('Idempotency-Key')
        return success(demoOrder(), 201)
      }
      if (String(url).endsWith('/confirm-simulation')) {
        const body = JSON.parse(String(options?.body)) as { demoAcknowledged: boolean; paymentMethod: PaymentMethod }
        expect(body).toEqual({ demoAcknowledged: true, paymentMethod: 'PIX' })
        completed = true
        recordedMethod = body.paymentMethod
      }
      return success(demoOrder(completed ? 'COMPLETED_SIMULATED' : 'PENDING_CONFIRMATION', recordedMethod))
    })
    open('/carrinho')
    await userEvent.click(await screen.findByRole('button', { name: 'Prosseguir para revisão do pedido' }))
    const confirm = await screen.findByRole('button', { name: 'Confirmar pedido' })
    expect(screen.getByText(/Transação isenta de cobrança:/)).toBeInTheDocument()
    expect(screen.getByText('Prazo de confirmação')).toBeInTheDocument()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryByLabelText(/número do cartão|cvv|agência|conta bancária/i)).not.toBeInTheDocument()
    expect(confirm).toBeDisabled()

    // Aceite marcado sem forma de pagamento continua desabilitado
    await userEvent.click(screen.getByRole('checkbox'))
    expect(confirm).toBeDisabled()

    await userEvent.click(screen.getByRole('radio', { name: /PIX/ }))
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)

    expect(await screen.findByRole('heading', { name: 'Pedido concluído' })).toBeInTheDocument()
    expect(screen.queryByText('Prazo de confirmação')).not.toBeInTheDocument()
    expect(screen.getByText('Concluído em')).toBeInTheDocument()
    expect(screen.getByText(/Pagamento simulado via PIX aprovado instantaneamente/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Voltar ao carrinho para nova revisão/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ler DEMO original na minha biblioteca' })).toHaveAttribute('href', '/biblioteca/10')
    await waitFor(() => expect(screen.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeInTheDocument())
  })

  it('realiza três compras consecutivas (PIX, Cartão de crédito e Boleto bancário) sem prender em Recuperar revisão do pedido', async () => {
    const steps: { id: string; productId: string; methodologyId: string; title: string; radio: RegExp; method: PaymentMethod }[] = [
      { id: '50', productId: '1', methodologyId: '10', title: 'Metodologia 01 — Ferro UV-Vis', radio: /^PIX/, method: 'PIX' },
      { id: '51', productId: '2', methodologyId: '11', title: 'Metodologia 02 — Metais ICP-OES', radio: /^Cartão de crédito/, method: 'CREDIT_CARD' },
      { id: '52', productId: '3', methodologyId: '12', title: 'Metodologia 03 — Ânions IC', radio: /^Boleto bancário/, method: 'BOLETO' },
    ]
    let currentIdx = 0
    let inCart = true
    const orders = new Map<string, ReturnType<typeof demoOrder>>()
    const createKeys: string[] = []

    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success(fixtureSession())
      if (url === '/api/v1/cart') {
        const step = steps[currentIdx]!
        if (!inCart) return success({ ...demoCart(), revision: currentIdx * 2 + 2, items: [], totalCentavos: '0' })
        return success({
          ...demoCart(),
          revision: currentIdx * 2 + 1,
          totalCentavos: '3900',
          items: [{ ...demoCart().items[0]!, productId: step.productId, methodologyId: step.methodologyId, title: step.title }],
        })
      }
      if (url === '/api/v1/checkout/simulations') {
        createKeys.push(String((options?.headers as Record<string, string>)['Idempotency-Key']))
        const step = steps[currentIdx]!
        const created = {
          ...demoOrder('PENDING_CONFIRMATION', null),
          id: step.id,
          cartRevisionSnapshot: currentIdx * 2 + 1,
          items: [{ ...demoOrder().items[0]!, productId: step.productId, methodologyId: step.methodologyId, titleSnapshot: step.title }],
        }
        orders.set(step.id, created)
        return success(created, 201)
      }
      if (String(url).endsWith('/confirm-simulation')) {
        const orderId = String(url).split('/').at(-2)!
        const body = JSON.parse(String(options?.body)) as { paymentMethod: PaymentMethod }
        const existing = orders.get(orderId)!
        const updated = {
          ...existing,
          status: 'COMPLETED_SIMULATED' as const,
          paymentMethod: body.paymentMethod,
          completedAt: new Date().toISOString(),
        }
        orders.set(orderId, updated)
        inCart = false
        return success(updated)
      }
      if (String(url).startsWith('/api/v1/orders/')) {
        const orderId = String(url).split('/').pop()!
        return success(orders.get(orderId)!)
      }
      if (String(url).startsWith('/api/v1/orders')) {
        return new Response(JSON.stringify({ data: [...orders.values()].reverse(), total: orders.size, page: 1, pageSize: 20 }))
      }
      return success(demoOrder())
    })

    for (let idx = 0; idx < steps.length; idx++) {
      currentIdx = idx
      inCart = true
      const step = steps[idx]!
      const view = open('/carrinho')
      expect(await screen.findByRole('heading', { name: step.title })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Recuperar revisão do pedido' })).not.toBeInTheDocument()
      await userEvent.click(await screen.findByRole('button', { name: 'Prosseguir para revisão do pedido' }))
      expect(await screen.findByText('#' + step.id)).toBeInTheDocument()
      await userEvent.click(screen.getByRole('radio', { name: step.radio }))
      await userEvent.click(screen.getByRole('checkbox'))
      await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
      expect(await screen.findByRole('heading', { name: 'Pedido concluído' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: `Ler ${step.title} na minha biblioteca` })).toHaveAttribute('href', `/biblioteca/${step.methodologyId}`)
      await waitFor(() => expect(screen.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeInTheDocument())
      view.unmount()
    }

    expect(new Set(createKeys).size).toBe(3)
    open('/pedidos')
    expect(await screen.findByRole('link', { name: 'Pedido 52' })).toBeInTheDocument()
    expect(screen.getByText(/Boleto bancário/)).toBeInTheDocument()
    expect(screen.getByText(/Cartão de crédito/)).toBeInTheDocument()
    expect(screen.getByText(/PIX/)).toBeInTheDocument()
  })

  it('ao abrir o carrinho com intenção expirada ou cancelada no localStorage, consulta o estado e permite nova compra', async () => {
    localStorage.setItem(
      'wikichem-demo-create:10',
      JSON.stringify({ key: '90aeba0b-29de-4f9c-9367-4afb24d5fc00', cartRevision: 1, orderId: '49' }),
    )
    mockFetch().mockImplementation(async url => {
      if (url === '/api/v1/auth/session') return success(fixtureSession())
      if (url === '/api/v1/cart') return success(demoCart())
      if (url === '/api/v1/orders/49') return success({ ...demoOrder('EXPIRED'), id: '49' })
      if (url === '/api/v1/checkout/simulations') return success(demoOrder('PENDING_CONFIRMATION'), 201)
      return success(demoOrder('PENDING_CONFIRMATION'))
    })
    open('/carrinho')
    const proceed = await screen.findByRole('button', { name: 'Prosseguir para revisão do pedido' })
    expect(screen.queryByRole('button', { name: 'Recuperar revisão do pedido' })).not.toBeInTheDocument()
    await userEvent.click(proceed)
    expect(await screen.findByText('#50')).toBeInTheDocument()
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
      return success(demoOrder(completed ? 'COMPLETED_SIMULATED' : 'PENDING_CONFIRMATION', completed ? 'BOLETO' : null))
    })
    open()
    await userEvent.click(await screen.findByRole('radio', { name: /^Boleto bancário/ }))
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Resultado ainda não confirmado')
    await userEvent.click(screen.getByRole('button', { name: 'Consultar estado do pedido' }))
    expect(await screen.findByRole('heading', { name: 'Pedido concluído' })).toBeInTheDocument()
    expect(screen.getByText(/Quitação simulada via Boleto bancário compensada/)).toBeInTheDocument()
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
            : success(demoOrder(options?.method === 'POST' ? 'CANCELLED' : 'PENDING_CONFIRMATION', null)),
    )
    open()
    await userEvent.click(await screen.findByRole('radio', { name: /^PIX/ }))
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Oferta mudou')
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar revisão' }))
    expect(await screen.findByRole('heading', { name: 'Revisão cancelada' })).toBeInTheDocument()
  })

  it('pedido expirado não oferece confirmação e preserva os itens', async () => {
    mockFetch().mockImplementation(async url => success(url === '/api/v1/auth/session' ? fixtureSession() : demoOrder('EXPIRED', null)))
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
