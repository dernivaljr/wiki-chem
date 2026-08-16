import './Hero.css'

function Hero() {
  return (
    <section className="hero">
      <div className="hero__overlay"></div>

      <div className="hero__content">
        <h1>Wiki-Chem</h1>

        <h2>
          Química analítica de forma clara,
          <br />
          prática e acessível.
        </h2>

        <p>
          Explore técnicas, metodologias, conceitos e cálculos aplicados ao
          laboratório em um ambiente organizado para estudo e consulta.
        </p>

        <a className="hero__button" href="#conteudos">
          Explorar conteúdos
        </a>
      </div>
    </section>
  )
}

export default Hero