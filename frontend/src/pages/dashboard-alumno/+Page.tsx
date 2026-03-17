// src/pages/dashboard-alumno/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api, ApiError }         from '../../lib/api'
import { useRequireRole }        from '../../hooks/useRequireRole'
import { PageLoader }            from '../../components/LoadingSpinner'
import { ErrorBanner }           from '../../components/ErrorBanner'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function DashboardAlumno() {
  const { user } = useRequireRole('STUDENT')

  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.enrollments.getMy()
        setEnrollments(data)
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError('Error al cargar tus inscripciones.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  if (!user) return null   // will redirect

  const active        = enrollments.find((e: any) => e.status === 'ACTIVE')
  const pendingPay    = enrollments.find((e: any) => e.status === 'PENDING_PAYMENT')
  const history       = enrollments.filter((e: any) => ['COMPLETED', 'DROPPED', 'EXPELLED'].includes(e.status))
  const completedLvls = enrollments.filter((e: any) => e.status === 'COMPLETED').map((e: any) => e.course?.level)

  const handleLogout = async () => {
    await api.auth.logout()
    window.location.href = '/login'
  }

  if (loading) return <PageLoader message="Cargando tu dashboard..." />

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      {/* Navbar */}
      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center shadow-md">
        <span className="font-bold text-lg">TESH — Mi Cuenta</span>
        <div className="flex items-center gap-4">
          <span className="text-green-200 text-sm">
            {user.firstName} {user.lastName}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        <h2 className="text-xl font-bold text-gray-800">
          Bienvenido(a), {user.firstName}
        </h2>

        {error && <ErrorBanner message={error} onRetry={() => window.location.reload()} />}

        {/* Pago pendiente */}
        {pendingPay && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-orange-800 text-sm">Tienes una inscripción pendiente de pago</p>
              <p className="text-orange-600 text-sm">
                {pendingPay.course?.language?.name} — {pendingPay.course?.level}
              </p>
            </div>
            <a
              href={`/pago?enrollmentId=${pendingPay.id}`}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors"
            >
              Ir a Pagar
            </a>
          </div>
        )}

        {/* Info + Horario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Información General</h3>
            <div className="space-y-1.5 text-sm text-gray-700">
              <p><span className="font-semibold">Nombre:</span> {user.lastName} {user.firstName}</p>
              <p><span className="font-semibold">Email:</span> {user.email}</p>
              <p><span className="font-semibold">Rol:</span> Alumno</p>
              {active && (
                <>
                  <p><span className="font-semibold">Idioma:</span> {active.course?.language?.name}</p>
                  <p><span className="font-semibold">Nivel Actual:</span>{' '}
                    <span className="text-blue-600 font-bold">{active.course?.level}</span>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Inscripción Activa</h3>
            {active ? (
              <div className="space-y-1.5 text-sm text-gray-700">
                {active.course?.schedule && (
                  <p><span className="font-semibold">Horario:</span> {active.course.schedule}</p>
                )}
                {active.course?.teacher && (
                  <p><span className="font-semibold">Profesor:</span>{' '}
                    {active.course.teacher.user?.firstName} {active.course.teacher.user?.lastName}
                  </p>
                )}
                {active.grades && active.grades[0] != null && (
                  <p><span className="font-semibold">Calificación parcial:</span>{' '}
                    <span className={active.grades[0] < 7 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                      {active.grades[0]}
                    </span>
                  </p>
                )}
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-2">
                  <p className="text-xs text-green-700 font-semibold">✅ Sin adeudos pendientes</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Sin inscripción activa en este momento.</p>
            )}
          </div>
        </div>

        {/* Progreso de niveles */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-green-700 font-bold text-lg mb-4">Progreso de Niveles</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {LEVELS.map(lvl => {
              const done    = completedLvls.includes(lvl)
              const current = active?.course?.level === lvl
              return (
                <div key={lvl} className="flex items-center gap-1.5">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2
                    ${done    ? 'bg-green-600 border-green-600 text-white' : ''}
                    ${current ? 'bg-blue-600 border-blue-600 text-white' : ''}
                    ${!done && !current ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
                  `}>
                    {lvl}
                  </div>
                  {lvl !== 'C2' && (
                    <div className={`w-6 h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" />Completado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />En curso</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />Pendiente</span>
          </div>
        </div>

        {/* Historial Académico */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-green-700 font-bold text-lg mb-4">Historial Académico</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aún no tienes cursos completados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Idioma / Nivel</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Calificación</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Estado</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-semibold">Boleta</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((e: any) => {
                    const docs     = e.documents ?? []
                    const boleta   = docs.find((d: any) => d.type === 'GRADE_REPORT' && d.status === 'RELEASED')
                    const approved = e.finalGrade != null && e.finalGrade >= 7
                    return (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-700">
                          {e.course?.language?.name} — {e.course?.level}
                        </td>
                        <td className="py-2 px-3">
                          {e.finalGrade != null ? (
                            <span className={`font-bold ${approved ? 'text-green-600' : 'text-red-600'}`}>
                              {e.finalGrade}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            e.status === 'COMPLETED' ? (approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {e.status === 'COMPLETED' ? (approved ? 'Aprobado' : 'Reprobado') : e.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {boleta ? (
                            <a href={boleta.fileUrl ?? '#'} target="_blank" rel="noreferrer"
                              className="text-blue-600 hover:underline text-xs font-medium">
                              Descargar
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">No disponible</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Observaciones del Profesor */}
        {active?.teacherComments && active.teacherComments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Observaciones del Profesor</h3>
            {active.teacherComments.map((c: any) => (
              <p key={c.id} className="text-sm text-gray-600 italic border-l-2 border-green-300 pl-3 py-1">
                "{c.message}"
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
