// src/pages/register/+Page.tsx
import { useState }      from 'react'
import '../../index.css'
import { api, ApiError } from '../../lib/api'
import { ButtonSpinner } from '../../components/LoadingSpinner'
import { ErrorBanner }   from '../../components/ErrorBanner'

const CAREERS = [
  'Ing. en Sistemas Computacionales',
  'Ing. Industrial',
  'Ing. en Mecatrónica',
  'Ing. en Electrónica',
  'Ing. en Administración',
  'Lic. en Administración',
  'Lic. en Contaduría',
  'Otra',
]

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName:  '',
    lastName:   '',
    matricula:  '',
    career:     '',
    semester:   '',
    email:      '',
    password:   '',
    phone:      '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { firstName, lastName, matricula, career, semester, email, password } = form
    if (!firstName || !lastName || !matricula || !career || !semester || !email || !password) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setError('')
    setLoading(true)
    try {
      // 1. Registrar alumno
      await api.users.registerStudent({
        firstName,
        lastName,
        email,
        password,
        matricula,
        career,
        semester: parseInt(semester, 10),
        phone: form.phone || undefined,
      })

      // 2. Login automático para obtener JWT
      await api.auth.login(email, password)

      // 3. Redirigir al pago (el alumno elegirá su curso en ese paso)
      window.location.href = '/dashboard-alumno'
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error de conexión. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Registro de Alumno</h1>
          <p className="text-gray-500 text-sm mt-1">TESH — Cursos de Idiomas</p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onClose={() => setError('')} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-xs font-medium text-gray-600 mb-1">Nombre(s) *</label>
              <input id="firstName" type="text" value={form.firstName} onChange={set('firstName')} className={inputClass} placeholder="Juan" required />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label>
              <input id="lastName" type="text" value={form.lastName} onChange={set('lastName')} className={inputClass} placeholder="Velásquez Torres" required />
            </div>
          </div>

          <div>
            <label htmlFor="matricula" className="block text-xs font-medium text-gray-600 mb-1">Matrícula TESH *</label>
            <input id="matricula" type="text" value={form.matricula} onChange={set('matricula')} className={inputClass} placeholder="2021123456" required />
          </div>

          <div>
            <label htmlFor="career" className="block text-xs font-medium text-gray-600 mb-1">Carrera *</label>
            <select id="career" value={form.career} onChange={set('career')} className={`${inputClass} bg-white text-gray-700`} required>
              <option value="">Selecciona tu carrera</option>
              {CAREERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="semester" className="block text-xs font-medium text-gray-600 mb-1">Semestre actual *</label>
            <select id="semester" value={form.semester} onChange={set('semester')} className={`${inputClass} bg-white text-gray-700`} required>
              <option value="">Selecciona semestre</option>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}° Semestre</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input id="email" type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="juan.velasquez@tesh.edu.mx" required autoComplete="email" />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1">Contraseña * (mín. 8 caracteres)</label>
            <input id="password" type="password" value={form.password} onChange={set('password')} className={inputClass} placeholder="••••••••" required autoComplete="new-password" />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-gray-600 mb-1">Teléfono (opcional)</label>
            <input id="phone" type="tel" value={form.phone} onChange={set('phone')} className={inputClass} placeholder="5512345678" />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center mt-2"
          >
            {loading && <ButtonSpinner />}
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center mt-4">
          <a href="/login" className="text-gray-500 text-sm hover:underline">
            ¿Ya tienes cuenta? Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}