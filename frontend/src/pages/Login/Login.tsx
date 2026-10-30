import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { safeReturnTo } from '../../auth/returnTo'
import { Eye, EyeOff, FlaskConical, LockKeyhole, Mail, UserRound } from 'lucide-react'
import './Login.css'

type AuthMode = 'login' | 'register'

function Login() {
	const [mode, setMode] = useState<AuthMode>('login')
	const [showPassword, setShowPassword] = useState(false)
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [pending, setPending] = useState(false)
	const auth = useAuth()
	const [params] = useSearchParams()
	const returnTo = safeReturnTo(params.get('returnTo'))
	const navigate = useNavigate()

	const isRegistering = mode === 'register'

	function changeMode(nextMode: AuthMode) {
		setMode(nextMode)
		setMessage(''); setError('')
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const form = event.currentTarget
		const values = new FormData(form)
		const email = String(values.get('email') ?? '')
		const password = String(values.get('password') ?? '')
		setPending(true); setError(''); setMessage('')
		try {
			if (isRegistering) {
				await auth.register({ displayName: String(values.get('name') ?? ''), email, password })
				form.reset(); setMode('login'); setShowPassword(false)
				setMessage('Conta criada. Entre com seu e-mail e senha.')
			} else {
				await auth.login({ email, password })
				navigate(returnTo, { replace: true })
			}
		} catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível concluir o acesso.') }
		finally { setPending(false) }
	}

	if (auth.user) return <Navigate to={returnTo} replace />

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
						Acesse sua conta e acompanhe a evolução da plataforma de química analítica.
					</p>
					<div className="auth__note">
						<span className="auth__note-dot" />
						<span>Ambiente acadêmico de demonstração. Sem cobrança.</span>
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

					<div className="auth__tabs" role="tablist" aria-label="Acesso" onKeyDown={event => {
						if (!pending && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
							event.preventDefault()
							const next = event.key === 'Home' ? 'login' : event.key === 'End' ? 'register' : isRegistering ? 'login' : 'register'
							changeMode(next)
							document.getElementById('auth-tab-' + next)?.focus()
						}
					}}>
						<button
							className={!isRegistering ? 'is-active' : ''}
							onClick={() => changeMode('login')}
							disabled={pending}
							id="auth-tab-login"
							aria-controls="auth-form"
							tabIndex={!isRegistering ? 0 : -1}
							role="tab"
							aria-selected={!isRegistering}
							type="button"
						>Entrar</button>
						<button
							className={isRegistering ? 'is-active' : ''}
							onClick={() => changeMode('register')}
							disabled={pending}
							id="auth-tab-register"
							aria-controls="auth-form"
							tabIndex={isRegistering ? 0 : -1}
							role="tab"
							aria-selected={isRegistering}
							type="button"
						>Criar conta</button>
					</div>

					<form id="auth-form" role="tabpanel" aria-labelledby={isRegistering ? 'auth-tab-register' : 'auth-tab-login'} className="auth__form" onSubmit={handleSubmit} aria-busy={pending}>
						{isRegistering && (
							<label className="auth__field">
								<span>Nome completo</span>
								<div className="auth__input-wrap">
									<UserRound size={18} aria-hidden="true" />
									<input name="name" type="text" placeholder="Como podemos chamar você?" autoComplete="name" maxLength={100} required />
								</div>
							</label>
						)}

						<label className="auth__field">
							<span>E-mail</span>
							<div className="auth__input-wrap">
								<Mail size={18} aria-hidden="true" />
								<input name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" maxLength={254} required />
							</div>
						</label>

						<label className="auth__field">
							<span>Senha</span>
							<div className="auth__input-wrap">
								<LockKeyhole size={18} aria-hidden="true" />
								<input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" minLength={12} maxLength={128} autoComplete={isRegistering ? 'new-password' : 'current-password'} required />
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

						<p className="auth__notice">Senha de 12 a 128 caracteres. Recuperação de senha ainda indisponível.</p>

						<button className="auth__submit" type="submit" disabled={pending}>
							{pending ? 'Aguarde…' : isRegistering ? 'Criar minha conta' : 'Entrar no Wiki-Chem'}
							<span aria-hidden="true">→</span>
						</button>
						{error && <p className="auth__error" role="alert">{error}</p>}
						{message && <p className="auth__feedback" role="status">{message}</p>}
						{(auth.expired || params.get('expired') === '1') && <p role="status">Sua sessão expirou. Entre novamente.</p>}

					</form>

					<p className="auth__switch">
						{isRegistering ? 'Já possui uma conta?' : 'Ainda não possui uma conta?'}{' '}
						<button type="button" disabled={pending} onClick={() => changeMode(isRegistering ? 'login' : 'register')}>
							{isRegistering ? 'Entrar' : 'Cadastre-se'}
						</button>
					</p>
				</div>
			</section>
		</main>
	)
}

export default Login
