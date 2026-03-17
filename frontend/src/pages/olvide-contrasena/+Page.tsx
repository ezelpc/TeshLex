// src/pages/olvide-contrasena/+Page.tsx
import '../../index.css'

export default function OlvideContrasenaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
          <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Recuperar Contraseña</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Para recuperar tu contraseña, comunícate directamente con el área de Administración del TESH.
        </p>

        {/* Contact card */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-left space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-xl">📧</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">Correo Electrónico</p>
              <a href="mailto:lenguas@tesh.edu.mx" className="text-sm font-bold text-green-700 hover:underline">
                lenguas@tesh.edu.mx
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">📞</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">Teléfono</p>
              <a href="tel:5558111234" className="text-sm font-bold text-green-700 hover:underline">
                (55) 5811-1234
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">🕐</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">Horario de Atención</p>
              <p className="text-sm font-bold text-gray-700">Lunes–Viernes 8:00–17:00</p>
            </div>
          </div>
        </div>

        <a
          href="/login"
          className="block w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Volver al Inicio de Sesión
        </a>
      </div>
    </div>
  )
}
