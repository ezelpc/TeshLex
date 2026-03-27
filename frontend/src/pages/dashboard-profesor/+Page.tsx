// src/pages/dashboard-profesor/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api, ApiError }        from '../../lib/api'
import { useRequireRole }       from '../../hooks/useRequireRole'
import { PageLoader, ButtonSpinner } from '../../components/LoadingSpinner'
import { ErrorBanner }          from '../../components/ErrorBanner'

export default function DashboardProfesor() {
  const { user } = useRequireRole('TEACHER')

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

  // Simple grade per enrollment (0-10 float), no per-criteria breakdown in the simple UI.
  // We create a single synthetic criteria entry using the course's first criterion or a default one.
  const [grades, setGrades] = useState<Record<string, string>>({})

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
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError('Error al cargar tus cursos.')
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
      setLoadingStudents(true)
      setEnrollments([])
      setGrades({})
      try {
        const data = await api.enrollments.getAll({ courseId: selectedCourseId, status: 'ACTIVE' })
        setEnrollments(data)
        // Initialize grades from existing grade data
        const initGrades: Record<string, string> = {}
        data.forEach((e: any) => {
          const finalGrade = e.grades?.[0]?.finalGrade ?? e.grade?.finalGrade
          initGrades[e.id] = finalGrade != null ? String(finalGrade) : ''
        })
        setGrades(initGrades)
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError('Error al cargar los alumnos del grupo.')
      } finally {
        setLoadingStudents(false)
      }
    }
    load()
  }, [selectedCourseId])

  const handleSaveGrades = async () => {
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      // Get evaluation criteria for the selected course
      const selectedCourse = courses.find(c => c.id === selectedCourseId)
      const criteria       = selectedCourse?.evaluationCriteria ?? []

      await Promise.all(
        enrollments.map(e => {
          const raw = grades[e.id]
          if (!raw) return Promise.resolve()
          const score = parseFloat(raw)
          if (isNaN(score)) return Promise.resolve()

          // Build criteriaGrades from actual criteria if available; otherwise create a fallback
          let criteriaGrades: any[]
          if (criteria.length > 0) {
            criteriaGrades = criteria.map((c: any) => ({
              criteriaId:   c.id,
              criteriaName: c.name,
              score:        Math.min(10, Math.max(0, score)),
              weight:       c.percentage,
            }))
          } else {
            // Fallback: synthetic single criterion with 100% weight
            criteriaGrades = [{
              criteriaId:   '00000000-0000-0000-0000-000000000001',
              criteriaName: 'Calificación Global',
              score:        Math.min(10, Math.max(0, score)),
              weight:       100,
            }]
          }

          return api.enrollments.saveGrades(e.id, { criteriaGrades })
        })
      )
      setSuccessMsg('Calificaciones guardadas correctamente.')
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Error al guardar las calificaciones.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendComment = async () => {
    if (!comment.trim()) return
    setSendingComment(true)
    setError('')
    try {
      await api.teacher.sendComment(comment.trim())
      setComment('')
      setSuccessMsg('Comentario enviado al administrador.')
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Error al enviar el comentario.')
    } finally {
      setSendingComment(false)
    }
  }

  if (!user) return null
  if (loading) return <PageLoader message="Cargando tu panel..." />

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      {/* Navbar */}
      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center shadow-md">
        <span className="font-bold text-lg">TESH — Panel Profesor</span>
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
        <h2 className="text-xl font-bold text-gray-800">Panel del Profesor</h2>

        {error      && <ErrorBanner message={error} onClose={() => setError('')} />}
        {successMsg && (
          <div role="alert" className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium flex justify-between">
            ✅ {successMsg}
            <button onClick={() => setSuccessMsg('')} className="text-green-500 hover:text-green-700 ml-4">✕</button>
          </div>
        )}

        {/* Course selector */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
            <p className="text-lg font-medium">Sin cursos asignados</p>
            <p className="text-sm">Contacta al administrador para que te asigne un grupo.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-blue-600 font-bold text-lg mb-3">Mis Grupos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courses.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`text-left border rounded-xl p-4 transition-colors ${
                      selectedCourseId === c.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-gray-800 text-sm">
                      {c.language?.name} — {c.level}
                    </p>
                    {c.scheduleDescription && <p className="text-xs text-gray-500 mt-0.5">{c.scheduleDescription}</p>}
                    <p className="text-xs text-blue-600 mt-1">{c._count?.enrollments ?? c.currentStudents ?? 0} alumnos</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Grade table */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-blue-600 font-bold text-lg mb-4">
                Calificaciones — {selectedCourse?.language?.name} {selectedCourse?.level}
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Ingresa la calificación global (0–10). Se registrará como criterio único con 100% de peso.
              </p>

              {loadingStudents ? (
                <div className="py-8 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                </div>
              ) : enrollments.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No hay alumnos activos en este grupo.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-gray-600 font-semibold">ALUMNO</th>
                          <th className="text-left py-2 px-3 text-gray-600 font-semibold">CALIFICACIÓN (0–10)</th>
                          <th className="text-left py-2 px-3 text-gray-600 font-semibold">ESTADO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((e: any) => {
                          const student = e.student?.user
                          const val     = grades[e.id] ?? ''
                          const num     = parseFloat(val)
                          const approves = !isNaN(num) && num >= 7
                          return (
                            <tr key={e.id} className="border-b border-gray-100">
                              <td className="py-2 px-3 text-gray-700">
                                {student?.lastName} {student?.firstName}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0" max="10" step="0.1"
                                  value={val}
                                  onChange={ev => setGrades(g => ({ ...g, [e.id]: ev.target.value }))}
                                  className={`w-24 border rounded px-2 py-1 text-sm outline-none focus:border-blue-400 ${!isNaN(num) && num < 7 ? 'text-red-600 border-red-300' : 'text-gray-800 border-gray-300'}`}
                                  aria-label="Calificación"
                                />
                              </td>
                              <td className="py-2 px-3">
                                {!isNaN(num) && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${approves ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {approves ? 'Aprobado' : 'Reprobado'}
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
                    aria-busy={saving}
                    className="mt-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {saving && <ButtonSpinner />}
                    {saving ? 'Guardando...' : 'Guardar Calificaciones'}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Comment to admin */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-blue-600 font-bold text-lg mb-3">Comentarios para el Administrador</h3>
          <textarea
            placeholder="Ej: Se requiere más material audiovisual para el nivel A1..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 h-24 resize-none"
            aria-label="Comentario para el administrador"
          />
          <button
            onClick={handleSendComment}
            disabled={sendingComment || comment.trim().length < 10}
            aria-busy={sendingComment}
            className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            {sendingComment && <ButtonSpinner />}
            {sendingComment ? 'Enviando...' : 'Enviar Comentario'}
          </button>
          {comment.trim().length > 0 && comment.trim().length < 10 && (
            <p className="text-xs text-red-500 mt-1">El comentario debe tener al menos 10 caracteres.</p>
          )}
        </div>
      </div>
    </div>
  )
}
