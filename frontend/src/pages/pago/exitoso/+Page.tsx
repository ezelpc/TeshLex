// src/pages/pago/exitoso/+Page.tsx
import { useEffect } from 'react'

export default function PagoExitosoPage() {
  useEffect(() => {
    // Redirige al dashboard del alumno después de 3 segundos
    const timer = setTimeout(() => {
      window.location.href = '/dashboard-alumno'
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg className="w-9 h-9 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-green-700 mb-2">¡Pago Exitoso!</h1>
        <p className="text-gray-600 text-sm mb-6 mt-2">
          Tu pago ha sido procesado por MercadoPago. En un momento serás redirigido a tu dashboard.
        </p>
        <a
          href="/dashboard-alumno"
          className="block w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Ir a mi Dashboard ahora
        </a>
      </div>
    </div>
  )
}
