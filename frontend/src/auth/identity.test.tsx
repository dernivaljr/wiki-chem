import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { failure, fixtureSession, fixtureUser, mockFetch, success } from '../test/mockApi'
import { safeReturnTo } from './returnTo'

describe('integração da interface com contratos de identidade', () => {
  it.each(['https://evil.invalid', '//evil.invalid', '/login', '/perfil#unsafe', '/\\evil.invalid', '/consultas/../../evil'])('recusa retorno externo ou não permitido: %s', value => {
    expect(safeReturnTo(value)).toBe('/consultas')
  })
  it('permite apenas rotas conhecidas e query interna', () => {
    expect(safeReturnTo('/perfil')).toBe('/perfil')
    expect(safeReturnTo('/consultas?q=abc')).toBe('/consultas?q=abc')
  })
  it('aguarda bootstrap sem exibir conteúdo protegido', async () => {
    mockFetch().mockImplementation(() => new Promise(() => {}))
    render(<MemoryRouter initialEntries={['/perfil']}><App /></MemoryRouter>)
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando sessão')
    expect(screen.queryByRole('heading', { name: 'Meu perfil' })).not.toBeInTheDocument()
  })
  it('mostra erro de rede na proteção e permite tentar novamente', async () => {
    mockFetch().mockRejectedValueOnce(new TypeError('offline'))
    render(<MemoryRouter initialEntries={['/perfil']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Serviço indisponível' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
  })
  it('login aguarda API, usa cookie de mesma origem e retorna ao perfil', async () => {
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/auth/login') {
        expect(options?.credentials).toBe('same-origin')
        return success(fixtureSession())
      }
      return failure()
    })
    render(<MemoryRouter initialEntries={['/login?returnTo=%2Fperfil']}><App /></MemoryRouter>)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail'), fixtureUser.email)
    await user.type(screen.getByPlaceholderText('••••••••'), 'Senha de teste longa')
    await user.click(screen.getByRole('button', { name: 'Entrar no Wiki-Chem' }))
    expect(await screen.findByRole('heading', { name: 'Meu perfil' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('readonly')
    expect(localStorage.length).toBe(0)
  })
  it('cadastro só confirma após resposta 201 e não exige termo inexistente', async () => {
    mockFetch().mockImplementation(async url => url === '/api/v1/auth/register' ? success(fixtureUser, 201) : failure())
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Criar conta' }))
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Nome completo'), 'Pessoa de teste')
    await user.type(screen.getByLabelText('E-mail'), fixtureUser.email)
    await user.type(screen.getByPlaceholderText('••••••••'), 'Senha de teste longa')
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Conta criada. Entre')
    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
    expect(mockFetch().mock.calls.filter(([url]) => url === '/api/v1/auth/login')).toHaveLength(0)
  })
  it('credencial inválida não libera rota protegida', async () => {
    mockFetch().mockImplementation(async url => url === '/api/v1/auth/login' ? failure(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.') : failure())
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail'), fixtureUser.email)
    await user.type(screen.getByPlaceholderText('••••••••'), 'Senha de teste longa')
    await user.click(screen.getByRole('button', { name: 'Entrar no Wiki-Chem' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.queryByRole('heading', { name: /Olá, que descoberta/ })).not.toBeInTheDocument()
  })
  it('perfil envia somente nome e CSRF; 401 remove estado e solicita login', async () => {
    mockFetch().mockImplementation(async (url, options) => {
      if (url === '/api/v1/me') {
        expect(options?.body).toBe(JSON.stringify({ displayName: 'Outro nome' }))
        expect(options?.headers).toMatchObject({ 'X-CSRF-Token': 'a'.repeat(64) })
        return failure()
      }
      return success(fixtureSession())
    })
    render(<MemoryRouter initialEntries={['/perfil']}><App /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Meu perfil' })
    const user = userEvent.setup(), input = screen.getByLabelText('Nome de exibição')
    await user.clear(input); await user.type(input, 'Outro nome')
    await user.click(screen.getByRole('button', { name: 'Salvar nome' }))
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou')
  })
  it('falha de logout não afirma encerramento confirmado', async () => {
    mockFetch().mockImplementation(async url => {
      if (url === '/api/v1/auth/logout') throw new TypeError('offline')
      return success(fixtureSession())
    })
    render(<MemoryRouter initialEntries={['/perfil']}><App /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Meu perfil' })
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível acessar')
    expect(screen.getByRole('heading', { name: 'Meu perfil' })).toBeInTheDocument()
  })
  it('logout confirmado remove conteúdo protegido', async () => {
    mockFetch().mockImplementation(async url => url === '/api/v1/auth/logout' ? new Response(null, { status: 204 }) : success(fixtureSession()))
    render(<MemoryRouter initialEntries={['/perfil']}><App /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Meu perfil' })
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Meu perfil' })).not.toBeInTheDocument())
  })
})
