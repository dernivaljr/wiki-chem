import { Atom, BookOpen, FlaskConical, Search } from 'lucide-react'
import './Consultas.css'

function Consultas() {
  return (
    <main className="consultas">
      <section className="consultas__container" aria-labelledby="consultas-title">
        <div className="consultas__heading">
          <p className="consultas__eyebrow">ÁREA DE CONSULTA</p>
          <h1 id="consultas-title">Olá, que descoberta vamos fazer hoje?</h1>
          <p>Sua conta está ativa. A pesquisa será disponibilizada em um próximo incremento.</p>
        </div>

        <div className="consultas__search-panel">
          <div className="consultas__panel-top">
            <div>
              <span>BUSCA SEGMENTADA</span>
              <h2>Escolha uma categoria para começar</h2>
            </div>
            <span className="consultas__counter">CONSULTA 01</span>
          </div>

          <div className="consultas__segments" role="group" aria-label="Categorias de consulta indisponíveis">
            <button className="is-active" type="button" disabled><Atom size={20} />Substâncias</button>
            <button type="button" disabled><FlaskConical size={20} />Técnicas</button>
            <button type="button" disabled><BookOpen size={20} />Conceitos</button>
          </div>

          <div className="consultas__input">
            <Search size={22} aria-hidden="true" />
            <input aria-describedby="search-unavailable" type="search" placeholder="Digite um nome, fórmula ou palavra-chave" aria-label="Termo de consulta" />
            <button type="button" disabled>Pesquisar — indisponível</button>
          </div>
          <p className="consultas__suggestions" id="search-unavailable">Pesquisa e filtros ainda indisponíveis. Nenhuma consulta é executada nesta etapa.</p>
        </div>
      </section>
    </main>
  )
}

export default Consultas