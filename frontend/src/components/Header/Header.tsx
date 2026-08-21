import wikiChemSymbol from '../../assets/wiki-chem-symbol.png'
import './Header.css'
import { NavLink } from 'react-router-dom'

function Header() {
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
        </nav>
      </div>
    </header>
  )
}

export default Header