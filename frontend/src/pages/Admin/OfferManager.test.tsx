import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AuthProvider from '../../auth/AuthProvider'
import { demoProduct } from '../../test/commerce-fixtures'
import { failure, fixtureSession, mockFetch, success } from '../../test/mockApi'
import OfferSection from './OfferManager'
function open() { render(<MemoryRouter><AuthProvider><OfferSection methodologyId="10" /></AuthProvider></MemoryRouter>) }
describe('administração de oferta e histórico', () => {
  it('cria produto inativo, cadastra preço e ativa somente com preço disponível', async () => {
    let product = { ...demoProduct(), active: false, revision: 1, offer: { ...demoProduct().offer, active: false, available: false, priceId: null as string | null, amountCentavos: null as string | null, reason: 'INACTIVE' as const } }
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success({ ...fixtureSession(), user: { ...fixtureSession().user, role: 'ADMIN' } })
      if (url === '/api/v1/admin/products?methodologyId=10') return new Response(JSON.stringify({ data: [], total: 0, page: 1, pageSize: 20 }))
      if (options?.method === 'POST' && url === '/api/v1/admin/products') { expect(JSON.parse(String(options.body))).toEqual({ methodologyId: '10' }); return success(product, 201) }
      if (options?.method === 'POST') {
        expect(JSON.parse(String(options.body))).toEqual({ expectedRevision: 1, amountCentavos: '1000', currency: 'BRL' })
        product = { ...product, revision: 2, offer: { ...product.offer, priceId: '2', amountCentavos: '1000' } }; return success(product, 201)
      }
      if (options?.method === 'PATCH') {
        expect(JSON.parse(String(options.body))).toEqual({ active: true, expectedRevision: 2 })
        return success(demoProduct())
      }
      return new Response(JSON.stringify({ data: [], total: 0, page: 1, pageSize: 20 }))
    })
    open(); const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Gerenciar oferta e preços' }))
    await user.click(await screen.findByRole('button', { name: 'Criar produto inativo' }))
    expect(await screen.findByRole('button', { name: 'Ativar oferta' })).toBeDisabled()
    await user.type(screen.getByLabelText('Novo preço em centavos (BRL)'), '1000')
    await user.click(screen.getByRole('button', { name: 'Cadastrar novo preço' }))
    expect(await screen.findByText('Preço corrente: R$ 10,00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ativar oferta' }))
    expect(await screen.findByRole('button', { name: 'Desativar oferta' })).toBeInTheDocument()
  })
  it('conflito de preço não sobrescreve histórico nem apresenta sucesso', async () => {
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/session') return success({ ...fixtureSession(), user: { ...fixtureSession().user, role: 'ADMIN' } })
      if (options?.method === 'POST') return failure(409, 'REVISION_CONFLICT', 'Revisão divergente.')
      return new Response(JSON.stringify({ data: String(url).includes('/prices') ? [] : [demoProduct()], total: 1, page: 1, pageSize: 20 }))
    })
    open(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Gerenciar oferta e preços' }))
    await user.type(await screen.findByLabelText('Novo preço em centavos (BRL)'), '1250')
    await user.click(screen.getByRole('button', { name: 'Cadastrar novo preço' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisão divergente')
    expect(screen.queryByText('Oferta atualizada. Histórico preservado.')).not.toBeInTheDocument()
    expect(screen.getByText('Preço corrente: R$ 10,00')).toBeInTheDocument()
  })
})
