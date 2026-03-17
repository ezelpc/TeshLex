// src/pages/index/+Page.tsx
import '../../index.css'
import { useState, useEffect } from 'react'
import { api, tokenStore }     from '../../lib/api'
import { PageLoader }          from '../../components/LoadingSpinner'
import { ErrorBanner }         from '../../components/ErrorBanner'

export default function LandingPage() {
  const [courses,   setCourses]   = useState<any[]>([])
  const [languages, setLanguages] = useState<any[]>([])
  const [langFilter, setLangFilter] = useState<string>('all')
  const [loading, setLoading]    = useState(true)
  const [error,   setError]      = useState('')

  const session = tokenStore.getSession()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [c, l] = await Promise.all([
          api.courses.getAll({ status: 'ACTIVE' }),
          api.courses.getLanguages(),
        ])
        setCourses(c)
        setLanguages(l)
      } catch {
        setError('No se pudo cargar la oferta educativa. Intenta más tarde.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = langFilter === 'all'
    ? courses
    : courses.filter(c => c.language?.id === langFilter || c.language?.name?.toLowerCase() === langFilter)

  const handleEnroll = (courseId: string) => {
    if (!session) {
      window.location.href = `/register?courseId=${courseId}`
    } else if (session.role === 'STUDENT') {
      window.location.href = `/pago?courseId=${courseId}`
    } else {
      window.location.href = `/login`
    }
  }

  const levelColors: Record<string, string> = {
    A1: 'bg-emerald-100 text-emerald-700',
    A2: 'bg-teal-100 text-teal-700',
    B1: 'bg-blue-100 text-blue-700',
    B2: 'bg-indigo-100 text-indigo-700',
    C1: 'bg-purple-100 text-purple-700',
    C2: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Navbar */}
      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center shadow-md">
        <span className="font-bold text-lg tracking-tight">TESH — Cursos de Idiomas</span>
        <div className="flex gap-3">
          {session ? (
            <a href={session.role === 'STUDENT' ? '/dashboard-alumno' : session.role === 'TEACHER' ? '/dashboard-profesor' : '/dashboard-admin'}
              className="bg-white text-green-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">
              Mi Panel
            </a>
          ) : (
            <>
              <a href="/login" className="text-white text-sm font-medium hover:underline self-center">Iniciar Sesión</a>
              <a href="/register" className="bg-white text-green-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">Inscribirse</a>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-800 to-green-600 text-white px-6 py-16 text-center">
        <h1 className="text-4xl font-bold mb-3">¡Abre tu mundo con el TESH!</h1>
        <p className="text-green-100 text-lg max-w-xl mx-auto">
          Inscríbete a nuestros cursos de inglés, francés y más — diseñados para el éxito académico y profesional.
        </p>
        {!session && (
          <div className="flex justify-center gap-4 mt-8">
            <a href="/register" className="bg-white text-green-800 font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors">
              Inscripción por Primera Vez
            </a>
            <a href="/login" className="border border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors">
              Reinscripción
            </a>
          </div>
        )}
      </section>

      {/* Courses */}
      <section className="px-6 py-12 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Oferta Educativa Actual</h2>
        <p className="text-gray-500 text-center mb-6">Cursos activos disponibles para inscripción</p>

        {/* Language filter chips */}
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <button
              onClick={() => setLangFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${langFilter === 'all' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Todos
            </button>
            {languages.map((l: any) => (
              <button
                key={l.id}
                onClick={() => setLangFilter(l.name?.toLowerCase())}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${langFilter === l.name?.toLowerCase() ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {l.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onRetry={() => window.location.reload()} />
          </div>
        )}

        {loading ? (
          <div className="py-12"><PageLoader message="Cargando cursos..." /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No hay cursos disponibles</p>
            <p className="text-sm">Vuelve pronto para ver la oferta actualizada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course: any) => (
              <div key={course.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">{course.language?.name ?? 'Idioma'}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${levelColors[course.level] ?? 'bg-gray-100 text-gray-600'}`}>
                    {course.level}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600 flex-1">
                  {course.schedule && (
                    <p><span className="font-medium text-gray-700">Horario:</span> {course.schedule}</p>
                  )}
                  {course.startDate && (
                    <p><span className="font-medium text-gray-700">Inicio:</span> {new Date(course.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  )}
                  {course.teacher && (
                    <p><span className="font-medium text-gray-700">Profesor:</span> {course.teacher.user?.firstName} {course.teacher.user?.lastName}</p>
                  )}
                  <p className="font-bold text-green-700 text-base mt-2">
                    ${Number(course.enrollmentFee ?? 0).toLocaleString('es-MX')} MXN
                  </p>
                </div>

                <button
                  onClick={() => handleEnroll(course.id)}
                  className="mt-4 w-full bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {session?.role === 'STUDENT' ? 'Ir a Pagar' : 'Inscribirse'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500 bg-gray-50">
        <p className="font-bold text-gray-700 mb-2">TESH — Cursos de Lenguas Extranjeras</p>
        <p>Av. Tecnológico #20, Ex Rancho El Tejocote, Huixquilucan, Edo. de México</p>
        <p>📞 (55) 5811-1234 · ✉️ lenguas@tesh.edu.mx</p>
        <p className="mt-3 text-gray-400">© 2025 Tecnológico de Estudios Superiores de Huixquilucan</p>
      </footer>
    </div>
  )
}
