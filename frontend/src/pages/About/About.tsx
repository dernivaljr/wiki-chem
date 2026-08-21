import {
  BookOpen,
  FlaskConical,
  ClipboardList,
  PackageSearch,
  Calculator,
  GraduationCap,
  Target,
} from 'lucide-react'

import aboutImage from '../../assets/about-lab.png'
import './About.css'

function About() {
  return (
    <main className="about">
      <section className="about__container">
        <div className="about__content">
          <span className="about__eyebrow">CONHEÇA O PROJETO</span>

          <h1>Sobre o Wiki-Chem</h1>

          <p className="about__intro">
            O <strong>Wiki-Chem</strong> é uma plataforma de apoio ao estudo e
            à consulta de conteúdos de química analítica.
          </p>

          <p>
            Nosso objetivo é reunir conceitos, técnicas e metodologias em um
            ambiente organizado e acessível, facilitando tanto o aprendizado
            quanto a consulta de informações utilizadas na rotina de
            laboratório.
          </p>

          <h2>O que você encontra aqui</h2>

          <ul className="about__list">
            <li>
              <span className="about__item-icon">
                <BookOpen />
              </span>

              <span>
                <strong>Fundamentos de química analítica</strong>, incluindo conceitos
                de análise qualitativa e quantitativa.
              </span>
            </li>

            <li>
              <span className="about__item-icon">
                <FlaskConical />
              </span>

              <span>
                <strong>Técnicas analíticas e instrumentais</strong>, apresentadas de
                forma organizada e objetiva.
              </span>
            </li>

            <li>
              <span className="about__item-icon">
                <ClipboardList />
              </span>

              <span>
                <strong>Metodologias e procedimentos</strong> para diferentes análises
                e aplicações.
              </span>
            </li>

            <li>
              <span className="about__item-icon">
                <PackageSearch />
              </span>

              <span>
                Informações sobre <strong>equipamentos, vidrarias, reagentes e preparo
                de soluções</strong>.
              </span>
            </li>

            <li>
              <span className="about__item-icon">
                <Calculator />
              </span>

              <span>
                Apoio a <strong>cálculos laboratoriais, estequiometria e estatística
                aplicada</strong>.
              </span>
            </li>

            <li>
              <span className="about__item-icon">
                <GraduationCap />
              </span>

              <span>
                <strong>Conteúdo baseado em referências técnicas</strong> para
                estudantes, professores e profissionais da área.
              </span>
            </li>
          </ul>
        </div>

        <div className="about__visual">
          <div className="about__image-wrapper">
            <img
              src={aboutImage}
              alt="Laboratório de química analítica com instrumentação e vidrarias"
            />
          </div>

          <div className="about__decoration" aria-hidden="true"></div>
        </div>
      </section>

      <section className="about__mission">
        <div className="about__mission-content">
          <div className="about__mission-icon">
            <Target />
          </div>

          <div className="about__mission-text">
            <span className="about__eyebrow">NOSSA PROPOSTA</span>

            <h2>Conhecimento técnico mais acessível</h2>

            <p>
              Mais do que reunir informações, o Wiki-Chem busca facilitar o
              acesso ao conhecimento técnico, conectando fundamentos teóricos às
              aplicações reais da química analítica.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default About