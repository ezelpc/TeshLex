
interface Course {
  id: string
  language: { name: string }
  level: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  color?: string
}

interface WeeklyCalendarProps {
  courses: Course[]
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function WeeklyCalendar({ courses }: WeeklyCalendarProps) {

  const renderCourseCard = (course: Course) => {
    const colorClass = course.color || 'bg-green-100 border-green-300 text-green-800'
    return (
      <div 
        key={course.id}
        className={`p-2 rounded-lg border text-xs shadow-sm mb-2 ${colorClass}`}
      >
        <p className="font-bold">{course.language.name} {course.level}</p>
        <p className="opacity-80">{course.startTime} - {course.endTime}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 print-content">
      {/* Official Header for Print */}
      <div className="print-header">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TESHLEX ACADÉMICO</h1>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">Horario Oficial de Clases</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase">Ciclo Escolar 2026-1</p>
            <p className="text-xs font-bold text-gray-400">Generado el {new Date().toLocaleDateString('es-MX')}</p>
          </div>
        </div>
      </div>

      <h3 className="text-blue-600 font-bold text-lg mb-6 uppercase tracking-tight no-print">
        Horario de Clases
      </h3>

      <div className="grid grid-cols-6 gap-2 min-w-[600px]">
        {DAYS.map((day, idx) => {
          const dayNum = idx + 1 // 1: Monday, 6: Saturday
          const dayCourses = courses.filter(c => c.daysOfWeek.includes(dayNum))

          return (
            <div key={day} className="flex flex-col">
              <div className="text-center font-bold text-gray-400 text-[10px] uppercase mb-3 border-b border-gray-100 pb-1 tracking-tighter">
                {day}
              </div>
              <div className="min-h-[80px] flex flex-col gap-2">
                {dayCourses.length > 0 ? (
                  dayCourses.map(c => renderCourseCard(c))
                ) : (
                  <div className="h-full border border-dashed border-gray-50 rounded-lg no-print" />
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-8 border-t border-gray-50 pt-4">
        <p className="text-[10px] text-gray-400 font-medium italic">
          * Este documento es informativo y refleja las inscripciones activas al momento de su generación.
        </p>
      </div>
    </div>
  )
}
