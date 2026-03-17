// src/pages/pago/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api, ApiError, tokenStore } from '../../lib/api'
import { ButtonSpinner, PageLoader } from '../../components/LoadingSpinner'
import { ErrorBanner }               from '../../components/ErrorBanner'

type MPStatus = 'approved' | 'rejected' | 'pending' | null

export default function PagoPage() {
  // ── Return from Mercado Pago ──
  const params       = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const mpStatus     = params.get('status') as MPStatus
  const paymentId    = params.get('payment_id')
  const externalRef  = params.get('external_reference')
  const courseId     = params.get('courseId')

  const session = tokenStore.getSession()

  // ── States ──
  const [loading, setLoading]         = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [error, setError]             = useState('')
  const [enrollment, setEnrollment]   = useState<any>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)

  // ── Pre-enroll + get preference if coming fresh ──
  useEffect(() => {
    if (mpStatus) return   // returning from MP — don't auto-enroll again
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
        // Get active or PENDING_PAYMENT enrollment
        const enrollments = await api.enrollments.getMy()
        let pending = enrollments.find((e: any) => e.status === 'PENDING_PAYMENT')

        // If a courseId is provided and no pending enrollment, pre-enroll first
        if (!pending && courseId) {
          pending = await api.enrollments.preEnroll(courseId)
        }

        if (!pending) {
          setError('No tienes ninguna inscripción pendiente de pago.')
          setInitLoading(false)
          return
        }

        setEnrollment(pending)

        // Create preference
        const { checkoutUrl: url } = await api.payments.createPreference(pending.id)
        setCheckoutUrl(url)
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError('Error al preparar el pago. Intenta de nuevo.')
      } finally {
        setInitLoading(false)
      }
    }
    initPayment()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoToMP = () => {
    if (!checkoutUrl) return
    setLoading(true)
    window.location.href = checkoutUrl
  }

  // ─── Return screen: approved ───────────────
  if (mpStatus === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-9 h-9 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-700 mb-2">¡Pago Confirmado!</h1>
          <p className="text-gray-600 text-sm mb-1">Número de pago: <span className="font-mono font-bold">{paymentId}</span></p>
          {externalRef && <p className="text-gray-500 text-xs mb-6">Referencia: {externalRef}</p>}
          <p className="text-gray-600 text-sm mb-6">
            Tu inscripción ha sido activada. Recibirás un correo de confirmación a tu email registrado.
          </p>
          <a
            href="/dashboard-alumno"
            className="block w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Ir a mi Dashboard
          </a>
        </div>
      </div>
    )
  }

  // ─── Return screen: rejected ───────────────
  if (mpStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-9 h-9 text-red-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Pago Rechazado</h1>
          <p className="text-gray-600 text-sm mb-6">
            Tu pago no pudo procesarse. Verifica los datos de tu tarjeta o intenta con otro método.
          </p>
          <a
            href="/pago"
            className="block w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors mb-3"
          >
            Intentar de Nuevo
          </a>
          <a href="/dashboard-alumno" className="text-sm text-gray-500 hover:underline">
            Volver a mi dashboard
          </a>
        </div>
      </div>
    )
  }

  // ─── Return screen: pending ────────────────
  if (mpStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
            <svg className="w-9 h-9 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-yellow-700 mb-2">Pago en Revisión</h1>
          <p className="text-gray-600 text-sm mb-6">
            Tu pago está siendo procesado. Recibirás una notificación cuando sea confirmado. Número: <span className="font-mono font-bold">{paymentId}</span>
          </p>
          <a href="/dashboard-alumno" className="block w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors">
            Ir a mi Dashboard
          </a>
        </div>
      </div>
    )
  }

  // ─── Initial payment screen ─────────────────
  if (initLoading) return <PageLoader message="Preparando tu pago..." />

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Realizar Pago</h1>
          <p className="text-gray-500 text-sm mt-1">Serás redirigido a Mercado Pago</p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {enrollment && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-green-800 mb-1">Inscripción seleccionada:</p>
            <p className="text-sm text-green-700 font-bold">
              {enrollment.course?.language?.name} — Nivel {enrollment.course?.level}
            </p>
            {enrollment.course?.schedule && (
              <p className="text-xs text-green-600 mt-0.5">{enrollment.course.schedule}</p>
            )}
            <p className="text-lg font-bold text-green-800 mt-2">
              ${Number(enrollment.course?.enrollmentFee ?? 0).toLocaleString('es-MX')} MXN
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
          <p className="font-semibold mb-1">🔒 Pago seguro con Mercado Pago</p>
          <p>Acepta tarjetas de crédito/débito, transferencias y efectivo en tiendas de conveniencia.</p>
        </div>

        {checkoutUrl ? (
          <button
            onClick={handleGoToMP}
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading && <ButtonSpinner />}
            {loading ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
          </button>
        ) : !error ? (
          <div className="text-center text-gray-400 text-sm py-4">Preparando opciones de pago...</div>
        ) : null}

        <p className="text-center mt-4">
          <a href="/dashboard-alumno" className="text-gray-400 text-sm hover:underline">
            Volver a mi dashboard
          </a>
        </p>
      </div>
    </div>
  )
}
