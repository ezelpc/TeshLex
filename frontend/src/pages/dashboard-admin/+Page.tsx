// src/pages/dashboard-admin/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api, ApiError }        from '../../lib/api'
import { useRequireRole }       from '../../hooks/useRequireRole'
import { PageLoader, ButtonSpinner } from '../../components/LoadingSpinner'
import { ErrorBanner }          from '../../components/ErrorBanner'
import { DashboardLayout }      from '../../components/DashboardLayout'

const LANG_CODE_MAP: Record<string, string> = {
  'inglés': 'en', 'ingles': 'en',
  'francés': 'fr', 'frances': 'fr',
  'alemán': 'de', 'aleman': 'de',
  'japonés': 'ja', 'japones': 'ja',
  'portugués': 'pt', 'portugues': 'pt',
  'italiano': 'it',
  'chino': 'zh',
  'coreano': 'ko',
  'ruso': 'ru',
}
function autoCode(name: string): string {
  return LANG_CODE_MAP[name.toLowerCase().trim()] ?? name.slice(0, 2).toLowerCase()
}

const ADMIN_TABS = [
  { id: 'overview',   label: 'Resumen',    icon: '' },
  { id: 'enrollments', label: 'Ciclos',     icon: '' },
  { id: 'documents',   label: 'Documentos', icon: '' },
  { id: 'management',  label: 'Gestión',    icon: '' },
  { id: 'comments',    label: 'Reportes',   icon: '' },
]

export default function DashboardAdmin() {
  const { user } = useRequireRole(['ADMIN', 'SUPERADMIN'])
  const [activeTab, setActiveTab] = useState('overview')

  // ── KPIs ──
  const [kpis,    setKpis]    = useState<any>(null)
  const [stats,   setStats]   = useState<any>(null)
  const [kpiLoad, setKpiLoad] = useState(true)

  // ── Pending Documents ──
  const [docs,    setDocs]    = useState<any[]>([])
  const [docLoad, setDocLoad] = useState(true)
  const [releasing, setReleasing] = useState<string | null>(null)

  // ── Teacher Comments ──
  const [comments,     setComments]     = useState<any[]>([])
  const [commLoad,     setCommLoad]     = useState(true)
  const [markingRead,  setMarkingRead]  = useState<string | null>(null)

  // ── Language form ──
  const [langName, setLangName] = useState('')
  const [langCode, setLangCode] = useState('')
  const [langLoading, setLangLoading] = useState(false)

  // ── Enrollment Windows ──
  const [activeCycle, setActiveCycle] = useState<any>(null)
  const [cycleSaving, setCycleSaving] = useState(false)

  // ── Teacher form ──
  const [teacher, setTeacher] = useState({
    firstName: '', lastName: '', email: '', password: '', specialties: '',
  })
  const [teacherLoading, setTeacherLoading] = useState(false)

  // ── Messages ──
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) return
    const loadAll = async () => {
      try {
        const [kpiData, docData, commData, statsData, activeCycleData] = await Promise.all([
          api.reports.getDashboard(),
          api.reports.getPendingDocuments(),
          api.reports.getTeacherComments(true),
          api.payments.getStats(),
          api.courses.getActiveCycle()
        ])
        setKpis(kpiData)
        setDocs(docData)
        setComments(commData)
        setStats(statsData)
        setActiveCycle(activeCycleData)
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
      } finally {
        setKpiLoad(false)
        setDocLoad(false)
        setCommLoad(false)
      }
    }
    loadAll()
  }, [user])

  const handleRelease = async (id: string) => {
    if (!confirm('¿Liberar este documento?')) return
    setReleasing(id)
    try {
      await api.reports.releaseDocument(id)
      setDocs(d => d.filter(doc => doc.id !== id))
      setSuccess('Documento liberado.')
    } catch (err: any) {
      setError(err.message || 'Error al liberar documento')
    } finally {
      setReleasing(null)
    }
  }

  const handleMarkRead = async (id: string) => {
    setMarkingRead(id)
    try {
      await api.reports.markCommentRead(id)
      setComments(c => c.filter(cm => cm.id !== id))
    } catch { /* silent */ } finally {
      setMarkingRead(null)
    }
  }

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!langName.trim() || !langCode.trim()) return
    setLangLoading(true); setError(''); setSuccess('')
    try {
      await api.courses.createLanguage({ name: langName.trim(), code: langCode.trim() })
      setSuccess(`Idioma "${langName}" agregado.`)
      setLangName(''); setLangCode('')
    } catch (err: any) {
      setError(err.message || 'Error al crear idioma')
    } finally {
      setLangLoading(false)
    }
  }

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    const { firstName, lastName, email, password } = teacher
    if (!firstName || !lastName || !email || !password) return
    setTeacherLoading(true); setError(''); setSuccess('')
    try {
      await api.users.registerTeacher({
        ...teacher,
        specialties: teacher.specialties?.split(',').map(s => s.trim()).filter(Boolean) || [],
      })
      setSuccess(`Profesor ${firstName} registrado.`)
      setTeacher({ firstName: '', lastName: '', email: '', password: '', specialties: '' })
    } catch (err: any) {
      setError(err.message || 'Error al registrar profesor')
    } finally {
      setTeacherLoading(false)
    }
  }

  if (!user) return null
  if (kpiLoad) return <PageLoader message="Cargando panel..." />

  const KPI_CARDS = [
    { label: 'Inscripciones Activas', value: kpis?.activeEnrollments ?? 0, color: 'text-green-600' },
    { label: 'Ingresos Históricos',   value: `$${Number(stats?.totalRevenue ?? 0).toLocaleString('es-MX')}`, color: 'text-blue-600' },
    { label: 'Bajas Registradas',     value: kpis?.dropsThisMonth ?? 0, color: 'text-red-500' },
    { label: 'Documentos Pendientes', value: kpis?.pendingDocuments ?? 0, color: 'text-amber-600' },
  ]

  return (
    <DashboardLayout 
      user={user} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      tabs={ADMIN_TABS}
      title="Administración TeshLex"
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onClose={() => setError('')} />}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-sm flex justify-between">
            <p className="text-sm font-bold">{success}</p>
            <button onClick={() => setSuccess('')} className="text-green-900/50 hover:text-green-900">✕</button>
          </div>
        )}

        {/* ── Overview Tab ────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {KPI_CARDS.map(k => (
                <div key={k.label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tight mb-1">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {kpis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-blue-600 font-bold mb-4">Ingresos Recientes</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-tight">Mes Anterior</p>
                      <p className="text-2xl font-bold text-gray-800">
                        ${Number(kpis.revenueLastMonth).toLocaleString('es-MX')} MXN
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-blue-600 font-bold mb-4">Inscripciones por Idioma</h3>
                  <div className="space-y-2">
                    {(kpis.enrollmentsByLanguage ?? []).map((item: any) => (
                      <div key={item.language} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
                        <span className="text-gray-600 font-medium">{item.language}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-700">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Enrollments Tab ─────────────────────── */}
        {activeTab === 'enrollments' && activeCycle && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-10 w-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded-xl text-xs font-bold uppercase">Ciclo</div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Ciclo Escolar Activo</h3>
                <p className="text-sm text-gray-500 font-medium">{activeCycle.name} — ({activeCycle.code})</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Apertura de Inscripciones</label>
                <input 
                  type="datetime-local" 
                  value={activeCycle.enrollmentStart ? new Date(activeCycle.enrollmentStart).toISOString().slice(0, 16) : ''}
                  onChange={e => setActiveCycle({ ...activeCycle, enrollmentStart: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Cierre de Inscripciones</label>
                <input 
                  type="datetime-local" 
                  value={activeCycle.enrollmentEnd ? new Date(activeCycle.enrollmentEnd).toISOString().slice(0, 16) : ''}
                  onChange={e => setActiveCycle({ ...activeCycle, enrollmentEnd: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <button
              onClick={async () => {
                setCycleSaving(true)
                try {
                  await api.courses.updateCycle(activeCycle.id, {
                    enrollmentStart: activeCycle.enrollmentStart,
                    enrollmentEnd: activeCycle.enrollmentEnd
                  })
                  setSuccess('Fechas actualizadas.')
                } catch (err: any) {
                  setError(err.message || 'Error al guardar')
                } finally {
                  setCycleSaving(false)
                }
              }}
              disabled={cycleSaving}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {cycleSaving && <ButtonSpinner />}
              {cycleSaving ? 'Guardando...' : 'Aplicar Cambios'}
            </button>
          </div>
        )}

        {/* ── Documents Tab ───────────────────────── */}
        {activeTab === 'documents' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-blue-600 font-bold mb-6">Liberación de Boletas</h3>
            {docLoad ? (
              <div className="flex justify-center py-12"><ButtonSpinner /></div>
            ) : docs.length === 0 ? (
              <p className="text-center py-8 text-gray-400 italic">No hay documentos pendientes</p>
            ) : (
              <div className="space-y-2">
                {docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{doc.student?.user?.lastName} {doc.student?.user?.firstName}</p>
                      <p className="text-xs text-gray-500">{doc.enrollment?.course?.language?.name} {doc.enrollment?.course?.level}</p>
                    </div>
                    <button
                      onClick={() => handleRelease(doc.id)}
                      disabled={releasing === doc.id}
                      className="bg-green-100 text-green-700 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      {releasing === doc.id ? '...' : 'Liberar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Management Tab ─────────────────────── */}
        {activeTab === 'management' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-blue-600 font-bold mb-4">Agregar Nuevo Idioma</h3>
              <form onSubmit={handleAddLanguage} className="space-y-4">
                <input 
                  type="text" value={langName} 
                  onChange={e => { setLangName(e.target.value); setLangCode(autoCode(e.target.value)) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="Nombre: Ej. Japonés"
                />
                <input 
                  type="text" value={langCode} onChange={e => setLangCode(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="Código: ja"
                />
                <button disabled={langLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-all">
                  {langLoading ? <ButtonSpinner /> : 'Guardar Idioma'}
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-blue-600 font-bold mb-4">Registrar Nuevo Profesor</h3>
              <form onSubmit={handleRegisterTeacher} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nombre" value={teacher.firstName} onChange={e => setTeacher({...teacher, firstName: e.target.value})} className="border p-2 rounded-lg text-sm" />
                  <input type="text" placeholder="Apellido" value={teacher.lastName} onChange={e => setTeacher({...teacher, lastName: e.target.value})} className="border p-2 rounded-lg text-sm" />
                </div>
                <input type="email" placeholder="Email" value={teacher.email} onChange={e => setTeacher({...teacher, email: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                <input type="password" placeholder="Contraseña" value={teacher.password} onChange={e => setTeacher({...teacher, password: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                <button disabled={teacherLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-all">
                  {teacherLoading ? <ButtonSpinner /> : 'Crear Cuenta'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Comments Tab ───────────────────────── */}
        {activeTab === 'comments' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-blue-600 font-bold mb-6">Reportes de Docentes</h3>
            {commLoad ? (
              <div className="flex justify-center py-12"><ButtonSpinner /></div>
            ) : comments.length === 0 ? (
              <p className="text-center py-8 text-gray-400 italic">No hay nuevos mensajes</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {comments.map((c: any) => (
                  <div key={c.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-blue-600 uppercase mb-1">
                        {c.teacher?.user?.firstName} {c.teacher?.user?.lastName}
                      </p>
                      <p className="text-sm text-gray-700">{c.message}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => handleMarkRead(c.id)}
                      disabled={markingRead === c.id}
                      className="text-[10px] bg-gray-100 hover:bg-blue-600 hover:text-white px-2 py-1 rounded transition-all font-bold"
                    >
                      Leído
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

