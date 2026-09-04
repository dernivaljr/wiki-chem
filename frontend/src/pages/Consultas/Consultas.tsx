import { Atom, BookOpen, FlaskConical, Search } from 'lucide-react'
import './Consultas.css'

function Consultas() {
  return (
    <main className="consultas">
      <section className="consultas__container" aria-labelledby="consultas-title">
        <div className="consultas__heading">
          <p className="consultas__eyebrow">ÁREA DE CONSULTA</p>
          <h1 id="consultas-title">Olá, que descoberta vamos fazer hoje?</h1>
          <p>Pesquise na base de conhecimento do Wiki-Chem e encontre o conteúdo que precisa.</p>
        </div>

        <div className="consultas__search-panel">
          <div className="consultas__panel-top">
            <div>
              <span>BUSCA SEGMENTADA</span>
              <h2>Escolha uma categoria para começar</h2>
            </div>
            <span className="consultas__counter">CONSULTA 01</span>
          </div>

          <div className="consultas__segments" role="tablist" aria-label="Categorias de consulta">
            <button className="is-active" type="button" role="tab" aria-selected="true"><Atom size={20} />Substâncias</button>
            <button type="button" role="tab" aria-selected="false"><FlaskConical size={20} />Técnicas</button>
            <button type="button" role="tab" aria-selected="false"><BookOpen size={20} />Conceitos</button>
          </div>

          <div className="consultas__input">
            <Search size={22} aria-hidden="true" />
            <input type="search" placeholder="Digite um nome, fórmula ou palavra-chave" aria-label="Termo de consulta" />
            <button type="button">Pesquisar</button>
          </div>
          <p className="consultas__suggestions">Sugestões populares: ácido acético · titulação · pH</p>
        </div>
      </section>
    </main>
  )
}

export default Consultas