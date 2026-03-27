// src/pages/pago/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api, ApiError, tokenStore } from '../../lib/api'
import { ButtonSpinner, PageLoader } from '../../components/LoadingSpinner'
import { ErrorBanner }               from '../../components/ErrorBanner'

import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'

// Inicializar MercadoPago
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-1234', { locale: 'es-MX' })

// ─── Componente del Checkout MP ──────────────────────────────────────────────
function CheckoutForm({ preferenceId }: { preferenceId: string }) {
  return (
    <div className="mt-6 w-full max-w-sm mx-auto">
      <Wallet initialization={{ preferenceId }} />
    </div>
  )
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function PagoPage() {
  const params       = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const courseId     = params.get('courseId')
  
  const session = tokenStore.getSession()

  const [initLoading, setInitLoading] = useState(false)
  const [error, setError]             = useState('')
  const [enrollment, setEnrollment]   = useState<any>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)

  // ── Pre-enroll + get preference if coming fresh ──
  useEffect(() => {
    if (!session) {
      window.location.href = '/login'
      return
    }
    if (session.role !== 'STUDENT') {
      window.location.href = '/login'
      return
    }

    const initPayment = async () => {
      setInitLoading(true)
      setError('')
      try {
        // Obtenemos una inscripción PENDING_PAYMENT
        const enrollments = await api.enrollments.getMy()
        let pending = enrollments.find((e: any) => e.status === 'PENDING_PAYMENT')

        // Si se envió un courseId y no hay inscripción, creamos (pre-inscripción)
        if (!pending && courseId) {
          pending = await api.enrollments.preEnroll(courseId)
        }

        if (!pending) {
          setError('No tienes ninguna inscripción pendiente de pago.')
          setInitLoading(false)
          return
        }

        setEnrollment(pending)

        // Generar Preference en MercadoPago
        const { preferenceId: pId } = await api.payments.createPreference(pending.id)
        setPreferenceId(pId)

        // Opcional: Redirigir directo al link de pago de MercadoPago:
        // if (initPoint) window.location.href = initPoint

      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError('Error al preparar el pago. Intenta de nuevo.')
      } finally {
        setInitLoading(false)
      }
    }
    initPayment()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Initial payment screen ─────────────────
  if (initLoading) return <PageLoader message="Conectando con MercadoPago..." />

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-xl p-8">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Finalizar Inscripción</h1>
          <p className="text-gray-500 text-sm mt-1">Pago seguro con MercadoPago</p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {enrollment && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6 shadow-sm">
            <p className="text-sm font-semibold text-indigo-800 mb-1">Resumen de tu curso:</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg text-indigo-900 font-bold">
                  {enrollment.course?.language?.name} — {enrollment.course?.level}
                </p>
                {enrollment.course?.scheduleDescription && (
                  <p className="text-sm text-indigo-700 mt-1">{enrollment.course.scheduleDescription} ({enrollment.course.startTime} - {enrollment.course.endTime})</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-indigo-900">
                  ${Number(enrollment.course?.price || enrollment.course?.enrollmentFee || 0).toLocaleString('es-MX')}
                </p>
                <p className="text-xs text-indigo-600 font-medium">MXN</p>
              </div>
            </div>
          </div>
        )}

        {preferenceId ? (
          <CheckoutForm preferenceId={preferenceId} />
        ) : !error ? (
          <div className="text-center py-10">
            <ButtonSpinner />
            <span className="text-gray-400 text-sm ml-3">Preparando entorno de pago...</span>
          </div>
        ) : null}

        <p className="text-center mt-6">
          <a href="/dashboard-alumno" className="text-gray-400 text-sm hover:underline hover:text-gray-600 transition-colors">
            ← Cancelar y volver a mi dashboard
          </a>
        </p>
      </div>
    </div>
  )
}
