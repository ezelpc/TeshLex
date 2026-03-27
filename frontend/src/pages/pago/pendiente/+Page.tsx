// src/pages/pago/pendiente/+Page.tsx
export default function PagoPendientePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
          <svg className="w-9 h-9 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-yellow-700 mb-2">Pago en Revisión</h1>
        <p className="text-gray-600 text-sm mb-6 mt-2">
          MercadoPago ha recibido tu intención de pago, pero aún está pendiente (por ejemplo, si elegiste pagar en efectivo en OXXO). Tu inscripción se activará en cuanto el pago sea aprobado.
        </p>
        <a
          href="/dashboard-alumno"
          className="block w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Volver a mi Dashboard
        </a>
      </div>
    </div>
  )
}
