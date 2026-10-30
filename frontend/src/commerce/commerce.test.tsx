import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import App from '../App'
import AuthProvider from '../auth/AuthProvider'
import OfferSection from './OfferSection'
import { brl } from './types'
import { demoCart, demoOffer, demoPreview } from '../test/commerce-fixtures'
import { failure, fixtureSession, mockFetch, success } from '../test/mockApi'
function wrapper(node: ReactNode) { render(<MemoryRouter><AuthProvider>{node}</AuthProvider></MemoryRouter>) }
function openCart() { render(<MemoryRouter initialEntries={['/carrinho']}><App /></MemoryRouter>) }
describe('oferta e carrinho na interface', () => {
  it('formata centavos exatamente, sem perdas por ponto flutuante', () => {
    expect(brl('1000')).toBe('R$ 10,00')
    expect(brl('1750')).toBe('R$ 17,50')
    expect(brl('9007199254740993')).toBe('R$ 90.071.992.547.409,93')
    expect(brl('9223372036854775807')).toBe('R$ 92.233.720.368.547.758,07')
  })
  it('adiciona somente após resposta real do contrato, enviando revisão e IDs, sem preço ou quantidade', async () => {
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success(fixtureSession())
      if (url === '/api/v1/cart') return success({ ...demoCart(), revision: 1, items: [], totalCentavos: '0' })
      expect(url).toBe('/api/v1/cart/items/1')
      expect(options?.method).toBe('PUT')
      expect(options?.headers).toMatchObject({ 'X-CSRF-Token': 'a'.repeat(64) })
      expect(JSON.parse(String(options?.body))).toEqual({ expectedRevision: 1, offerRevision: 3, priceId: '2', versionId: '20' })
      return success(demoCart())
    })
    wrapper(<OfferSection preview={demoPreview()} />)
    expect(screen.getByText('R$ 10,00')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Produto no carrinho')
    expect(screen.getByRole('link', { name: 'Ver carrinho' })).toHaveAttribute('href', '/carrinho')
  })
  it.each([null, { ...demoOffer(), available: false }, { ...demoOffer(), priceId: null, amountCentavos: null, available: false }])('oferta ausente ou indisponível não mostra botão de compra: %j', offer => {
    wrapper(<OfferSection preview={{ ...demoPreview(), offer, purchasable: false }} />)
    expect(screen.getByText('Oferta comercial ainda não disponível.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adicionar ao carrinho' })).not.toBeInTheDocument()
  })
  it('oferta alterada não confirma inclusão fictícia', async () => {
    mockFetch().mockImplementation(async url => url === '/api/v1/auth/session' ? success(fixtureSession()) : url === '/api/v1/cart' ? success(demoCart()) : failure(409, 'OFFER_CHANGED', 'Preço, versão ou disponibilidade mudou.'))
    wrapper(<OfferSection preview={demoPreview()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Preço, versão ou disponibilidade mudou')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
  it('carrinho apresenta valores, alterações e indisponibilidade sem apagar o item', async () => {
    const cart = demoCart(); cart.totalCentavos = '0'; cart.unavailableCount = 1
    cart.items[0]!.offer = { ...demoOffer(), amountCentavos: '1250', available: false, reason: 'INACTIVE' }
    cart.items[0]!.issues = ['PRICE_CHANGED', 'VERSION_CHANGED', 'UNAVAILABLE']
    mockFetch().mockImplementation(async url => url === '/api/v1/auth/session' ? success(fixtureSession()) : success(cart))
    openCart()
    expect(await screen.findByRole('heading', { name: 'DEMO original' })).toBeInTheDocument()
    expect(screen.getByText('Valor na inclusão: R$ 10,00')).toBeInTheDocument()
    expect(screen.getByText('Preço atual: R$ 12,50')).toBeInTheDocument()
    expect(screen.getByText('Há uma nova versão publicada.')).toBeInTheDocument()
    expect(screen.getByText(/mantido no carrinho e excluído do total/)).toBeInTheDocument()
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Avançar para checkout demonstrativo/i })).toBeDisabled()
  })
  it('remove com revisão no servidor e sem corpo JSON, preservando CSRF', async () => {
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success(fixtureSession())
      if (options?.method === 'DELETE') {
        expect(url).toBe('/api/v1/cart/items/1?expectedRevision=2')
        expect(options.body).toBeUndefined()
        expect(options.headers).toMatchObject({ 'X-CSRF-Token': 'a'.repeat(64) })
        return success({ ...demoCart(), revision: 3, items: [], totalCentavos: '0' })
      }
      return success(demoCart())
    })
    openCart(); await userEvent.click(await screen.findByRole('button', { name: 'Remover DEMO original' }))
    expect(await screen.findByText(/Seu carrinho está vazio/)).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
  it('conflito mantém item e permite revalidação explícita', async () => {
    mockFetch().mockImplementation(async (url, options) => url === '/api/v1/auth/session' ? success(fixtureSession()) : options?.method === 'DELETE' ? failure(409, 'REVISION_CONFLICT', 'O registro foi alterado.') : success(demoCart()))
    openCart(); await userEvent.click(await screen.findByRole('button', { name: 'Remover DEMO original' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O registro foi alterado')
    expect(screen.getByRole('article')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar valores' }))
    expect(await screen.findByRole('article')).toBeInTheDocument()
  })
  it('falha de rede permite repetir leitura e expiração encaminha ao acesso', async () => {
    let fail = true
    mockFetch().mockImplementation(async url => { if (url === '/api/v1/auth/session') return success(fixtureSession()); if (fail) throw new TypeError('offline'); return failure() })
    openCart(); expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível acessar')
    fail = false; await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou'))
  })
})
