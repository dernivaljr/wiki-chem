import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronDown, FileText, LogOut, Shield, ShoppingCart, User } from '../icons'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useCartSummary } from '../../commerce/CartContext'
import wikiChemSymbol from '../../assets/wiki-chem-symbol.png'
import './Header.css'

function Header() {
  const auth = useAuth()
  const { count: cartCount } = useCartSummary()
  const location = useLocation()
  const routeKey = location.pathname + location.search
  const [openRouteKey, setOpenRouteKey] = useState<string | null>(null)
  const menuOpen = openRouteKey === routeKey
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenRouteKey(null)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpenRouteKey(null)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  async function logout() {
    setPending(true)
    setError('')
    try {
      await auth.logout()
      setOpenRouteKey(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível sair.')
    } finally {
      setPending(false)
    }
  }

  const cartLabel = `Carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})`

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
          <NavLink className="header__link" to="/" end>Home</NavLink>
          <NavLink className="header__link" to="/sobre">Sobre</NavLink>
          {auth.user ? (
            <>
              <NavLink className="header__link" to="/consultas">Consultas</NavLink>

              <div className="header__profile" ref={menuRef}>
                <button
                  ref={triggerRef}
                  className={`header__profile-btn${menuOpen ? ' header__profile-btn--open' : ''}`}
                  type="button"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-controls="header-profile-dropdown"
                  onClick={() => setOpenRouteKey(prev => (prev === routeKey ? null : routeKey))}
                >
                  <User size={16} aria-hidden="true" />
                  <span>Perfil</span>
                  <ChevronDown size={15} className="header__chevron" aria-hidden="true" />
                </button>

                {menuOpen && (
                  <div
                    id="header-profile-dropdown"
                    className="header__dropdown"
                    role="region"
                    aria-label="Menu do perfil"
                  >
                    <div className="header__user-summary">
                      <span className="header__user-name">{auth.user.displayName}</span>
                      <span className="header__user-email">{auth.user.email}</span>
                    </div>

                    <div className="header__dropdown-links">
                      <NavLink className="header__dropdown-item" to="/biblioteca" onClick={() => setOpenRouteKey(null)}>
                        <BookOpen size={15} aria-hidden="true" />
                        <span>Minha biblioteca</span>
                      </NavLink>
                      <NavLink className="header__dropdown-item" to="/pedidos" onClick={() => setOpenRouteKey(null)}>
                        <FileText size={15} aria-hidden="true" />
                        <span>Pedidos</span>
                      </NavLink>
                      {auth.user.role === 'ADMIN' && (
                        <NavLink className="header__dropdown-item" to="/admin" onClick={() => setOpenRouteKey(null)}>
                          <Shield size={15} aria-hidden="true" />
                          <span>Administração</span>
                        </NavLink>
                      )}
                      <NavLink className="header__dropdown-item" to="/perfil" onClick={() => setOpenRouteKey(null)}>
                        <User size={15} aria-hidden="true" />
                        <span>Dados pessoais</span>
                      </NavLink>
                    </div>

                    <div className="header__dropdown-footer">
                      <button
                        className="header__logout"
                        type="button"
                        disabled={pending}
                        onClick={() => { void logout() }}
                      >
                        <LogOut size={15} aria-hidden="true" />
                        <span>{pending ? 'Saindo…' : 'Sair'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <NavLink
                to="/carrinho"
                className={({ isActive }) => `header__cart${isActive ? ' header__cart--active' : ''}`}
                aria-label={cartLabel}
              >
                <ShoppingCart size={17} aria-hidden="true" />
                <span className="header__cart-text">Carrinho</span>
                <span
                  className={`header__cart-badge${cartCount === 0 ? ' header__cart-badge--empty' : ''}`}
                  data-testid="cart-count"
                  aria-hidden="true"
                >
                  {cartCount}
                </span>
              </NavLink>
            </>
          ) : (
            <NavLink className="header__login" to="/login">
              Entrar <span aria-hidden="true">→</span>
            </NavLink>
          )}
        </nav>
        {error && <p className="header__error" role="alert">{error}</p>}
      </div>
    </header>
  )
}

export default Header
