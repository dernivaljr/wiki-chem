import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('páginas e navegação existentes', () => {
  it.each([
    { path: '/', heading: 'Wiki-Chem' },
    { path: '/sobre', heading: 'Sobre o Wiki-Chem' },
    { path: '/login', heading: 'Conhecimento químico, ao seu alcance.' },
    { path: '/consultas', heading: 'Olá, que descoberta vamos fazer hoje?' },
  ])('renderiza a apresentação de $path', ({ path, heading }) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('navega pelos links do cabeçalho e pelo CTA sem submeter autenticação', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><App /></MemoryRouter>)

    await user.click(screen.getByRole('link', { name: 'Sobre' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Sobre o Wiki-Chem' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sobre' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('link', { name: 'Home' }))
    await user.click(screen.getByRole('link', { name: 'Explorar conteúdos' }))
    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Wiki-Chem - Página inicial' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Wiki-Chem' })).toBeInTheDocument()
  })
})
