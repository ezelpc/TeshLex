// src/pages/dashboard-profesor/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api }               from '../../lib/api'
import { useRequireRole }       from '../../hooks/useRequireRole'
import { PageLoader, ButtonSpinner } from '../../components/LoadingSpinner'
import { ErrorBanner }          from '../../components/ErrorBanner'
import { DashboardLayout }      from '../../components/DashboardLayout'

const PROF_TABS = [
  { id: 'home',       label: 'Mis Grupos',  icon: '' },
  { id: 'attendance', label: 'Asistencia',  icon: '' },
  { id: 'grades',     label: 'Evaluación',  icon: '' },
  { id: 'support',    label: 'Soporte',     icon: '' },
]

export default function DashboardProfesor() {
  const { user } = useRequireRole('TEACHER')
  const [activeTab, setActiveTab] = useState('home')

  const [courses,           setCourses]           = useState<any[]>([])
  const [selectedCourseId,  setSelectedCourseId]  = useState<string>('')
  const [enrollments,       setEnrollments]       = useState<any[]>([])
  const [comment,           setComment]           = useState('')
  const [loading,           setLoading]           = useState(true)
  const [loadingStudents,   setLoadingStudents]   = useState(false)
  const [saving,            setSaving]            = useState(false)
  const [sendingComment,    setSendingComment]    = useState(false)
  const [error,             setError]             = useState('')
  const [successMsg,        setSuccessMsg]        = useState('')

  const [grades, setGrades] = useState<Record<string, string>>({})
  
  // -- Attendance State --
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10))
  const [attRecords,     setAttRecords]     = useState<Record<string, boolean>>({})
  const [attSaving,      setAttSaving]      = useState(false)

  // Load teacher's courses
  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.courses.getAll({
          teacherId: (user as any).teacherProfileId,
          status: 'ACTIVE',
        })
        setCourses(data)
        if (data.length > 0) setSelectedCourseId(data[0].id)
      } catch (err: any) {
        setError(err.message || 'Error al cargar cursos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // Load students when course changes
  useEffect(() => {
    if (!selectedCourseId) return
    const load = async () => {
      setLoadingStudents(true); setEnrollments([]); setGrades({})
      try {
        const data = await api.enrollments.getAll({ courseId: selectedCourseId, status: 'ACTIVE' })
        setEnrollments(data)
        const initGrades: Record<string, string> = {}
        data.forEach((e: any) => {
          const finalGrade = e.grades?.[0]?.finalGrade ?? e.grade?.finalGrade
          initGrades[e.id] = finalGrade != null ? String(finalGrade) : ''
        })
        setGrades(initGrades)
        
        // Init attendance map
        const initAtt: Record<string, boolean> = {}
        data.forEach(e => initAtt[e.id] = true)
        setAttRecords(initAtt)

      } catch (err: any) {
        setError(err.message || 'Error al cargar alumnos')
      } finally {
        setLoadingStudents(false)
      }
    }
    load()
  }, [selectedCourseId])

  const handleSaveGrades = async () => {
    setSaving(true); setError(''); setSuccessMsg('')
    try {
      await Promise.all(
        enrollments.map(e => {
          const raw = grades[e.id]
          if (!raw) return Promise.resolve()
          const score = parseFloat(raw)
          if (isNaN(score)) return Promise.resolve()

          return api.enrollments.saveGrades(e.id, { 
            criteriaGrades: [{
              criteriaId:   '00000000-0000-0000-0000-000000000001',
              criteriaName: 'Calificación Global',
              score:        Math.min(10, Math.max(0, score)),
              weight:       100,
            }] 
          })
        })
      )
      setSuccessMsg('Calificaciones guardadas.')
    } catch (err: any) {
      setError(err.message || 'Error al guardar notas')
    } finally {
      setSaving(false)
    }
  }

  const handleSendComment = async () => {
    if (!comment.trim()) return
    setSendingComment(true); setError('')
    try {
      await api.teacher.sendComment(comment.trim())
      setComment(''); setSuccessMsg('Comentario enviado.')
    } catch (err: any) {
      setError(err.message || 'Error al enviar mensaje')
    } finally {
      setSendingComment(false)
    }
  }

  if (!user) return null
  if (loading) return <PageLoader message="Cargando panel..." />

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <DashboardLayout 
      user={user} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      tabs={PROF_TABS}
      title="Panel Académico"
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onClose={() => setError('')} />}
        {successMsg && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-sm flex justify-between">
            <p className="text-sm font-bold">{successMsg}</p>
            <button onClick={() => setSuccessMsg('')} className="text-green-900/50 hover:text-green-900">✕</button>
          </div>
        )}
        {/* ── Home Tab (Course Selection) ──────────── */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-6 font-sans">Mis Grupos Asignados</h3>
            {courses.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <p className="text-gray-400 font-medium italic">Sin grupos asignados actualmente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCourseId(c.id); setActiveTab('attendance') }}
                    className={`text-left p-6 rounded-xl border transition-all ${
                      selectedCourseId === c.id 
                        ? 'bg-blue-600 border-blue-600 shadow-md text-white' 
                        : 'bg-white border-gray-100 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <p className={`text-lg font-bold ${selectedCourseId === c.id ? 'text-white' : 'text-gray-800'}`}>
                        {c.language?.name} — {c.level}
                      </p>
                    </div>
                    <p className={`text-sm ${selectedCourseId === c.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {c.scheduleDescription || 'Horario por definir'}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${selectedCourseId === c.id ? 'bg-white' : 'bg-green-500'}`}></span>
                      <p className={`text-xs font-bold ${selectedCourseId === c.id ? 'text-white' : 'text-gray-600'}`}>
                        {c._count?.enrollments ?? 0} alumnos inscritos
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Attendance Tab ──────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Pase de Lista</h3>
                <p className="text-sm text-gray-500">{selectedCourse?.language?.name} {selectedCourse?.level}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase">FECHA:</span>
                <input 
                  type="date" value={attendanceDate} 
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {enrollments.length === 0 ? (
              <p className="text-center py-12 text-gray-400 italic">No hay alumnos inscritos en este grupo.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {enrollments.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                    <span className="font-bold text-gray-700 text-sm">{e.student?.user?.lastName} {e.student?.user?.firstName}</span>
                    <button 
                      onClick={() => setAttRecords(prev => ({ ...prev, [e.id]: !prev[e.id] }))}
                      className={`px-4 py-1 rounded-md text-[10px] font-bold transition-all ${
                        attRecords[e.id] 
                          ? 'bg-green-600 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {attRecords[e.id] ? 'PRESENTE' : 'FALTA'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={async () => {
                setAttSaving(true)
                try {
                  const records = Object.entries(attRecords).map(([enrollmentId, isPresent]) => ({
                    enrollmentId,
                    isPresent
                  }))
                  await api.enrollments.recordBulkAttendance(selectedCourseId, attendanceDate, records)
                  setSuccessMsg('Asistencia guardada.')
                } catch (err: any) {
                  setError(err.message || 'Error al guardar')
                } finally {
                  setAttSaving(false)
                }
              }}
              disabled={attSaving || enrollments.length === 0}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {attSaving ? <ButtonSpinner /> : 'Guardar Asistencia'}
            </button>
          </div>
        )}

        {/* ── Grades Tab ─────────────────────────── */}
        {activeTab === 'grades' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Evaluación de Alumnos</h3>
            
            {loadingStudents ? (
              <div className="py-12 flex justify-center"><ButtonSpinner /></div>
            ) : enrollments.length === 0 ? (
              <p className="text-center py-12 text-gray-400 italic">Sin alumnos activos.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-100 mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4 font-bold text-gray-500 uppercase tracking-tight">Estudiante</th>
                        <th className="text-center p-4 font-bold text-gray-500 uppercase tracking-tight">Calif. Global</th>
                        <th className="text-right p-4 font-bold text-gray-500 uppercase tracking-tight">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {enrollments.map((e: any) => {
                        const val = grades[e.id] ?? ''
                        const score = parseFloat(val)
                        const passes = !isNaN(score) && score >= 7
                        return (
                          <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-bold text-gray-700">
                             {e.student?.user?.lastName} {e.student?.user?.firstName}
                            </td>
                            <td className="p-4 text-center">
                              <input 
                                type="number" min="0" max="10" step="0.1" 
                                value={val} 
                                onChange={ev => setGrades({...grades, [e.id]: ev.target.value})}
                                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center font-bold focus:border-blue-400 outline-none"
                              />
                            </td>
                            <td className="p-4 text-right">
                              {!isNaN(score) && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${passes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {passes ? 'APROBADO' : 'REPROBADO'}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleSaveGrades}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <ButtonSpinner /> : 'Guardar Acta de Calificaciones'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Support Tab ────────────────────────── */}
        {activeTab === 'support' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-xl mx-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Reporte a Administración</h3>
            <p className="text-xs text-gray-500 mb-6">Su mensaje será revisado por el personal administrativo.</p>

            <textarea 
              value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Escriba su mensaje aquí..."
              className="w-full h-32 border border-gray-200 rounded-xl p-4 outline-none focus:border-blue-400 transition-all resize-none shadow-inner"
            />
            <button
              onClick={handleSendComment}
              disabled={sendingComment || comment.trim().length < 5}
              className="w-full mt-4 bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-gray-700 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {sendingComment ? <ButtonSpinner /> : 'Enviar Mensaje'}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

