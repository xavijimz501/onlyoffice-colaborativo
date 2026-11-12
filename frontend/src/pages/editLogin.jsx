import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HeaderGobMX from '../components/HeaderGobMx'
import FooterGobMX from '../components/footer'
import { login } from '../services/authService'
import '../App.css'

export default function EditLogin() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await login(correo.trim(), password)
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))
      navigate('/admin', { replace: true, state: { user: result.user } })
    } catch (cause) {
      setError(cause.message || 'No se pudo iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <HeaderGobMX />
      <main className="login-container">
        <section className="login-card">
          <h1>Acceso al editor</h1>
          <p>Ingresa con tu cuenta para colaborar en documentos.</p>
          {error && <div className="login-error-alert" role="alert">{error}</div>}
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="correo">Correo electrónico</label>
            <input id="correo" name="correo" type="email" autoComplete="username" required value={correo} onChange={(event) => setCorreo(event.target.value)} />
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="submit" disabled={submitting}>{submitting ? 'Validando…' : 'Iniciar sesión'}</button>
          </form>
        </section>
      </main>
      <FooterGobMX />
    </div>
  )
}
