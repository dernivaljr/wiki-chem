import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Consultas from './Consultas'

describe('apresentação do painel de consultas', () => {
  it('expõe o campo com nome acessível e os controles visuais', () => {
    render(<Consultas />)

    expect(screen.getByRole('searchbox', { name: 'Termo de consulta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pesquisar' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('tablist', { name: 'Categorias de consulta' })).toBeInTheDocument()
  })

  it('permite editar o termo, sem afirmar que a pesquisa foi executada', async () => {
    const user = userEvent.setup()
    render(<Consultas />)
    const input = screen.getByRole('searchbox', { name: 'Termo de consulta' })

    await user.type(input, 'titulação')
    expect(input).toHaveValue('titulação')
    await user.clear(input)
    expect(input).toHaveValue('')
  })
})
