import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Login from './Login'

// Cobrem apenas a interface local. Não submetem nem validam login/cadastro simulados.
describe('interface do formulário de acesso', () => {
  it('identifica os campos e suas restrições HTML básicas', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)

    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveAttribute('type', 'email')
    expect(screen.getByRole('textbox', { name: 'E-mail' })).toBeRequired()
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password')
    expect(screen.getByPlaceholderText('••••••••')).toBeRequired()
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('minlength', '6')
  })

  it('alterna os campos entre as apresentações de login e cadastro', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><Login /></MemoryRouter>)

    await user.click(screen.getByRole('tab', { name: 'Criar conta' }))
    expect(screen.getByRole('heading', { name: 'Crie sua conta' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome completo' })).toBeRequired()
    expect(screen.getByRole('checkbox', { name: /Concordo com os termos/ })).toBeRequired()

    await user.click(screen.getByRole('tab', { name: 'Entrar' }))
    expect(screen.queryByRole('textbox', { name: 'Nome completo' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
  })

  it('mostra e oculta a senha digitada sem alterar seu valor', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><Login /></MemoryRouter>)
    const password = screen.getByPlaceholderText('••••••••')

    await user.type(password, 'exemplo-local')
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('exemplo-local')

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveValue('exemplo-local')
  })
})
