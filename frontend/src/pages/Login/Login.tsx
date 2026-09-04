import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, FlaskConical, LockKeyhole, Mail, UserRound } from 'lucide-react'
import './Login.css'

type AuthMode = 'login' | 'register'

function Login() {
	const [mode, setMode] = useState<AuthMode>('login')
	const [showPassword, setShowPassword] = useState(false)
	const [submitted, setSubmitted] = useState(false)
	const navigate = useNavigate()

	const isRegistering = mode === 'register'

	function changeMode(nextMode: AuthMode) {
		setMode(nextMode)
		setSubmitted(false)
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!isRegistering) {
			navigate('/consultas')
			return
		}
		setSubmitted(true)
	}

	return (
		<main className="auth-page">
			<div className="auth-page__backdrop" aria-hidden="true">
				<span className="auth-page__formula auth-page__formula--one">H₂O</span>
				<span className="auth-page__formula auth-page__formula--two">C₆H₁₂O₆</span>
				<span className="auth-page__formula auth-page__formula--three">NaCl</span>
			</div>

			<section className="auth" aria-labelledby="auth-title">
				<div className="auth__intro">
					<div className="auth__mark"><FlaskConical size={24} /></div>
					<p className="auth__eyebrow">ACESSO AO SERVIÇO</p>
					<h1 id="auth-title">Conhecimento químico, <em>ao seu alcance.</em></h1>
					<p className="auth__description">
						Consulte propriedades, reações e referências confiáveis em um só lugar.
					</p>
					<div className="auth__note">
						<span className="auth__note-dot" />
						<span>Base de dados para quem transforma curiosidade em descoberta.</span>
					</div>
				</div>

				<div className="auth__panel">
					<div className="auth__panel-heading">
						<div>
							<p className="auth__kicker">WIKI-CHEM</p>
							<h2>{isRegistering ? 'Crie sua conta' : 'Bem-vindo de volta'}</h2>
						</div>
						<span className="auth__step">01 / 01</span>
					</div>

					<div className="auth__tabs" role="tablist" aria-label="Acesso">
						<button
							className={!isRegistering ? 'is-active' : ''}
							onClick={() => changeMode('login')}
							role="tab"
							aria-selected={!isRegistering}
							type="button"
						>Entrar</button>
						<button
							className={isRegistering ? 'is-active' : ''}
							onClick={() => changeMode('register')}
							role="tab"
							aria-selected={isRegistering}
							type="button"
						>Criar conta</button>
					</div>

					<form className="auth__form" onSubmit={handleSubmit}>
						{isRegistering && (
							<label className="auth__field">
								<span>Nome completo</span>
								<div className="auth__input-wrap">
									<UserRound size={18} aria-hidden="true" />
									<input name="name" type="text" placeholder="Como podemos chamar você?" required />
								</div>
							</label>
						)}

						<label className="auth__field">
							<span>E-mail</span>
							<div className="auth__input-wrap">
								<Mail size={18} aria-hidden="true" />
								<input name="email" type="email" placeholder="voce@exemplo.com" required />
							</div>
						</label>

						<label className="auth__field">
							<span>Senha</span>
							<div className="auth__input-wrap">
								<LockKeyhole size={18} aria-hidden="true" />
								<input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" minLength={6} required />
								<button
									className="auth__password-toggle"
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
								>
									{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
								</button>
							</div>
						</label>

						{isRegistering ? (
							<label className="auth__check">
								<input type="checkbox" required />
								<span>Concordo com os termos de uso e a política de privacidade.</span>
							</label>
						) : (
							<div className="auth__form-options">
								<label className="auth__check">
									<input type="checkbox" />
									<span>Manter conectado</span>
								</label>
								<button className="auth__link" type="button">Esqueci minha senha</button>
							</div>
						)}

						<button className="auth__submit" type="submit">
							{isRegistering ? 'Criar minha conta' : 'Entrar no Wiki-Chem'}
							<span aria-hidden="true">→</span>
						</button>
						{submitted && (
							<p className="auth__feedback" role="status">
								{isRegistering ? 'Conta criada com sucesso.' : 'Acesso validado com sucesso.'}
							</p>
						)}
					</form>

					<p className="auth__switch">
						{isRegistering ? 'Já possui uma conta?' : 'Ainda não possui uma conta?'}{' '}
						<button type="button" onClick={() => changeMode(isRegistering ? 'login' : 'register')}>
							{isRegistering ? 'Entrar' : 'Cadastre-se'}
						</button>
					</p>
				</div>
			</section>
		</main>
	)
}

export default Login
