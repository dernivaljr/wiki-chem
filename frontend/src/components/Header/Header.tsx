import wikiChemSymbol from '../../assets/wiki-chem-symbol.png'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header__container">
        <a
          className="header__brand"
          href="/"
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
        </a>

        <nav className="header__nav" aria-label="Navegação principal">
          <a href="/">Home</a>
          <a href="/sobre">Sobre</a>
        </nav>
      </div>
    </header>
  )
}

export default Header