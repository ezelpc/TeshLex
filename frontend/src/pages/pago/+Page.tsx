import '../../index.css'
import { useState } from 'react'

export default function PagoPage() {
  const [opcion, setOpcion] = useState('tarjeta')
  const [tarjeta, setTarjeta] = useState({ numero: '', expiracion: '', cvv: '' })

  const handlePago = () => {
    alert('Pago realizado exitosamente (Simulacion)')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-xl shadow-md w-full max-w-md p-8">

        <h1 className="text-2xl font-bold text-center text-green-700 mb-6">
          Paso 2: Realizar Pago
        </h1>

        {/* Costo */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
          <p className="font-semibold">Costo del Curso:</p>
          <p>$1,500.00 MXN (Simulado)</p>
        </div>

        <p className="font-semibold text-gray-700 mb-3">Opciones de Pago</p>

        <div className="space-y-3 mb-6">

          {/* Opcion 1 - Recibo */}
          <label className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition-colors ${opcion === 'recibo' ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
            <input
              type="radio"
              name="opcion"
              value="recibo"
              checked={opcion === 'recibo'}
              onChange={() => setOpcion('recibo')}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-gray-700">Imprimir Recibo con Codigo QR y Codigo de Barras</p>
              <p className="text-xs text-blue-600">Paga en bancos o tiendas de conveniencia. (Simulacion)</p>
            </div>
          </label>

          {/* Opcion 2 - Tarjeta */}
          <div className={`border rounded-lg p-4 transition-colors ${opcion === 'tarjeta' ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="radio"
                name="opcion"
                value="tarjeta"
                checked={opcion === 'tarjeta'}
                onChange={() => setOpcion('tarjeta')}
              />
              <p className="text-sm font-semibold text-gray-700">Pagar con Tarjeta de Credito/Debito</p>
            </label>

            {opcion === 'tarjeta' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Numero de Tarjeta (Detecta Visa/Mastercard)"
                  value={tarjeta.numero}
                  onChange={e => setTarjeta({ ...tarjeta, numero: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  maxLength={16}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="MM/AA"
                    value={tarjeta.expiracion}
                    onChange={e => setTarjeta({ ...tarjeta, expiracion: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    maxLength={5}
                  />
                  <input
                    type="text"
                    placeholder="CVV"
                    value={tarjeta.cvv}
                    onChange={e => setTarjeta({ ...tarjeta, cvv: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    maxLength={3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handlePago}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Realizar Pago
        </button>

        <p className="text-center mt-4">
          <a href="/register" className="text-gray-500 text-sm hover:underline">
            Volver a Datos Personales
          </a>
        </p>

      </div>
    </div>
  )
}
