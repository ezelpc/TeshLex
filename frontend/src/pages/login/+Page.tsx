// src/pages/login/+Page.tsx
import { useState } from 'react'
import '../../index.css'
import { api, ApiError } from '../../lib/api'
import { ButtonSpinner } from '../../components/LoadingSpinner'
import { ErrorBanner }   from '../../components/ErrorBanner'

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERADMIN'

function redirectForRole(role: Role) {
  if (role === 'STUDENT')                        return '/dashboard-alumno'
  if (role === 'TEACHER')                        return '/dashboard-profesor'
  if (role === 'ADMIN' || role === 'SUPERADMIN') return '/dashboard-admin'
  return '/dashboard-alumno'
}

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Por favor completa todos los campos.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await api.auth.login(email, password)
      window.location.href = redirectForRole(data.user.role as Role)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Correo o contraseña incorrectos.')
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error de conexión. Verifica tu red e intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-700 rounded-full mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Iniciar Sesión</h1>
          <p className="text-gray-500 text-sm mt-1">TESH — Cursos de Idiomas</p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onClose={() => setError('')} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@tesh.edu.mx"
              className={inputClass}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading && <ButtonSpinner />}
            {loading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div className="mt-5 text-center space-y-2">
          <a href="/olvide-contrasena" className="text-sm text-green-700 hover:underline block">
            ¿Olvidaste tu contraseña?
          </a>
          <p className="text-sm text-gray-500">
            ¿Primera vez?{' '}
            <a href="/register" className="text-green-700 font-semibold hover:underline">
              Inscríbete aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}