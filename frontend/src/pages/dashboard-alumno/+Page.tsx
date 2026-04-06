// src/pages/dashboard-alumno/+Page.tsx
import '../../index.css'
import React, { useState, useEffect } from 'react'
import { api }                   from '../../lib/api'
import { useAuth }                from '../../context/AuthContext'
import { useRequireRole }         from '../../hooks/useRequireRole'
import { PageLoader }             from '../../components/LoadingSpinner'
import { ErrorBanner }            from '../../components/ErrorBanner'
import { WeeklyCalendar }         from '../../components/WeeklyCalendar'
import { DashboardLayout }        from '../../components/DashboardLayout'
import { PrintableSchedule }      from '../../components/PrintableSchedule'

const ALUMNO_TABS = [
  { id: 'home',     label: 'Mi Curso',   icon: '' },
  { id: 'progress', label: 'Mi Progreso', icon: '' },
  { id: 'history',  label: 'Historial',  icon: '' },
  { id: 'payments', label: 'Pagos',      icon: '' },
]

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

import type { EnrollmentDTO, PaymentDTO } from '../../shared/types'

export default function DashboardAlumno() {
  const { user } = useRequireRole('STUDENT')
  const [activeTab, setActiveTab] = useState('home')

  const [enrollments, setEnrollments] = useState<EnrollmentDTO[]>([])
  const [payments,    setPayments]    = useState<PaymentDTO[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const [enrollData, payData] = await Promise.all([
          api.enrollments.getMy(),
          api.payments.getMy(),
        ])
        setEnrollments(Array.isArray(enrollData) ? enrollData : (enrollData as any).data || [])
        setPayments(Array.isArray(payData) ? payData : (payData as any).data || [])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al cargar datos'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const { isLoading: sessionLoading } = useAuth()
  if (sessionLoading) return <PageLoader message="Verificando sesión..." />
  if (!user) return null
  if (loading) return <PageLoader message="Cargando tu dashboard..." />

  const active        = Array.isArray(enrollments) ? enrollments.find(e => e.status === 'ACTIVE') : null
  const pendingPay    = Array.isArray(enrollments) ? enrollments.find(e => e.status === 'PENDING_PAYMENT') : null
  const history       = Array.isArray(enrollments) ? enrollments.filter(e => ['COMPLETED', 'DROPPED', 'EXPELLED'].includes(e.status)) : []
  
  const completedLvls = Array.isArray(enrollments) 
    ? enrollments
        .filter(e => e.status === 'COMPLETED' && e.course?.languageId === active?.course?.languageId)
        .map(e => e.course?.level)
    : []

  return (
    <DashboardLayout
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      tabs={ALUMNO_TABS}
      title="Mi Portal TeshLex"
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={() => window.location.reload()} />}

        {/* ── Pending Payment Alert ────────────────── */}
        {pendingPay && (
          <div className="bg-orange-600 p-6 rounded-2xl text-white shadow-xl shadow-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-bounce-slow">
            <div>
              <p className="font-bold text-lg uppercase tracking-tight">Inscripción pendiente de pago</p>
              <p className="text-orange-100 font-medium">{pendingPay.course?.language?.name} — {pendingPay.course?.level}</p>
            </div>
            <a href={`/pago?enrollmentId=${pendingPay.id}`} className="bg-white text-orange-600 font-black px-8 py-3 rounded-xl hover:bg-orange-50 transition-all uppercase text-sm">
              Completar Pago
            </a>
          </div>
        )}

        {/* ── Home Tab (Active Course & Calendar) ──── */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active course details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">{active?.course?.language?.name || 'Inscripción'}</h3>
                        <p className="text-blue-600 font-bold text-lg">{active?.course?.level || 'Nivel —'}</p>
                      </div>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight italic">Activo</span>
                  </div>

                  {active ? (
                    <div className="space-y-4">
                       <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Horario & Aula</p>
                        <p className="text-sm font-bold text-gray-700">Horario: {active.course.scheduleDescription}</p>
                        <p className="text-sm font-bold text-gray-700">Aula: {active.course.classroom || 'Por confirmar'}</p>
                      </div>
                      
                      {active.course.teacher && (
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 bg-slate-900 text-white flex items-center justify-center rounded-full font-black text-xs">
                             {active.course.teacher.user?.firstName[0]}
                           </div>
                           <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase">Profesor(a)</p>
                             <p className="text-sm font-bold text-slate-700">{active.course.teacher.user?.firstName} {active.course.teacher.user?.lastName}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                       <p className="text-slate-400 font-medium mb-4 italic">No tienes un curso activo</p>
                       <a href="/catalogo" className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase">Ver Catálogo</a>
                    </div>
                  )}
                </div>

                {active?.course?.meetingLink && (
                  <a 
                    href={active.course.meetingLink} target="_blank" rel="noreferrer" 
                    className="mt-8 w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all text-center flex items-center justify-center gap-2 shadow-md uppercase text-xs tracking-wide"
                  >
                    Unirse a Sesión Virtual
                  </a>
                )}
              </div>

              {/* General info or stats could go here, for now a "Tips" card or similar */}
              {/* Financial info */}
              <div className="bg-gray-800 text-white p-6 rounded-xl shadow-md flex flex-col justify-center no-print">
                 <p className="text-blue-400 font-bold text-xs uppercase mb-1 tracking-widest">Estado de Cuenta</p>
                 <h4 className="text-3xl font-bold mb-4">$0.00</h4>
                 <p className="text-gray-400 text-xs font-medium">No tiene adeudos pendientes.</p>
                 <div className="mt-8 pt-6 border-t border-gray-700 flex gap-3">
                    <button 
                      onClick={() => window.print()} 
                      className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all"
                    >
                      Descargar Horario (PDF)
                    </button>
                    <a href="/costos" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all">Tarifario</a>
                 </div>
              </div>
            </div>

            {/* Calendar */}
            {active && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-tight">
                   Calendario de Sesiones
                </h3>
                <WeeklyCalendar 
                  courses={[active.course as any].map(c => ({
                    ...c,
                    color: c?.language?.name?.toLowerCase().includes('inglés') ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 
                           c?.language?.name?.toLowerCase().includes('francés') ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-green-100 border-green-300 text-green-800'
                  }))}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Progress Tab ────────────────────────── */}
        {activeTab === 'progress' && (
          <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Mi Mapa Curricular</h3>
            <p className="text-gray-500 mb-10 font-medium">Idioma: {active?.course?.language?.name || 'Varios'}</p>

            <div className="flex items-center gap-4 flex-wrap justify-center py-8">
              {LEVELS.map((lvl, idx) => {
                const done    = completedLvls.includes(lvl)
                const current = active?.course?.level === lvl
                return (
                  <React.Fragment key={lvl}>
                    <div className="relative group">
                       <div className={`
                        w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold transition-all border-4 relative z-10
                        ${done    ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' : ''}
                        ${current ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/30 scale-110' : ''}
                        ${!done && !current ? 'bg-gray-100 border-gray-200 text-gray-400' : ''}
                      `}>
                        {lvl}
                      </div>
                      {current && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-ping"></div>
                      )}
                    </div>
                    {idx < LEVELS.length - 1 && (
                      <div className={`h-1 w-8 rounded-full ${done ? 'bg-green-400' : 'bg-gray-100'}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
            
            <div className="mt-12 p-6 bg-gray-50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-center border border-gray-100">
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Niveles Aprobados</p>
                  <p className="text-2xl font-bold text-gray-800">{completedLvls.length}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estatus Actual</p>
                  <p className="text-sm font-bold text-blue-600">{active ? 'ESTUDIANDO' : 'INACTIVO'}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Próxima Certificación</p>
                  <p className="text-sm font-bold text-gray-800">{active?.course?.level === 'C2' ? 'MAESTRÍA' : 'Nivel Superior'}</p>
               </div>
            </div>
          </div>
        )}

        {/* ── History Tab ─────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-tight">Historial Académico</h3>
            {history.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium italic">Tu historial aparecerá aquí cuando completes niveles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {history.map((e) => {
                  const boleta   = e.documents?.find((d) => d.type === 'GRADE_REPORT' && d.status === 'RELEASED')
                  const approved = e.finalGrade != null && e.finalGrade >= 7
                  return (
                    <div key={e.id} className="p-6 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-bold text-gray-800">{e.course?.language?.name} — {e.course?.level}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase">Finalizado el {new Date(e.updatedAt).toLocaleDateString('es-MX')}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-gray-400 uppercase">Calificación</p>
                           <p className={`text-xl font-bold ${approved ? 'text-green-600' : 'text-red-500'}`}>{e.finalGrade ?? '-'}</p>
                        </div>
                        {boleta ? (
                          <a href={boleta.fileUrl} target="_blank" rel="noreferrer" className="bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase">
                            Descargar Boleta
                          </a>
                        ) : (
                          <span className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight">En Revisión</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Payments Tab ────────────────────────── */}
        {activeTab === 'payments' && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-tight">Registro de Transacciones</h3>
            {payments.length === 0 ? (
              <p className="text-center py-20 text-gray-400 italic">No tienes pagos registrados aún</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left p-4 font-bold text-gray-500 uppercase tracking-tighter">Descripción</th>
                      <th className="text-center p-4 font-bold text-gray-500 uppercase tracking-tighter">Monto</th>
                      <th className="text-right p-4 font-bold text-gray-500 uppercase tracking-tighter">Fecha & Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-bold text-gray-700">
                          {p.enrollment?.course ? `${p.enrollment.course.language?.name} ${p.enrollment.course.level}` : p.description}
                        </td>
                        <td className="p-4 text-center font-bold text-gray-900">${Number(p.amount).toLocaleString('es-MX')}</td>
                        <td className="p-4 text-right">
                          <p className="text-[10px] font-bold text-gray-400">{new Date(p.createdAt).toLocaleDateString('es-MX')}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden component for formal PDF generation */}
      <PrintableSchedule enrollment={active as any} />
    </DashboardLayout>
  )
}

