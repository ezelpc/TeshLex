// src/pages/dashboard-admin/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api, ApiError }        from '../../lib/api'
import { useRequireRole }       from '../../hooks/useRequireRole'
import { PageLoader, ButtonSpinner } from '../../components/LoadingSpinner'
import { ErrorBanner }          from '../../components/ErrorBanner'

// Language name → ISO code helper
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

export default function DashboardAdmin() {
  const { user } = useRequireRole(['ADMIN', 'SUPERADMIN'])

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
        const [kpiData, docData, commData, statsData] = await Promise.all([
          api.reports.getDashboard(),
          api.reports.getPendingDocuments(),
          api.reports.getTeacherComments(true),
          api.payments.getStats()
        ])
        setKpis(kpiData)
        setDocs(docData)
        setComments(commData)
        setStats(statsData)
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
    if (!confirm('¿Liberar este documento? El alumno recibirá una notificación.')) return
    setReleasing(id)
    try {
      await api.reports.releaseDocument(id)
      setDocs(d => d.filter(doc => doc.id !== id))
      setSuccess('Documento liberado correctamente.')
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Error al liberar el documento.')
    } finally {
      setReleasing(null)
    }
  }

  const handleMarkRead = async (id: string) => {
    setMarkingRead(id)
    try {
      await api.reports.markCommentRead(id)
      setComments(c => c.filter(cm => cm.id !== id))
    } catch {
      /* silent */
    } finally {
      setMarkingRead(null)
    }
  }

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!langName.trim() || !langCode.trim()) return
    setLangLoading(true)
    setError(''); setSuccess('')
    try {
      await api.courses.createLanguage({ name: langName.trim(), code: langCode.trim() })
      setSuccess(`Idioma "${langName}" agregado correctamente.`)
      setLangName(''); setLangCode('')
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Error al crear el idioma.')
    } finally {
      setLangLoading(false)
    }
  }

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    const { firstName, lastName, email, password } = teacher
    if (!firstName || !lastName || !email || !password) {
      setError('Completa todos los campos obligatorios del profesor.')
      return
    }
    setTeacherLoading(true)
    setError(''); setSuccess('')
    try {
      await api.users.registerTeacher({
        firstName: teacher.firstName,
        lastName:  teacher.lastName,
        email:     teacher.email,
        password:  teacher.password,
        specialties: teacher.specialties
          ? teacher.specialties.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      })
      setSuccess(`Profesor ${firstName} ${lastName} registrado correctamente.`)
      setTeacher({ firstName: '', lastName: '', email: '', password: '', specialties: '' })
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Error al registrar el profesor.')
    } finally {
      setTeacherLoading(false)
    }
  }

  if (!user) return null
  if (kpiLoad) return <PageLoader message="Cargando panel de administración..." />

  const KPI_CARDS = [
    { label: 'Inscripciones Activas', value: kpis?.activeEnrollments ?? 0, color: 'border-l-green-500', text: 'text-green-700' },
    { label: 'Ingresos Históricos',   value: `$${Number(stats?.totalRevenue ?? 0).toLocaleString('es-MX')}`, color: 'border-l-blue-500',   text: 'text-blue-700'  },
    { label: 'Bajas Registradas',     value: kpis?.dropsThisMonth ?? 0,     color: 'border-l-red-500',   text: 'text-red-600'   },
    { label: 'Documentos Pendientes', value: kpis?.pendingDocuments ?? 0,   color: 'border-l-yellow-500', text: 'text-yellow-700' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center shadow-md">
        <span className="font-bold text-lg">TESH — Panel Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-green-200 text-sm">{user.firstName} {user.lastName}</span>
          <button
            onClick={() => api.auth.logout().then(() => { window.location.href = '/login' })}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Panel del Administrador</h2>

        {error   && <ErrorBanner message={error}   onClose={() => setError('')}   />}
        {success && (
          <div role="alert" className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium flex justify-between">
            ✅ {success}
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 ml-4">✕</button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_CARDS.map(k => (
            <div key={k.label} className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${k.color}`}>
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.text}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue breakdown */}
        {kpis && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Ingresos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Mes anterior</p>
                <p className="text-2xl font-bold text-gray-700">
                  ${Number(kpis.revenueLastMonth).toLocaleString('es-MX')} MXN
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Inscripciones por idioma</h4>
                {(kpis.enrollmentsByLanguage ?? []).map((item: any) => (
                  <div key={item.language} className="flex justify-between text-xs text-gray-600 border-b border-gray-100 py-1">
                    <span>{item.language}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pending Documents */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-green-700 font-bold text-lg mb-4">Liberación de Documentos</h3>
          {docLoad ? (
            <div className="flex justify-center py-4"><div className="w-7 h-7 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" /></div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No hay documentos pendientes de liberación. ✅</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc: any) => {
                const student = doc.student?.user
                const course  = doc.enrollment?.course
                return (
                  <div key={doc.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">
                        {student?.lastName} {student?.firstName} — {doc.type}
                      </p>
                      {course && (
                        <p className="text-xs text-gray-500">{course.language?.name} {course.level}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRelease(doc.id)}
                      disabled={releasing === doc.id}
                      aria-busy={releasing === doc.id}
                      className="flex items-center gap-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shrink-0"
                    >
                      {releasing === doc.id && <ButtonSpinner />}
                      Liberar
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Teacher Comments */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-green-700 font-bold text-lg mb-4">
            Comentarios de Profesores
            {comments.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{comments.length}</span>
            )}
          </h3>
          {commLoad ? (
            <div className="flex justify-center py-4"><div className="w-7 h-7 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" /></div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin comentarios sin leer. ✅</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">
                        Prof. {c.teacher?.user?.firstName} {c.teacher?.user?.lastName} •{' '}
                        {new Date(c.createdAt).toLocaleDateString('es-MX')}
                      </p>
                      <p className="text-sm text-gray-700">{c.message}</p>
                    </div>
                    <button
                      onClick={() => handleMarkRead(c.id)}
                      disabled={markingRead === c.id}
                      className="text-xs text-blue-600 hover:underline shrink-0 disabled:opacity-50"
                    >
                      {markingRead === c.id ? '...' : 'Marcar leído'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gestión: Languages + Teachers side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Language creation */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Agregar Idioma</h3>
            <form onSubmit={handleAddLanguage} className="space-y-3">
              <div>
                <label htmlFor="langName" className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                <input
                  id="langName"
                  type="text"
                  value={langName}
                  onChange={e => {
                    setLangName(e.target.value)
                    setLangCode(autoCode(e.target.value))
                  }}
                  placeholder="Ej: Japonés"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
                  required
                />
              </div>
              <div>
                <label htmlFor="langCode" className="block text-xs font-medium text-gray-600 mb-1">Código ISO *</label>
                <input
                  id="langCode"
                  type="text"
                  value={langCode}
                  onChange={e => setLangCode(e.target.value)}
                  placeholder="Ej: ja"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
                  maxLength={5}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={langLoading}
                aria-busy={langLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {langLoading && <ButtonSpinner />}
                {langLoading ? 'Guardando...' : 'Agregar Idioma'}
              </button>
            </form>
          </div>

          {/* Teacher registration */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Registrar Profesor</h3>
            <form onSubmit={handleRegisterTeacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="tFirstName" className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input id="tFirstName" type="text" value={teacher.firstName} onChange={e => setTeacher(t => ({ ...t, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="Ana" required />
                </div>
                <div>
                  <label htmlFor="tLastName" className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label>
                  <input id="tLastName" type="text" value={teacher.lastName} onChange={e => setTeacher(t => ({ ...t, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="García" required />
                </div>
              </div>
              <div>
                <label htmlFor="tEmail" className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input id="tEmail" type="email" value={teacher.email} onChange={e => setTeacher(t => ({ ...t, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="ana.garcia@tesh.edu.mx" required />
              </div>
              <div>
                <label htmlFor="tPassword" className="block text-xs font-medium text-gray-600 mb-1">Contraseña inicial *</label>
                <input id="tPassword" type="password" value={teacher.password} onChange={e => setTeacher(t => ({ ...t, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="Mín. 8 caracteres" required />
              </div>
              <div>
                <label htmlFor="tSpecialties" className="block text-xs font-medium text-gray-600 mb-1">Especialidades (separadas por coma)</label>
                <input id="tSpecialties" type="text" value={teacher.specialties} onChange={e => setTeacher(t => ({ ...t, specialties: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="Inglés, TOEFL, Conversacional" />
              </div>
              <button
                type="submit"
                disabled={teacherLoading}
                aria-busy={teacherLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {teacherLoading && <ButtonSpinner />}
                {teacherLoading ? 'Registrando...' : 'Registrar Profesor'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
