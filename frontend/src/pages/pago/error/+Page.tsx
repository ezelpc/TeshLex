// src/pages/pago/error/+Page.tsx
export default function PagoErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <svg className="w-9 h-9 text-red-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-red-700 mb-2">Pago Rechazado</h1>
        <p className="text-gray-600 text-sm mb-6 mt-2">
          Ocurrió un problema con el pago y fue rechazado por MercadoPago. Por favor, intenta de nuevo usando otro método de pago.
        </p>
        <div className="space-y-3">
          <a
            href="/pago"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Reintentar Pago
          </a>
          <a
            href="/dashboard-alumno"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
          >
            Volver a mi Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
