import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import wikiChemSymbol from '../../assets/wiki-chem-symbol.png'
import './Header.css'
import { NavLink } from 'react-router-dom'

function Header() {
  const auth = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function logout() {
    setPending(true); setError('')
    try { await auth.logout() } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível sair.') }
    finally { setPending(false) }
  }
  return (
    <header className="header">
      <div className="header__container">
        <NavLink
          className="header__brand"
          to="/"
          aria-label="Wiki-Chem - Página inicial"
        >
          <img
            className="header__symbol"
            src={wikiChemSymbol}
            alt=""
          />

          <div className="header__identity">
            <span className="header__name">Wiki-Chem</span>

            <span className="header__tagline">
              QUÍMICA • ANÁLISE • CONHECIMENTO
            </span>
          </div>
        </NavLink>

        <nav className="header__nav" aria-label="Navegação principal">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/sobre">Sobre</NavLink>
          {auth.user ? <>
            <NavLink to="/consultas">Consultas</NavLink>
            <NavLink to="/perfil">Perfil</NavLink>
            <NavLink to="/carrinho">Carrinho</NavLink>
            <NavLink to="/pedidos">Pedidos</NavLink>
            <NavLink to="/biblioteca">Minha biblioteca</NavLink>
            {auth.user.role === 'ADMIN' && <NavLink to="/admin">Administração</NavLink>}
            <button className="header__login" type="button" disabled={pending} onClick={() => { void logout() }}>{pending ? 'Saindo…' : 'Sair'}</button>
          </> : <NavLink className="header__login" to="/login">Entrar <span aria-hidden="true">→</span></NavLink>}
        </nav>
        {error && <p className="header__error" role="alert">{error}</p>}
      </div>
    </header>
  )
}

export default Header
