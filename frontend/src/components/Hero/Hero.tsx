import './Hero.css'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

function Hero() {
  const auth = useAuth()
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
          Explore guias técnicos, metodologias analíticas, referências
          normativas e cálculos aplicados ao laboratório em um acervo digital
          organizado para consulta profissional e acadêmica.
        </p>

        <Link className="hero__button" to={auth.user ? '/consultas' : '/login'}>
          Explorar conteúdos
        </Link>
      </div>
    </section>
  )
}

export default Hero
