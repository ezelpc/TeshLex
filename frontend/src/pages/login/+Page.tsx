import { useState } from 'react'
import '../../index.css'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', rol: '' })
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.rol) {
      setError('Por favor completa todos los campos.')
      return
    }
    setError('')
    if (form.rol === 'administrador') window.location.href = '/dashboard-admin'
    else if (form.rol === 'profesor') window.location.href = '/dashboard-profesor'
    else window.location.href = '/dashboard-alumno'
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-green-700 mb-6">
          Iniciar Sesión
        </h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
          <p className="font-semibold mb-1">Credenciales de Prueba (Simulación):</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Alumno: <span className="text-blue-600">alumno@tesh.edu.mx</span> / pass123</li>
            <li>Profesor: <span className="text-blue-600">profesor@tesh.edu.mx</span> / pass123</li>
            <li>Administrador: <span className="text-blue-600">admin@tesh.edu.mx</span> / pass123</li>
          </ul>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={form.rol}
            onChange={e => setForm({ ...form, rol: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
          >
            <option value="">Seleccionar Rol</option>
            <option value="alumno">Alumno</option>
            <option value="profesor">Profesor</option>
            <option value="administrador">Administrador</option>
          </select>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Ingresar al Sistema
          </button>
        </form>

        <p className="text-center mt-4">
          <a href="olvide-contrasena" className="text-blue-600 text-sm hover:underline">
            ¿Olvidaste tu Contraseña?
          </a>
        </p>
      </div>
    </div>
  )
}