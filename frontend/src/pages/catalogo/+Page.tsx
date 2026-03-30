// src/pages/catalogo/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/LoadingSpinner'
import { ErrorBanner } from '../../components/ErrorBanner'

export default function CatalogoPage() {
  const { user: session, isLoading } = useAuth()
  
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoading) return

    if (!session || session.role !== 'STUDENT') {
      window.location.href = '/login'
      return
    }

    const load = async () => {
      try {
        const data = await api.courses.getAll({ status: 'ACTIVE' })
        setCourses(data)
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError('Error al cargar el catálogo de cursos.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session, isLoading])

  if (loading || isLoading) return <PageLoader message="Cargando catálogo de cursos..." />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar Minimalista */}
      <nav className="bg-indigo-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <span className="font-bold text-lg">TESH — Catálogo</span>
        <a href="/dashboard-alumno" className="text-indigo-200 hover:text-white text-sm font-medium transition-colors">
          ← Volver al Dashboard
        </a>
      </nav>

      <div className="p-8 max-w-6xl mx-auto w-full flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-800">Cursos Abiertos</h1>
          <p className="text-gray-500 mt-2">Inscríbete en los cursos disponibles para iniciar tu aprendizaje.</p>
        </div>

        {error && <ErrorBanner message={error} />}

        {courses.length === 0 && !error ? (
          <div className="bg-white border rounded-xl p-10 text-center shadow-sm">
            <span className="text-4xl mb-3 block">🏫</span>
            <p className="text-lg text-gray-500 font-medium">Por ahora no hay cursos con inscripciones abiertas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="bg-indigo-600 px-5 py-4 text-white">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-xl">{course.language?.name}</h3>
                    <span className="bg-indigo-500 bg-opacity-50 px-2 py-0.5 rounded text-sm font-bold border border-indigo-400">
                      {course.level}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 flex-grow flex flex-col">
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {course.scheduleDescription} ({course.startTime} - {course.endTime})
                    </div>
                    {(course.classroom || course.meetingLink) && (
                      <div className="flex items-center text-gray-600 text-sm mt-1">
                        <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {course.classroom ? `Salón: ${course.classroom}` : ''}
                        {course.classroom && course.meetingLink && ' | '}
                        {course.meetingLink ? <span className="text-indigo-600 font-semibold px-1 bg-indigo-50 rounded">Virtual</span> : ''}
                      </div>
                    )}
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {course.teacher ? `${course.teacher.user?.firstName} ${course.teacher.user?.lastName}` : 'Por asignar'}
                    </div>
                    
                    <div className="pt-4 mt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Costo de inscripción</p>
                      <p className="text-2xl font-black text-gray-800">
                        ${Number(course.price || course.enrollmentFee || 0).toLocaleString('es-MX')} <span className="text-sm font-medium text-gray-500">MXN</span>
                      </p>
                    </div>
                  </div>

                  <a
                    href={`/pago?courseId=${course.id}`}
                    className="block w-full text-center bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold py-3 rounded-xl transition-colors border border-indigo-200"
                  >
                    Inscribirse Ahora
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
