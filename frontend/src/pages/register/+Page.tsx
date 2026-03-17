import '../../index.css'
import { useState } from 'react'

export default function RegisterPage() {
  const [form, setForm] = useState({
    nombre: '',
    matricula: '',
    curp: '',
    carrera: '',
    semestre: '',
    fechaNacimiento: '',
    email: '',
    telefono: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const vacios = Object.values(form).some(v => v === '')
    if (vacios) {
      setError('Por favor completa todos los campos.')
      return
    }
    setError('')
    // Aquí irá la conexión al backend
    alert('Registro exitoso (simulación)')
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-xl shadow-md w-full max-w-md p-8">

        <h1 className="text-2xl font-bold text-center text-green-700 mb-6">
          Registro - Datos Personales
        </h1>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre Completo (Empezando por Apellidos)"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Matrícula TESH"
            value={form.matricula}
            onChange={e => setForm({ ...form, matricula: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="CURP"
            value={form.curp}
            onChange={e => setForm({ ...form, curp: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Carrera (Ej: Ing. en Sistemas)"
            value={form.carrera}
            onChange={e => setForm({ ...form, carrera: e.target.value })}
            className={inputClass}
          />

          <select
            value={form.semestre}
            onChange={e => setForm({ ...form, semestre: e.target.value })}
            className={`${inputClass} text-gray-500 bg-white`}
          >
            <option value="">Seleccione Semestre</option>
            {['1ro', '2do', '3ro', '4to', '5to', '6to', '7mo', '8vo'].map(s => (
              <option key={s} value={s}>{s} Semestre</option>
            ))}
          </select>

          <div>
            <label className="block text-sm text-blue-600 mb-1">
              Fecha de Nacimiento:
            </label>
            <input
              type="date"
              value={form.fechaNacimiento}
              onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })}
              className={inputClass}
            />
          </div>

          <input
            type="email"
            placeholder="Email de Contacto Personal"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          <input
            type="tel"
            placeholder="Teléfono de Contacto"
            value={form.telefono}
            onChange={e => setForm({ ...form, telefono: e.target.value })}
            className={inputClass}
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Continuar
          </button>
        </form>

        <p className="text-center mt-4">
          <a href="/login" className="text-gray-500 text-sm hover:underline">
            Cancelar y Volver
          </a>
        </p>

      </div>
    </div>
  )
}