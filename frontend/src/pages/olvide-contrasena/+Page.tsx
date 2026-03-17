import '../../index.css'
import { useState } from 'react'

export default function OlvideContrasenaPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Por favor ingresa tu correo electronico.')
      return
    }
    setError('')
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-md w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-green-700 mb-2">Correo Enviado</h2>
          <p className="text-gray-500 text-sm mb-6">
            Hemos enviado instrucciones de recuperacion a {email}. Revisa tu bandeja de entrada.
          </p>
          <a href="/login" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
            Ir a Iniciar Sesion
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-green-700 mb-2">
          Olvide mi Contrasena
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          Ingresa tu correo y te enviaremos instrucciones para recuperar tu acceso.
        </p>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Correo Electronico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Enviar Instrucciones
          </button>
        </form>

        <p className="text-center mt-4">
          <a href="/login" className="text-gray-500 text-sm hover:underline">
            Volver al Login
          </a>
        </p>
      </div>
    </div>
  )
}
