import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('páginas e navegação', () => {
  it('endereço desconhecido mantém uma página recuperável com conteúdo principal', async () => {
    render(<MemoryRouter initialEntries={['/endereco-inexistente']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Voltar à página inicial' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Wiki-Chem' })).toBeInTheDocument()
  })
  it.each([
    { path: '/', heading: 'Wiki-Chem' },
    { path: '/sobre', heading: 'Sobre o Wiki-Chem' },
    { path: '/login', heading: 'Conhecimento químico, ao seu alcance.' },
  ])('renderiza $path', async ({ path, heading }) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
  })
  it.each(['/consultas', '/perfil', '/metodologias/10', '/carrinho', '/pedidos', '/pedidos/10', '/checkout/10', '/biblioteca', '/biblioteca/10'])('protege %s e encaminha ao acesso', async path => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Meu perfil' })).not.toBeInTheDocument()
  })
  it('navega pelos links e pelo CTA', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><App /></MemoryRouter>)
    await user.click(screen.getByRole('link', { name: 'Sobre' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Sobre o Wiki-Chem' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    await user.click(screen.getByRole('link', { name: 'Explorar conteúdos' }))
    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
  })
})
